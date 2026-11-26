'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ClubItem } from '../../lib/api';
import { cambiarClubActivo } from '../acciones/clubes';

interface SelectorClubProps {
  clubes: ClubItem[];
  clubActivoId?: string;
}

export function SelectorClub({ clubes, clubActivoId }: SelectorClubProps) {
  const router = useRouter();
  const [desplegado, setDesplegado] = useState(false);
  const [modalProAbierto, setModalProAbierto] = useState(false);

  const clubActual = clubes.find((c) => c.id === clubActivoId) || clubes[0] || null;
  const tieneClubPropio = clubes.some((c) => c.esPropietario);

  const alSeleccionarClub = async (id: string) => {
    setDesplegado(false);
    await cambiarClubActivo(id);
    router.refresh();
  };

  const alIntentarCrear = () => {
    setDesplegado(false);
    if (tieneClubPropio) {
      setModalProAbierto(true);
    } else {
      router.push('/clubes/nuevo');
    }
  };

  if (clubes.length === 0) {
    return (
      <Link
        href="/clubes/nuevo"
        className="boton boton-chico"
        style={{
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
        }}
      >
        <span>+</span> Crear mi club
      </Link>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Botón Selector */}
      <button
        type="button"
        onClick={() => setDesplegado((prev) => !prev)}
        style={{
          background: 'var(--superficie)',
          border: '1px solid var(--borde)',
          borderRadius: '0.5rem',
          padding: '0.35rem 0.65rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--texto)',
          cursor: 'pointer',
          font: 'inherit',
          fontSize: '0.85rem',
        }}
        title="Cambiar de club"
        aria-expanded={desplegado}
      >
        {clubActual?.logoUrl ? (
          <img
            src={clubActual.logoUrl}
            alt=""
            style={{ width: '20px', height: '20px', borderRadius: '0.25rem', objectFit: 'contain' }}
          />
        ) : (
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '0.25rem',
              backgroundColor: clubActual?.colorPrimario ?? 'var(--ok)',
              color: '#04130c',
              fontSize: '0.65rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {clubActual?.nombre.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span style={{ fontWeight: 600, maxWidth: '9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {clubActual?.nombre}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--texto-suave)' }}>▼</span>
      </button>

      {/* Menú Desplegable */}
      {desplegado && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.35rem)',
            left: 0,
            minWidth: '14rem',
            background: 'var(--superficie)',
            border: '1px solid var(--borde)',
            borderRadius: '0.6rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            zIndex: 110,
            padding: '0.35rem',
          }}
        >
          <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.72rem', color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mis Clubes
          </div>

          {clubes.map((c) => {
            const esActivo = c.id === clubActual?.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => alSeleccionarClub(c.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.6rem',
                  borderRadius: '0.35rem',
                  background: esActivo ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                  border: 'none',
                  color: esActivo ? 'var(--ok)' : 'var(--texto)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: c.colorPrimario,
                    }}
                  />
                  <span style={{ fontWeight: esActivo ? 600 : 400 }}>{c.nombre}</span>
                </div>
                {esActivo && <span style={{ fontSize: '0.8rem', color: 'var(--ok)' }}>✓</span>}
              </button>
            );
          })}

          <div style={{ height: '1px', background: 'var(--borde)', margin: '0.35rem 0' }} />

          <button
            type="button"
            onClick={alIntentarCrear}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.6rem',
              borderRadius: '0.35rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--ok)',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.82rem',
            }}
          >
            <span>+</span> Crear nuevo club
          </button>
        </div>
      )}

      {/* Modal Informativo de Plan Gratuito / PRO */}
      {modalProAbierto && (
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
            zIndex: 250,
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="tarjeta"
            style={{
              width: '100%',
              maxWidth: '26rem',
              background: 'var(--superficie)',
              border: '1px solid var(--borde)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
            }}
          >
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: 'var(--texto)', textTransform: 'none' }}>
              Límite de Clubes del Plan
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--texto-suave)', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              Tu cuenta ya posee el club <strong>{clubActual?.nombre}</strong>. En el plan gratuito se incluye la administración de <strong>1 club propio</strong>.
            </p>
            <div
              style={{
                background: 'rgba(62, 207, 142, 0.08)',
                border: '1px solid var(--ok)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                fontSize: '0.8rem',
                color: 'var(--ok)',
                marginBottom: '1.25rem',
              }}
            >
              La gestión multiclub desde una misma cuenta estará disponible con los planes PRO. Para crear otro club sin costo puedes iniciar sesión con una cuenta adicional.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setModalProAbierto(false)}
                className="boton boton-secundario"
                style={{ width: 'auto', padding: '0.5rem 1rem' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
