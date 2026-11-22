import { sql } from 'drizzle-orm';
import {
  customType,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

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
