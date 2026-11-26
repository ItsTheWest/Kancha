import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// Este archivo refleja las migraciones SQL (el SQL manda). Se usa solo para consultas tipadas.

const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  codigoPublico: text('codigo_publico').notNull().unique().default(sql`generar_codigo_publico()`),
  correo: citext('correo').notNull().unique(),
  telefono: text('telefono'),
  cedula: text('cedula').unique(),
  rol: text('rol', { enum: ['jugador', 'propietario'] }),
  nombres: text('nombres').notNull(),
  apellidos: text('apellidos').notNull(),
  correoVerificadoEn: timestamp('correo_verificado_en', { withTimezone: true }),
  estado: text('estado', { enum: ['activo', 'suspendido'] }).notNull().default('activo'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const credencialesAcceso = pgTable(
  'credenciales_acceso',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tipo: text('tipo', { enum: ['password', 'google', 'otp'] }).notNull(),
    passwordHash: text('password_hash'),
    googleSub: text('google_sub').unique(),
    ultimoAccesoEn: timestamp('ultimo_acceso_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('credenciales_unica_por_tipo').on(t.usuarioId, t.tipo)],
);

export const tokensVerificacion = pgTable('tokens_verificacion', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  proposito: text('proposito', { enum: ['verificar_correo', 'restablecer_password'] }).notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
  usadoEn: timestamp('usado_en', { withTimezone: true }),
  intentos: integer('intentos').notNull().default(0),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
});

// Una fila por refresh token: un inicio de sesión abre una familia y cada refresco
// añade una generación. Los índices (incluido el parcial de "vigente por familia")
// los declara el SQL de la migración 003.
export const sesiones = pgTable('sesiones', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  familiaId: uuid('familia_id').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull().unique(),
  generacion: integer('generacion').notNull().default(1),
  // La autorreferencia necesita el tipo explícito para cortar el ciclo de inferencia.
  reemplazadaPorId: uuid('reemplazada_por_id').references((): AnyPgColumn => sesiones.id, {
    onDelete: 'set null',
  }),
  rotadaEn: timestamp('rotada_en', { withTimezone: true }),
  revocadaEn: timestamp('revocada_en', { withTimezone: true }),
  motivoRevocacion: text('motivo_revocacion', {
    enum: [
      'cierre_sesion',
      'cierre_todas',
      'reuso_detectado',
      'password_cambiada',
      'cuenta_suspendida',
    ],
  }),
  expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
  familiaExpiraEn: timestamp('familia_expira_en', { withTimezone: true }).notNull(),
  ultimoUsoEn: timestamp('ultimo_uso_en', { withTimezone: true }),
  ip: text('ip'),
  agenteUsuario: text('agente_usuario'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Fase 1: Clubes, Roles, Categorías y Miembros
// ============================================================================

export const clubes = pgTable('clubes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  nombre: text('nombre').notNull(),
  deporte: text('deporte').notNull().default('futbol'),
  ciudad: text('ciudad'),
  logoUrl: text('logo_url'),
  colorPrimario: text('color_primario').notNull().default('#3ecf8e'),
  colorSecundario: text('color_secundario').notNull().default('#1f7a52'),
  colorAcento: text('color_acento').notNull().default('#6ef0b0'),
  creadorId: uuid('creador_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'restrict' }),
  estado: text('estado', { enum: ['activo', 'suspendido', 'archivado'] }).notNull().default('activo'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const rolesClub = pgTable(
  'roles_club',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubes.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    esSistema: boolean('es_sistema').notNull().default(false),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('roles_club_unico_por_club').on(t.clubId, t.nombre)],
);

export const categorias = pgTable(
  'categorias',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubes.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('categorias_unica_por_club').on(t.clubId, t.nombre)],
);

export const miembrosClub = pgTable(
  'miembros_club',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubes.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    categoriaId: uuid('categoria_id').references(() => categorias.id, { onDelete: 'set null' }),
    numeroCamiseta: integer('numero_camiseta'),
    posicion: text('posicion'),
    estado: text('estado', { enum: ['activo', 'invitado', 'inactivo', 'suspendido'] }).notNull().default('activo'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('miembros_club_unico_usuario').on(t.clubId, t.usuarioId)],
);

export const miembroRoles = pgTable(
  'miembro_roles',
  {
    miembroId: uuid('miembro_id')
      .notNull()
      .references(() => miembrosClub.id, { onDelete: 'cascade' }),
    rolId: uuid('rol_id')
      .notNull()
      .references(() => rolesClub.id, { onDelete: 'cascade' }),
    asignadoEn: timestamp('asignado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.miembroId, t.rolId] })],
);
