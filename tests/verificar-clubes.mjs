/**
 * Suite de pruebas automatizadas para Fase 1 (Clubes y Membresías).
 * Valida la creación guiada, regla de límite de clubes gratuitos,
 * consulta de membresías y actualización de colores.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:53001';

let exitos = 0;
let fallos = 0;

function afirmar(condicion, descripcion) {
  if (condicion) {
    console.log(`  ✓ ${descripcion}`);
    exitos++;
  } else {
    console.error(`  ✗ FALLO: ${descripcion}`);
    fallos++;
  }
}

async function ejecutar() {
  console.log(`[kancha-test] Iniciando pruebas de Fase 1 (Clubes) en ${BASE_URL}...\n`);

  const sufijo = Date.now();
  const correo = `propietario_${sufijo}@kanchatest.com`;
  const cedula = `V${Math.floor(10000000 + Math.random() * 80000000)}`;

  let token = '';

  // 1. Registro de usuario
  console.log('1. Autenticación de usuario para gestión de clubes');
  try {
    const resReg = await fetch(`${BASE_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombres: 'Fundador',
        apellidos: 'Club',
        correo,
        cedula,
        rol: 'propietario',
        contrasena: 'ClaveSegura123!',
      }),
    });
    const dataReg = await resReg.json();
    afirmar(resReg.status === 201, 'Registro de usuario exitoso (HTTP 201)');
    token = dataReg.accessToken;
    afirmar(Boolean(token), 'Token de acceso JWT obtenido');
  } catch (err) {
    afirmar(false, `Error en autenticación: ${err.message}`);
  }

  // 2. Creación del primer club
  console.log('\n2. Creación guiada de club');
  let clubId = '';
  let clubSlug = '';
  try {
    const resClub = await fetch(`${BASE_URL}/clubes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nombre: 'Atlético Deportivo Kancha',
        deporte: 'futbol',
        ciudad: 'Caracas',
        colorPrimario: '#ff5500',
        colorSecundario: '#112233',
        colorAcento: '#ffffff',
      }),
    });
    const dataClub = await resClub.json();
    afirmar(resClub.status === 201, 'Creación de club exitosa (HTTP 201)');
    afirmar(dataClub.nombre === 'Atlético Deportivo Kancha', 'Nombre del club coincide');
    afirmar(dataClub.slug.includes('atletico-deportivo-kancha'), 'Slug generado automáticamente');
    afirmar(dataClub.colorPrimario === '#ff5500', 'Color primario registrado');
    afirmar(dataClub.colorSecundario === '#112233', 'Color secundario registrado');
    afirmar(dataClub.colorAcento === '#ffffff', 'Color acento registrado');
    clubId = dataClub.id;
    clubSlug = dataClub.slug;
  } catch (err) {
    afirmar(false, `Error al crear club: ${err.message}`);
  }

  // 3. Regla de negocio: límite de 1 club en plan gratuito
  console.log('\n3. Validación de límite en plan gratuito (máx 1 club propio)');
  try {
    const resClub2 = await fetch(`${BASE_URL}/clubes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nombre: 'Segundo Club No Permitido',
        deporte: 'futbol',
      }),
    });
    const dataClub2 = await resClub2.json();
    afirmar(resClub2.status === 409, 'Rechaza creación de segundo club propio (HTTP 409 Conflict)');
    afirmar(dataClub2.message === 'limite_clubes_alcanzado', 'Mensaje de error correcto: limite_clubes_alcanzado');
  } catch (err) {
    afirmar(false, `Error probando límite: ${err.message}`);
  }

  // 4. Consulta de mis clubes
  console.log('\n4. Consulta de membresías y clubes del usuario');
  try {
    const resMis = await fetch(`${BASE_URL}/clubes/mis-clubes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dataMis = await resMis.json();
    afirmar(resMis.status === 200, 'Consulta de mis clubes responde HTTP 200');
    afirmar(Array.isArray(dataMis) && dataMis.length >= 1, 'Retorna array con el club creado');
    const miClub = dataMis.find((c) => c.id === clubId);
    afirmar(Boolean(miClub), 'Club creado está presente en mis clubes');
    afirmar(miClub?.esPropietario === true, 'El usuario es marcado como propietario del club');
    afirmar(miClub?.roles?.includes('Administrador'), 'El creador tiene rol asignado de Administrador');
    afirmar(miClub?.categoria === 'General', 'Categoría inicial por defecto es General');
  } catch (err) {
    afirmar(false, `Error consultando mis clubes: ${err.message}`);
  }

  // 5. Obtener por slug
  console.log('\n5. Consulta de club por slug público/privado');
  try {
    const resSlug = await fetch(`${BASE_URL}/clubes/${clubSlug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dataSlug = await resSlug.json();
    afirmar(resSlug.status === 200, 'Consulta por slug responde HTTP 200');
    afirmar(dataSlug.id === clubId, 'ID del club consultado coincide');
    afirmar(dataSlug.membresia?.esAdmin === true, 'Identifica al usuario como administrador del club');
  } catch (err) {
    afirmar(false, `Error consultando por slug: ${err.message}`);
  }

  // 6. Actualización de colores e información
  console.log('\n6. Actualización de colores del club');
  try {
    const resPatch = await fetch(`${BASE_URL}/clubes/${clubId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        colorPrimario: '#3ecf8e',
        colorAcento: '#aaff00',
      }),
    });
    const dataPatch = await resPatch.json();
    afirmar(resPatch.status === 200, 'Actualización responde HTTP 200');
    afirmar(dataPatch.colorPrimario === '#3ecf8e', 'Color primario actualizado');
    afirmar(dataPatch.colorAcento === '#aaff00', 'Color acento actualizado');
  } catch (err) {
    afirmar(false, `Error actualizando club: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Resultado Fase 1: ${exitos} exitosas, ${fallos} fallidas.`);
  console.log(`========================================\n`);

  if (fallos > 0) process.exit(1);
}

ejecutar();
