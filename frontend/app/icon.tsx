import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f14',
          borderRadius: 40,
          border: '4px solid #243040',
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: '#3ecf8e',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          K
        </div>
      </div>
    ),
    { ...size }
  );
}
