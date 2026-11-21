-- 002 · Credenciales de acceso y tokens de verificación

CREATE TABLE credenciales_acceso (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            text        NOT NULL,
  password_hash   text,
  google_sub      text        UNIQUE,
  ultimo_acceso_en timestamptz,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT credenciales_tipo_valido CHECK (tipo IN ('password', 'google', 'otp')),
  -- Cada tipo exige sus datos y prohíbe los de los demás.
  CONSTRAINT credenciales_datos_por_tipo CHECK (
    (tipo = 'password' AND password_hash IS NOT NULL AND google_sub IS NULL) OR
    (tipo = 'google'   AND google_sub    IS NOT NULL AND password_hash IS NULL) OR
    (tipo = 'otp'      AND password_hash IS NULL     AND google_sub IS NULL)
  ),
  -- Una persona tiene como máximo una credencial de cada tipo.
  CONSTRAINT credenciales_unica_por_tipo UNIQUE (usuario_id, tipo)
);

CREATE INDEX credenciales_acceso_usuario_idx ON credenciales_acceso (usuario_id);

CREATE TRIGGER credenciales_acceso_actualizado_en
  BEFORE UPDATE ON credenciales_acceso
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

COMMENT ON COLUMN credenciales_acceso.password_hash IS 'Hash argon2id. Nunca se guarda la contraseña.';

CREATE TABLE tokens_verificacion (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  proposito   text        NOT NULL,
  token_hash  text        NOT NULL UNIQUE,
  expira_en   timestamptz NOT NULL,
  usado_en    timestamptz,
  intentos    integer     NOT NULL DEFAULT 0,
  creado_en   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tokens_proposito_valido CHECK (proposito IN ('verificar_correo', 'restablecer_password')),
  CONSTRAINT tokens_intentos_no_negativos CHECK (intentos >= 0),
  CONSTRAINT tokens_expiracion_posterior CHECK (expira_en > creado_en)
);

CREATE INDEX tokens_verificacion_usuario_idx ON tokens_verificacion (usuario_id, proposito);
-- Para limpiar tokens vencidos o usados.
CREATE INDEX tokens_verificacion_expira_idx ON tokens_verificacion (expira_en);

COMMENT ON TABLE tokens_verificacion IS 'Tokens de un solo uso. Se guarda solo el hash, nunca el token en claro.';
