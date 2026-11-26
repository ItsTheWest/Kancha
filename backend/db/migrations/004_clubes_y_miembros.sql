-- 004 · Clubes, Categorías, Roles y Miembros
-- Estructura base de la Fase 1: clubes multideportivos, categorización, roles y miembros.

-- ============================================================================
-- 1. TABLA: clubes
-- ============================================================================
CREATE TABLE clubes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text        NOT NULL UNIQUE,
  nombre            text        NOT NULL,
  deporte           text        NOT NULL DEFAULT 'futbol',
  ciudad            text,
  logo_url          text,
  color_primario    text        NOT NULL DEFAULT '#3ecf8e',
  color_secundario  text        NOT NULL DEFAULT '#1f7a52',
  color_acento      text        NOT NULL DEFAULT '#6ef0b0',
  creador_id        uuid        NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  estado            text        NOT NULL DEFAULT 'activo',
  creado_en         timestamptz NOT NULL DEFAULT now(),
  actualizado_en    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clubes_nombre_no_vacio CHECK (btrim(nombre) <> ''),
  CONSTRAINT clubes_slug_formato CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT clubes_color_primario_hex CHECK (color_primario ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
  CONSTRAINT clubes_color_secundario_hex CHECK (color_secundario ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
  CONSTRAINT clubes_color_acento_hex CHECK (color_acento ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
  CONSTRAINT clubes_estado_valido CHECK (estado IN ('activo', 'suspendido', 'archivado'))
);

CREATE TRIGGER clubes_actualizado_en
  BEFORE UPDATE ON clubes
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE INDEX clubes_creador_idx ON clubes(creador_id);
CREATE INDEX clubes_deporte_idx ON clubes(deporte);

-- ============================================================================
-- 2. TABLA: roles_club (Predefinidos y asignables por club)
-- ============================================================================
CREATE TABLE roles_club (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           uuid        NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  nombre            text        NOT NULL,
  descripcion       text,
  es_sistema        boolean     NOT NULL DEFAULT false,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  actualizado_en    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT roles_club_nombre_no_vacio CHECK (btrim(nombre) <> ''),
  CONSTRAINT roles_club_unico_por_club UNIQUE (club_id, nombre)
);

CREATE TRIGGER roles_club_actualizado_en
  BEFORE UPDATE ON roles_club
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE INDEX roles_club_club_idx ON roles_club(club_id);

-- ============================================================================
-- 3. TABLA: categorias (Subgrupos deportivos por club)
-- ============================================================================
CREATE TABLE categorias (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           uuid        NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  nombre            text        NOT NULL,
  descripcion       text,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  actualizado_en    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT categorias_nombre_no_vacio CHECK (btrim(nombre) <> ''),
  CONSTRAINT categorias_unica_por_club UNIQUE (club_id, nombre)
);

CREATE TRIGGER categorias_actualizado_en
  BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE INDEX categorias_club_idx ON categorias(club_id);

-- ============================================================================
-- 4. TABLA: miembros_club (Vinculación del usuario con el club)
-- ============================================================================
CREATE TABLE miembros_club (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           uuid        NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  usuario_id        uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria_id      uuid        REFERENCES categorias(id) ON DELETE SET NULL,
  numero_camiseta   integer,
  posicion          text,
  estado            text        NOT NULL DEFAULT 'activo',
  creado_en         timestamptz NOT NULL DEFAULT now(),
  actualizado_en    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT miembros_club_unico_usuario UNIQUE (club_id, usuario_id),
  CONSTRAINT miembros_club_estado_valido CHECK (estado IN ('activo', 'invitado', 'inactivo', 'suspendido')),
  CONSTRAINT miembros_club_numero_positivo CHECK (numero_camiseta IS NULL OR (numero_camiseta >= 0 AND numero_camiseta <= 999))
);

CREATE TRIGGER miembros_club_actualizado_en
  BEFORE UPDATE ON miembros_club
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE INDEX miembros_club_usuario_idx ON miembros_club(usuario_id);
CREATE INDEX miembros_club_club_idx ON miembros_club(club_id);
CREATE INDEX miembros_club_categoria_idx ON miembros_club(categoria_id);

-- ============================================================================
-- 5. TABLA: miembro_roles (Roles asignados al miembro)
-- ============================================================================
CREATE TABLE miembro_roles (
  miembro_id        uuid        NOT NULL REFERENCES miembros_club(id) ON DELETE CASCADE,
  rol_id            uuid        NOT NULL REFERENCES roles_club(id) ON DELETE CASCADE,
  asignado_en       timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (miembro_id, rol_id)
);

CREATE INDEX miembro_roles_rol_idx ON miembro_roles(rol_id);

-- ============================================================================
-- 6. FUNCIÓN TRANSACCIONAL: crear_club
-- Realiza el alta guiada completa en una sola llamada:
-- Crea el club, genera los 4 roles del sistema, la categoría General
-- e incorpora al usuario creador como Miembro Administrador.
-- ============================================================================
CREATE OR REPLACE FUNCTION crear_club(
  p_usuario_id      uuid,
  p_nombre          text,
  p_slug            text,
  p_deporte         text,
  p_ciudad          text,
  p_logo_url        text,
  p_color_primario  text,
  p_color_secundario text,
  p_color_acento    text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_club_id         uuid;
  v_rol_admin_id    uuid;
  v_categoria_id    uuid;
  v_miembro_id      uuid;
  v_color_prim      text := COALESCE(NULLIF(btrim(p_color_primario), ''), '#3ecf8e');
  v_color_sec       text := COALESCE(NULLIF(btrim(p_color_secundario), ''), '#1f7a52');
  v_color_ace       text := COALESCE(NULLIF(btrim(p_color_acento), ''), '#6ef0b0');
  v_deporte         text := COALESCE(NULLIF(btrim(p_deporte), ''), 'futbol');
BEGIN
  -- 1. Insertar el club
  INSERT INTO clubes (
    nombre,
    slug,
    deporte,
    ciudad,
    logo_url,
    color_primario,
    color_secundario,
    color_acento,
    creador_id
  ) VALUES (
    btrim(p_nombre),
    lower(btrim(p_slug)),
    lower(v_deporte),
    NULLIF(btrim(p_ciudad), ''),
    NULLIF(btrim(p_logo_url), ''),
    v_color_prim,
    v_color_sec,
    v_color_ace,
    p_usuario_id
  )
  RETURNING id INTO v_club_id;

  -- 2. Crear roles estándar del sistema para este club
  INSERT INTO roles_club (club_id, nombre, descripcion, es_sistema)
  VALUES (v_club_id, 'Administrador', 'Control total de la gestión del club', true)
  RETURNING id INTO v_rol_admin_id;

  INSERT INTO roles_club (club_id, nombre, descripcion, es_sistema)
  VALUES
    (v_club_id, 'Entrenador', 'Planificación táctica, eventos y convocatorias', true),
    (v_club_id, 'Tesorero', 'Gestión de pagos, cuotas y cobros', true),
    (v_club_id, 'Jugador', 'Atleta miembro del club', true);

  -- 3. Crear categoría por defecto "General"
  INSERT INTO categorias (club_id, nombre, descripcion)
  VALUES (v_club_id, 'General', 'Categoría principal del club')
  RETURNING id INTO v_categoria_id;

  -- 4. Registrar al creador como primer miembro activo del club
  INSERT INTO miembros_club (club_id, usuario_id, categoria_id, estado)
  VALUES (v_club_id, p_usuario_id, v_categoria_id, 'activo')
  RETURNING id INTO v_miembro_id;

  -- 5. Asignar el rol de Administrador al miembro creador
  INSERT INTO miembro_roles (miembro_id, rol_id)
  VALUES (v_miembro_id, v_rol_admin_id);

  RETURN v_club_id;
END;
$$;
