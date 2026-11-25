/**
 * Suite de pruebas automatizadas para Fase 0 (Cimientos y Autenticación).
 * Ejecuta validaciones contra el backend en ejecución (puerto 53001).
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
  console.log(`[kancha-test] Iniciando pruebas de integración en ${BASE_URL}...\n`);

  // 1. Healthcheck
  console.log('1. Verificación de salud del sistema (/health)');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    afirmar(res.status === 200, 'El endpoint /health responde HTTP 200');
    afirmar(data.db === 'up', 'PostgreSQL reporta estado "up"');
    afirmar(data.redis === 'up', 'Redis reporta estado "up"');
  } catch (err) {
    afirmar(false, `Error conectando con /health: ${err.message}`);
  }

  // 2. Validación de contraseña mínima de 8 caracteres
  console.log('\n2. Validación de regla de negocio: contraseña mínima (8 caracteres)');
  try {
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const res = await fetch(`${BASE_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombres: 'Test',
        apellidos: 'Corto',
        correo: `corto_${randomSuffix}@test.com`,
        cedula: `V${Math.floor(10000000 + Math.random() * 80000000)}`,
        rol: 'jugador',
        contrasena: '1234567', // 7 caracteres (debe fallar)
      }),
    });
    afirmar(res.status === 400, 'Rechaza registro con contraseña menor a 8 caracteres (HTTP 400)');
  } catch (err) {
    afirmar(false, `Fallo en prueba de contraseña corta: ${err.message}`);
  }

  // 3. Flujo completo de registro y sesión
  console.log('\n3. Flujo de registro exitoso, login y perfil');
  let accessToken = '';
  let refreshToken = '';
  const correoPrueba = `atleta_${Date.now()}@kanchatest.com`;
  const cedulaPrueba = `V${Math.floor(10000000 + Math.random() * 80000000)}`;

  try {
    const resReg = await fetch(`${BASE_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombres: 'Atleta',
        apellidos: 'Prueba',
        correo: correoPrueba,
        cedula: cedulaPrueba,
        rol: 'jugador',
        contrasena: 'ClaveSegura123!',
      }),
    });
    const dataReg = await resReg.json();
    afirmar(resReg.status === 201, 'Registro exitoso retorna HTTP 201');
    afirmar(Boolean(dataReg.accessToken && dataReg.refreshToken), 'Retorna access token y refresh token');
    afirmar(dataReg.usuario?.correo === correoPrueba, 'Perfil retornado coincide con correo registrado');

    // 4. Rechazo de duplicado
    console.log('\n4. Rechazo de correo duplicado');
    const resDup = await fetch(`${BASE_URL}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombres: 'Otro',
        apellidos: 'Usuario',
        correo: correoPrueba,
        cedula: `V${Math.floor(10000000 + Math.random() * 80000000)}`,
        rol: 'jugador',
        contrasena: 'ClaveSegura123!',
      }),
    });
    afirmar(resDup.status === 409, 'Rechaza correo existente con HTTP 409 Conflict');

    // 5. Iniciar sesión
    console.log('\n5. Inicio de sesión');
    const resLogin = await fetch(`${BASE_URL}/auth/sesion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: correoPrueba,
        contrasena: 'ClaveSegura123!',
      }),
    });
    const dataLogin = await resLogin.json();
    afirmar(resLogin.status === 200, 'Inicio de sesión exitoso retorna HTTP 200');
    accessToken = dataLogin.accessToken;
    refreshToken = dataLogin.refreshToken;

    // 6. Consultar perfil con JWT
    console.log('\n6. Consulta de perfil autenticado');
    const resPerfil = await fetch(`${BASE_URL}/auth/perfil`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const dataPerfil = await resPerfil.json();
    afirmar(resPerfil.status === 200, 'Acceso a /auth/perfil con token válido retorna HTTP 200');
    afirmar(dataPerfil.cedula === cedulaPrueba, 'Cédula en perfil coincide');

    // 7. Refresco rotativo de sesión
    console.log('\n7. Rotación de tokens de refresco');
    const resRefresco = await fetch(`${BASE_URL}/auth/sesion/refrescar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const dataRefresco = await resRefresco.json();
    afirmar(resRefresco.status === 200, 'Refresco de sesión retorna HTTP 200');
    afirmar(Boolean(dataRefresco.accessToken && dataRefresco.refreshToken), 'Retorna nuevos tokens rotados');
    afirmar(dataRefresco.refreshToken !== refreshToken, 'El nuevo refresh token ha rotado');
    refreshToken = dataRefresco.refreshToken;

    // 8. Cierre de sesión
    console.log('\n8. Cierre de sesión');
    const resLogout = await fetch(`${BASE_URL}/auth/sesion`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    afirmar(resLogout.status === 204, 'Cierre de sesión retorna HTTP 204 No Content');
  } catch (err) {
    afirmar(false, `Fallo inesperado durante el flujo: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Resultado: ${exitos} exitosas, ${fallos} fallidas.`);
  console.log(`========================================\n`);

  if (fallos > 0) process.exit(1);
}

ejecutar();
