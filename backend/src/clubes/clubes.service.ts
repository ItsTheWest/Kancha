import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, or, sql } from 'drizzle-orm';
import { DB } from '../database/database.module';
import type { Database } from '../database/database.module';
import {
  categorias,
  clubes,
  miembroRoles,
  miembrosClub,
  rolesClub,
} from '../database/schema';
import type { ActualizarClubDto } from './dto/actualizar-club.dto';
import type { CrearClubDto } from './dto/crear-club.dto';

function slugificar(texto: string): string {
  const base = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return base || 'club';
}

@Injectable()
export class ClubesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async crearClub(usuarioId: string, dto: CrearClubDto) {
    // 1. Regla de plan gratuito: máximo 1 club propio por cuenta
    const [clubExistente] = await this.db
      .select({ id: clubes.id, nombre: clubes.nombre })
      .from(clubes)
      .where(and(eq(clubes.creadorId, usuarioId), eq(clubes.estado, 'activo')))
      .limit(1);

    if (clubExistente) {
      throw new ConflictException('limite_clubes_alcanzado');
    }

    // 2. Generar o limpiar slug
    let slug = dto.slug ? slugificar(dto.slug) : slugificar(dto.nombre);
    const [slugEnUso] = await this.db
      .select({ id: clubes.id })
      .from(clubes)
      .where(eq(clubes.slug, slug))
      .limit(1);

    if (slugEnUso) {
      const sufijo = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${sufijo}`;
    }

    // 3. Ejecutar función transaccional crear_club() en la base de datos
    const resultado = await this.db.execute<{ crear_club: string }>(
      sql`SELECT crear_club(
        ${usuarioId}::uuid,
        ${dto.nombre},
        ${slug},
        ${dto.deporte ?? 'futbol'},
        ${dto.ciudad ?? null},
        ${dto.logoUrl ?? null},
        ${dto.colorPrimario ?? '#3ecf8e'},
        ${dto.colorSecundario ?? '#1f7a52'},
        ${dto.colorAcento ?? '#6ef0b0'}
      ) as crear_club`,
    );

    const clubId = (resultado.rows[0] as { crear_club: string }).crear_club;

    const [club] = await this.db
      .select()
      .from(clubes)
      .where(eq(clubes.id, clubId))
      .limit(1);

    return club;
  }

  async misClubes(usuarioId: string) {
    const filas = await this.db
      .select({
        clubId: clubes.id,
        nombre: clubes.nombre,
        slug: clubes.slug,
        deporte: clubes.deporte,
        ciudad: clubes.ciudad,
        logoUrl: clubes.logoUrl,
        colorPrimario: clubes.colorPrimario,
        colorSecundario: clubes.colorSecundario,
        colorAcento: clubes.colorAcento,
        creadorId: clubes.creadorId,
        esPropietario: sql<boolean>`${clubes.creadorId} = ${usuarioId}`,
        estadoMiembro: miembrosClub.estado,
        miembroId: miembrosClub.id,
        categoriaNombre: categorias.nombre,
        rolNombre: rolesClub.nombre,
      })
      .from(miembrosClub)
      .innerJoin(clubes, eq(clubes.id, miembrosClub.clubId))
      .leftJoin(categorias, eq(categorias.id, miembrosClub.categoriaId))
      .leftJoin(miembroRoles, eq(miembroRoles.miembroId, miembrosClub.id))
      .leftJoin(rolesClub, eq(rolesClub.id, miembroRoles.rolId))
      .where(and(eq(miembrosClub.usuarioId, usuarioId), eq(clubes.estado, 'activo')));

    // Agrupar por club porque un miembro puede tener varios roles
    const mapa = new Map<string, any>();
    for (const f of filas) {
      if (!mapa.has(f.clubId)) {
        mapa.set(f.clubId, {
          id: f.clubId,
          nombre: f.nombre,
          slug: f.slug,
          deporte: f.deporte,
          ciudad: f.ciudad,
          logoUrl: f.logoUrl,
          colorPrimario: f.colorPrimario,
          colorSecundario: f.colorSecundario,
          colorAcento: f.colorAcento,
          esPropietario: f.esPropietario,
          estadoMiembro: f.estadoMiembro,
          miembroId: f.miembroId,
          categoria: f.categoriaNombre ?? 'General',
          roles: [],
        });
      }
      if (f.rolNombre) {
        mapa.get(f.clubId).roles.push(f.rolNombre);
      }
    }

    return Array.from(mapa.values());
  }

  async obtenerPorIdOSlug(idOSlug: string, usuarioId?: string) {
    const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOSlug);

    const [club] = await this.db
      .select()
      .from(clubes)
      .where(and(esUuid ? eq(clubes.id, idOSlug) : eq(clubes.slug, idOSlug), eq(clubes.estado, 'activo')))
      .limit(1);

    if (!club) {
      throw new NotFoundException('club_no_encontrado');
    }

    // Verificar si el usuario consultante es miembro o admin
    let membresia: any = null;
    if (usuarioId) {
      const [m] = await this.db
        .select({
          miembroId: miembrosClub.id,
          estado: miembrosClub.estado,
          categoriaNombre: categorias.nombre,
          rolNombre: rolesClub.nombre,
        })
        .from(miembrosClub)
        .leftJoin(categorias, eq(categorias.id, miembrosClub.categoriaId))
        .leftJoin(miembroRoles, eq(miembroRoles.miembroId, miembrosClub.id))
        .leftJoin(rolesClub, eq(rolesClub.id, miembroRoles.rolId))
        .where(and(eq(miembrosClub.clubId, club.id), eq(miembrosClub.usuarioId, usuarioId)))
        .limit(1);

      if (m) {
        membresia = {
          id: m.miembroId,
          estado: m.estado,
          categoria: m.categoriaNombre ?? 'General',
          rol: m.rolNombre ?? 'Miembro',
          esAdmin: club.creadorId === usuarioId || m.rolNombre === 'Administrador',
        };
      }
    }

    const cats = await this.db
      .select({ id: categorias.id, nombre: categorias.nombre })
      .from(categorias)
      .where(eq(categorias.clubId, club.id));

    return {
      ...club,
      membresia,
      categorias: cats,
    };
  }

  async actualizarClub(clubId: string, usuarioId: string, dto: ActualizarClubDto) {
    const [club] = await this.db
      .select()
      .from(clubes)
      .where(and(eq(clubes.id, clubId), eq(clubes.estado, 'activo')))
      .limit(1);

    if (!club) {
      throw new NotFoundException('club_no_encontrado');
    }

    // Verificar si es el creador o tiene rol de Administrador
    const esCreador = club.creadorId === usuarioId;
    if (!esCreador) {
      const [esAdmin] = await this.db
        .select({ id: miembrosClub.id })
        .from(miembrosClub)
        .innerJoin(miembroRoles, eq(miembroRoles.miembroId, miembrosClub.id))
        .innerJoin(rolesClub, eq(rolesClub.id, miembroRoles.rolId))
        .where(
          and(
            eq(miembrosClub.clubId, clubId),
            eq(miembrosClub.usuarioId, usuarioId),
            eq(rolesClub.nombre, 'Administrador'),
          ),
        )
        .limit(1);

      if (!esAdmin) {
        throw new ForbiddenException('no_autorizado_administrar_club');
      }
    }

    const camposActualizar: Partial<typeof clubes.$inferInsert> = {
      actualizadoEn: new Date(),
    };

    if (dto.nombre !== undefined) camposActualizar.nombre = dto.nombre.trim();
    if (dto.deporte !== undefined) camposActualizar.deporte = dto.deporte.trim().toLowerCase();
    if (dto.ciudad !== undefined) camposActualizar.ciudad = dto.ciudad?.trim() || null;
    if (dto.logoUrl !== undefined) camposActualizar.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.colorPrimario !== undefined) camposActualizar.colorPrimario = dto.colorPrimario.trim();
    if (dto.colorSecundario !== undefined) camposActualizar.colorSecundario = dto.colorSecundario.trim();
    if (dto.colorAcento !== undefined) camposActualizar.colorAcento = dto.colorAcento.trim();

    const [actualizado] = await this.db
      .update(clubes)
      .set(camposActualizar)
      .where(eq(clubes.id, clubId))
      .returning();

    return actualizado;
  }
}
