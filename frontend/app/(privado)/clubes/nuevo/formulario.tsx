'use client';

import { useActionState, useState } from 'react';
import { crearClubAction } from '../../../acciones/clubes';
import { ModalPaletaClub } from '../../../componentes/modal-paleta-club';
import { analizarYProcesarLogo } from '../../../lib/extractor-logo';

export function FormularioCrearClub() {
  const [estado, accion, pendiente] = useActionState(crearClubAction, undefined);

  const [nombre, setNombre] = useState('');
  const [deporte, setDeporte] = useState('futbol');
  const [ciudad, setCiudad] = useState('');

  // Estados de logo y paleta
  const [archivoOriginal, setArchivoOriginal] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [removerFondo, setRemoverFondo] = useState(false);
  const [tieneFondo, setTieneFondo] = useState(false);
  const [colores, setColores] = useState<[string, string, string]>(['#3ecf8e', '#1f7a52', '#6ef0b0']);
  const [modalAbierto, setModalAbierto] = useState(false);

  const alSeleccionarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoOriginal(file);
    try {
      const res = await analizarYProcesarLogo(file, removerFondo);
      setLogoPreview(res.dataUrl);
      setTieneFondo(res.tieneFondoDetectado);
      setColores(res.paletaSugerida);
      // Abrir modal de vista previa para que el usuario admire y confirme su paleta
      setModalAbierto(true);
    } catch (err) {
      console.error('Error procesando logo:', err);
    }
  };

  const alAlternarFondo = async (activo: boolean) => {
    setRemoverFondo(activo);
    if (archivoOriginal) {
      const res = await analizarYProcesarLogo(archivoOriginal, activo);
      setLogoPreview(res.dataUrl);
      setColores(res.paletaSugerida);
    }
  };

  const alCambiarColor = (indice: 0 | 1 | 2, nuevoHex: string) => {
    setColores((prev) => {
      const copia = [...prev] as [string, string, string];
      copia[indice] = nuevoHex;
      return copia;
    });
  };

  return (
    <form action={accion} className="formulario" noValidate>
      {/* Campos ocultos de colores y logo */}
      <input type="hidden" name="colorPrimario" value={colores[0]} />
      <input type="hidden" name="colorSecundario" value={colores[1]} />
      <input type="hidden" name="colorAcento" value={colores[2]} />
      <input type="hidden" name="logoUrl" value={logoPreview} />

      <label>
        Nombre del club
        <input
          type="text"
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Deportivo Miranda FC"
          required
          maxLength={100}
          className={estado?.errores?.nombre ? 'con-error' : undefined}
        />
        {estado?.errores?.nombre && (
          <span className="error-campo" role="alert">{estado.errores.nombre}</span>
        )}
      </label>

      <div className="par">
        <label>
          Deporte principal
          <select
            name="deporte"
            value={deporte}
            onChange={(e) => setDeporte(e.target.value)}
            required
          >
            <option value="futbol">Fútbol</option>
            <option value="baloncesto">Baloncesto</option>
            <option value="beisbol">Béisbol</option>
            <option value="voleibol">Voleibol</option>
            <option value="tenis">Tenis</option>
            <option value="padel">Pádel</option>
            <option value="otro">Otro deporte</option>
          </select>
        </label>

        <label>
          Ciudad / Sede
          <input
            type="text"
            name="ciudad"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Ej: Caracas"
            maxLength={100}
          />
        </label>
      </div>

      {/* Subida de Logo Inteligente */}
      <div style={{ margin: '0.5rem 0' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', display: 'block', marginBottom: '0.35rem' }}>
          Escudo o Logo del Club
        </span>
        <div
          style={{
            border: '2px dashed var(--borde)',
            borderRadius: '0.75rem',
            padding: '1rem',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          {logoPreview ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src={logoPreview}
                alt="Logo previo"
                style={{
                  maxHeight: '80px',
                  maxWidth: '80px',
                  objectFit: 'contain',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setModalAbierto(true)}
                  className="boton boton-secundario boton-chico"
                >
                  Personalizar colores y vista previa
                </button>
                <label className="boton boton-secundario boton-chico" style={{ cursor: 'pointer' }}>
                  Cambiar imagen
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    onChange={alSeleccionarArchivo}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🛡️</div>
              <span style={{ fontSize: '0.85rem', color: 'var(--ok)', fontWeight: 500 }}>
                Sube tu logo para extraer su paleta de colores
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--texto-suave)', margin: '0.25rem 0 0' }}>
                PNG, JPG, SVG o WebP. Se detectará y sugerirá la paleta de 3 colores automáticamente.
              </p>
              <input
                type="file"
                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                onChange={alSeleccionarArchivo}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Muestra rápida de los 3 colores seleccionados */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--superficie)', border: '1px solid var(--borde)' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--texto-suave)' }}>Colores del Club:</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: colores[0] }} title={`Primario: ${colores[0]}`} />
          <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: colores[1] }} title={`Secundario: ${colores[1]}`} />
          <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: colores[2] }} title={`Acento: ${colores[2]}`} />
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--ok)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Editar
          </button>
        </div>
      </div>

      {estado?.error && (
        <div className="aviso" role="alert" style={{ lineHeight: 1.4 }}>
          {estado.error}
        </div>
      )}

      <button className="boton" type="submit" disabled={pendiente} style={{ backgroundColor: colores[0] }}>
        {pendiente ? 'Creando club…' : 'Crear mi club'}
      </button>

      {/* Modal interactivo de paleta */}
      <ModalPaletaClub
        abierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        nombreClub={nombre}
        logoDataUrl={logoPreview}
        colores={colores}
        alCambiarColor={alCambiarColor}
        tieneFondoDetectado={tieneFondo}
        removerFondoActivo={removerFondo}
        alAlternarRemoverFondo={alAlternarFondo}
        alConfirmar={() => setModalAbierto(false)}
      />
    </form>
  );
}
