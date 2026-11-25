export interface MetaPeticion {
  ip: string;
  agente: string | null;
}

export interface UsuarioAutenticado {
  id: string;
  // Coincide con la familia_id de la sesión: permite revocar la sesión entera.
  sesionId: string;
}

export interface PayloadAcceso {
  iss: string;
  aud: string;
  sub: string;
  sid: string;
  jti: string;
  typ: 'acceso';
  completo: boolean;
  iat: number;
  exp: number;
}

export interface TokensEmitidos {
  accessToken: string;
  refreshToken: string;
  // Segundos hasta que caduca el access token.
  expiraEn: number;
}

export interface PerfilUsuario {
  id: string;
  codigoPublico: string;
  correo: string;
  nombres: string;
  apellidos: string;
  rol: 'jugador' | 'propietario' | null;
  cedula: string | null;
  telefono: string | null;
  correoVerificadoEn: Date | null;
  estado: 'activo' | 'suspendido';
}

export interface RespuestaSesion extends TokensEmitidos {
  usuario: PerfilUsuario;
}
