import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kancha · Plataforma Deportiva',
    short_name: 'Kancha',
    description: 'Gestión integral para clubes y organizaciones deportivas',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b0f14',
    theme_color: '#3ecf8e',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  };
}
