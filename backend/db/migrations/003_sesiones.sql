-- 003 · Sesiones (refresh tokens con rotación y detección de reuso)
-- Una fila por refresh token. Un inicio de sesión genera una familia_id y cada
-- refresco añade una generación a esa familia.

CREATE TABLE sesiones (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  familia_id          uuid        NOT NULL,
  refresh_token_hash  text        NOT NULL UNIQUE,
  generacion          integer     NOT NULL DEFAULT 1,
  -- Diferible: al rotar se marca la fila vieja apuntando a la nueva antes de insertarla
  -- (el índice parcial de abajo obliga a ese orden), y la FK se comprueba al COMMIT.
  reemplazada_por_id  uuid        REFERENCES sesiones(id) ON DELETE SET NULL
                                  DEFERRABLE INITIALLY DEFERRED,
  rotada_en           timestamptz,
  revocada_en         timestamptz,
  motivo_revocacion   text,
  expira_en           timestamptz NOT NULL,
  familia_expira_en   timestamptz NOT NULL,
  ultimo_uso_en       timestamptz,
  ip                  text,
  agente_usuario      text,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sesiones_generacion_positiva CHECK (generacion >= 1),
  CONSTRAINT sesiones_expiracion_posterior CHECK (expira_en > creado_en),
  -- La rotación nunca extiende el tope absoluto de la familia.
  CONSTRAINT sesiones_tope_absoluto CHECK (familia_expira_en >= expira_en),
  CONSTRAINT sesiones_motivo_valido CHECK (
    motivo_revocacion IS NULL OR motivo_revocacion IN (
      'cierre_sesion', 'cierre_todas', 'reuso_detectado',
      'password_cambiada', 'cuenta_suspendida'
    )
  ),
  CONSTRAINT sesiones_revocacion_coherente
    CHECK ((revocada_en IS NULL) = (motivo_revocacion IS NULL)),
  CONSTRAINT sesiones_rotacion_coherente
    CHECK ((rotada_en IS NULL) = (reemplazada_por_id IS NULL)),
  CONSTRAINT sesiones_sin_autorreferencia
    CHECK (reemplazada_por_id IS NULL OR reemplazada_por_id <> id),
  -- El agente de usuario llega de un header: se acota para que no sea un vertedero.
  CONSTRAINT sesiones_agente_acotado
    CHECK (agente_usuario IS NULL OR length(agente_usuario) <= 400)
);

CREATE INDEX sesiones_usuario_idx ON sesiones (usuario_id);
CREATE INDEX sesiones_familia_idx ON sesiones (familia_id);
-- Para la limpieza periódica de sesiones vencidas.
CREATE INDEX sesiones_expira_idx ON sesiones (expira_en);

-- Invariante central de la rotación: una familia tiene como máximo un token vigente.
-- Si dos refrescos concurrentes rotan el mismo token, el segundo choca aquí con
-- unique_violation en vez de crear una rama paralela de la familia.
CREATE UNIQUE INDEX sesiones_vigente_por_familia_idx
  ON sesiones (familia_id)
  WHERE rotada_en IS NULL AND revocada_en IS NULL;

CREATE TRIGGER sesiones_actualizado_en
  BEFORE UPDATE ON sesiones
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

COMMENT ON TABLE sesiones IS 'Un refresh token por fila. Un inicio de sesión = una familia_id; cada refresco añade una generación.';
COMMENT ON COLUMN sesiones.familia_id IS 'Agrupa la cadena de rotaciones. Se revoca completa si se presenta un token ya rotado (reuso).';
COMMENT ON COLUMN sesiones.refresh_token_hash IS 'sha256 hex del token opaco. El token en claro nunca se guarda.';
COMMENT ON COLUMN sesiones.reemplazada_por_id IS 'Sesión que sustituyó a esta al rotar. Permite auditar la cadena completa.';
COMMENT ON COLUMN sesiones.familia_expira_en IS 'Tope absoluto: obliga a iniciar sesión de nuevo aunque se refresque sin parar.';
COMMENT ON COLUMN sesiones.ip IS 'Texto y no inet: llega de X-Forwarded-For y puede venir mal formada.';
