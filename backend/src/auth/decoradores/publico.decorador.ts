import { SetMetadata } from '@nestjs/common';

export const ES_PUBLICO = 'esPublico';

// Marca una ruta como accesible sin sesión. Todo lo demás exige access token.
export const Publico = () => SetMetadata(ES_PUBLICO, true);
