-- 001 · Usuarios (identidad global)
-- Los usuarios son globales; las fichas por club (miembros_club) llegan en la Fase 1.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Mantiene actualizado_en en cada UPDATE.
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;

-- Código público corto y legible (se usa en el QR del carnet).
-- Sin 0, O, 1, I para evitar confusiones al leerlo.
CREATE OR REPLACE FUNCTION generar_codigo_publico()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  codigo text := '';
  bytes bytea := gen_random_bytes(10);
BEGIN
  FOR i IN 0..9 LOOP
    codigo := codigo || substr(alfabeto, (get_byte(bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN codigo;
END;
$$;

CREATE TABLE usuarios (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_publico        text        NOT NULL UNIQUE DEFAULT generar_codigo_publico(),
  correo                citext      NOT NULL UNIQUE,
  telefono              text,
  cedula                text        UNIQUE,
  rol                   text,
  nombres               text        NOT NULL,
  apellidos             text        NOT NULL,
  correo_verificado_en  timestamptz,
  estado                text        NOT NULL DEFAULT 'activo',
  creado_en             timestamptz NOT NULL DEFAULT now(),
  actualizado_en        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT usuarios_estado_valido CHECK (estado IN ('activo', 'suspendido')),
  CONSTRAINT usuarios_rol_valido CHECK (rol IS NULL OR rol IN ('jugador', 'propietario')),
  CONSTRAINT usuarios_correo_formato CHECK (correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT usuarios_cedula_formato CHECK (cedula IS NULL OR cedula ~ '^[VEJGC][0-9]{6,10}$'),
  CONSTRAINT usuarios_telefono_formato CHECK (telefono IS NULL OR telefono ~ '^\+?[0-9]{10,15}$'),
  CONSTRAINT usuarios_nombres_no_vacio CHECK (btrim(nombres) <> '' AND btrim(apellidos) <> '')
);

CREATE TRIGGER usuarios_actualizado_en
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

COMMENT ON TABLE usuarios IS 'Identidad global de la persona. Las fichas por club se vinculan en miembros_club (Fase 1).';
COMMENT ON COLUMN usuarios.codigo_publico IS 'Código corto no secuencial para el QR del carnet.';
COMMENT ON COLUMN usuarios.cedula IS 'Documento de identidad nacional o RIF (ej. V12345678, J123456789).';
COMMENT ON COLUMN usuarios.rol IS 'Rol global en el sistema: jugador o propietario.';
COMMENT ON COLUMN usuarios.telefono IS 'Formato nacional o internacional, ej. 04121234567 o +584121234567.';
