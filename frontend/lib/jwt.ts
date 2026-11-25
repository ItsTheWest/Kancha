// Solo lee `exp` y claims del access token; NO verifica la firma. El secreto HS256 vive únicamente
// en el backend: si estuviera aquí, un SSRF en Next podría firmar tokens. Esto es una
// puerta de UX; la autorización real la hace el guard de Nest en cada petición.

export function caducado(token: string, margenSeg = 30): boolean {
  try {
    const cuerpo = token.split('.')[1];
    if (!cuerpo) return true;
    const base64 = cuerpo.replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64)) as { exp?: unknown };
    if (typeof exp !== 'number') return true;
    return exp - margenSeg <= Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

export function leerPayload(token: string): { completo?: boolean; sub?: string } | null {
  try {
    const cuerpo = token.split('.')[1];
    if (!cuerpo) return null;
    const base64 = cuerpo.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}
