'use client';

interface ModalPaletaClubProps {
  abierto: boolean;
  alCerrar: () => void;
  nombreClub: string;
  logoDataUrl?: string;
  colores: [string, string, string];
  alCambiarColor: (indice: 0 | 1 | 2, nuevoHex: string) => void;
  tieneFondoDetectado?: boolean;
  removerFondoActivo?: boolean;
  alAlternarRemoverFondo?: (activo: boolean) => void;
  alConfirmar: () => void;
}

export function ModalPaletaClub({
  abierto,
  alCerrar,
  nombreClub,
  logoDataUrl,
  colores,
  alCambiarColor,
  tieneFondoDetectado,
  removerFondoActivo,
  alAlternarRemoverFondo,
  alConfirmar,
}: ModalPaletaClubProps) {
  if (!abierto) return null;

  const [colorPrimario, colorSecundario, colorAcento] = colores;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 200,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-paleta"
    >
      <div
        className="tarjeta"
        style={{
          width: '100%',
          maxWidth: '32rem',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--superficie)',
          border: '1px solid var(--borde)',
          borderRadius: '1rem',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 id="titulo-modal-paleta" style={{ margin: 0, fontSize: '1.1rem', textTransform: 'none', color: 'var(--texto)' }}>
            Identidad Visual del Club
          </h2>
          <button
            type="button"
            onClick={alCerrar}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--texto-suave)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Opción de remoción de fondo si se detectó */}
        {tieneFondoDetectado && alAlternarRemoverFondo && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--borde)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
            }}
          >
            <span>Detectamos fondo uniforme en tu logo</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={removerFondoActivo}
                onChange={(e) => alAlternarRemoverFondo(e.target.checked)}
                style={{ width: 'auto', margin: 0 }}
              />
              <span style={{ color: removerFondoActivo ? 'var(--ok)' : 'var(--texto-suave)' }}>
                {removerFondoActivo ? 'Fondo removido' : 'Remover fondo'}
              </span>
            </label>
          </div>
        )}

        {/* Vista previa en vivo de la interfaz con los 3 colores */}
        <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', marginBottom: '0.5rem' }}>
          Vista previa en tiempo real en la plataforma:
        </p>
        <div
          style={{
            background: '#0b0f14',
            border: `2px solid ${colorAcento}`,
            borderRadius: '0.75rem',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          {/* Cabecera simulada con logo y nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Logo Club"
                style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '0.5rem' }}
              />
            ) : (
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '0.5rem',
                  backgroundColor: colorSecundario,
                  color: colorAcento,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                {nombreClub.slice(0, 2).toUpperCase() || 'KC'}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#e8edf3' }}>
                {nombreClub || 'Nombre de tu Club'}
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '0.25rem',
                  backgroundColor: colorSecundario,
                  color: '#ffffff',
                  fontWeight: 500,
                  display: 'inline-block',
                  marginTop: '0.2rem',
                }}
              >
                Club Oficial
              </span>
            </div>
          </div>

          {/* Botón y acentos simulados */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.5rem',
                backgroundColor: colorPrimario,
                color: '#04130c',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'default',
              }}
            >
              Botón Principal
            </button>
            <div
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: `1px solid ${colorAcento}`,
                color: colorAcento,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Acento
            </div>
          </div>
        </div>

        {/* Ajuste manual de los 3 colores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--texto-suave)', display: 'block', marginBottom: '0.25rem' }}>
              Primario
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="color"
                value={colorPrimario}
                onChange={(e) => alCambiarColor(0, e.target.value)}
                style={{ width: '2.2rem', height: '2.2rem', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '0.35rem' }}
                title="Elegir color primario"
              />
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{colorPrimario}</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--texto-suave)', display: 'block', marginBottom: '0.25rem' }}>
              Secundario
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="color"
                value={colorSecundario}
                onChange={(e) => alCambiarColor(1, e.target.value)}
                style={{ width: '2.2rem', height: '2.2rem', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '0.35rem' }}
                title="Elegir color secundario"
              />
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{colorSecundario}</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--texto-suave)', display: 'block', marginBottom: '0.25rem' }}>
              Acento
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="color"
                value={colorAcento}
                onChange={(e) => alCambiarColor(2, e.target.value)}
                style={{ width: '2.2rem', height: '2.2rem', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '0.35rem' }}
                title="Elegir color de acento"
              />
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{colorAcento}</span>
            </div>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={alCerrar} className="boton boton-secundario">
            Cerrar
          </button>
          <button type="button" onClick={alConfirmar} className="boton" style={{ backgroundColor: colorPrimario }}>
            Aplicar Colores
          </button>
        </div>
      </div>
    </div>
  );
}
