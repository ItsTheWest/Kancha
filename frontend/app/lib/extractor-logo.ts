export interface ResultadoLogo {
  dataUrl: string;
  tieneFondoDetectado: boolean;
  colorFondoDetectado?: string;
  paletaSugerida: [string, string, string]; // [Primario, Secundario, Acento]
}

function rgbAHex(r: number, g: number, b: number): string {
  const aHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${aHex(r)}${aHex(g)}${aHex(b)}`;
}

function distanciaColor(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
  );
}

function ajustarBrillo(hex: string, porcentaje: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round(255 * (porcentaje / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (porcentaje / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (porcentaje / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return rgbAHex(r, g, b);
}

export async function analizarYProcesarLogo(
  archivo: File,
  removerFondo: boolean = false
): Promise<ResultadoLogo> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo inicializar canvas 2D'));
        return;
      }

      // Escalar manteniendo proporción para procesamiento rápido (máx 320x320)
      const maxDim = 320;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const pixeles = imgData.data;

      // 1. Detectar si las 4 esquinas comparten un color uniforme (fondo)
      const obtenerPixel = (x: number, y: number) => {
        const i = (y * w + x) * 4;
        return [pixeles[i], pixeles[i + 1], pixeles[i + 2], pixeles[i + 3]];
      };

      const cTL = obtenerPixel(0, 0);
      const cTR = obtenerPixel(w - 1, 0);
      const cBL = obtenerPixel(0, h - 1);
      const cBR = obtenerPixel(w - 1, h - 1);

      const d1 = distanciaColor(cTL[0], cTL[1], cTL[2], cTR[0], cTR[1], cTR[2]);
      const d2 = distanciaColor(cTL[0], cTL[1], cTL[2], cBL[0], cBL[1], cBL[2]);
      const d3 = distanciaColor(cTL[0], cTL[1], cTL[2], cBR[0], cBR[1], cBR[2]);

      const esSolido = cTL[3] > 200 && cTR[3] > 200 && cBL[3] > 200 && cBR[3] > 200;
      const tieneFondoUniforme = esSolido && d1 < 30 && d2 < 30 && d3 < 30;

      const bgR = Math.round((cTL[0] + cTR[0] + cBL[0] + cBR[0]) / 4);
      const bgG = Math.round((cTL[1] + cTR[1] + cBL[1] + cBR[1]) / 4);
      const bgB = Math.round((cTL[2] + cTR[2] + cBL[2] + cBR[2]) / 4);
      const colorFondoDetectado = rgbAHex(bgR, bgG, bgB);

      // 2. Si se solicita remover fondo y se detectó fondo uniforme
      if (removerFondo && tieneFondoUniforme) {
        const tolerancia = 42;
        for (let i = 0; i < pixeles.length; i += 4) {
          const pr = pixeles[i];
          const pg = pixeles[i + 1];
          const pb = pixeles[i + 2];
          const dist = distanciaColor(pr, pg, pb, bgR, bgG, bgB);

          if (dist < tolerancia) {
            // Suavizado en el borde
            if (dist < tolerancia - 10) {
              pixeles[i + 3] = 0;
            } else {
              const alfa = (dist - (tolerancia - 10)) / 10;
              pixeles[i + 3] = Math.round(pixeles[i + 3] * alfa);
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // 3. Extracción de colores dominantes (muestreo de píxeles visibles)
      const mapaColores = new Map<string, { r: number; g: number; b: number; count: number }>();

      for (let i = 0; i < pixeles.length; i += 4) {
        const a = pixeles[i + 3];
        if (a < 80) continue; // Ignorar transparentes

        const r = pixeles[i];
        const g = pixeles[i + 1];
        const b = pixeles[i + 2];

        // Si no se removió fondo pero había fondo uniforme, no tomar el fondo como color dominante
        if (tieneFondoUniforme && !removerFondo) {
          if (distanciaColor(r, g, b, bgR, bgG, bgB) < 25) continue;
        }

        // Descartar tonos extremos que no aportan identidad deportiva (blanco o negro puro como color primario)
        const brillo = (r + g + b) / 3;
        if (brillo < 15 || brillo > 245) continue;

        // Cuantizar en pasos de 16 para agrupar tonos similares
        const qr = Math.round(r / 16) * 16;
        const qg = Math.round(g / 16) * 16;
        const qb = Math.round(b / 16) * 16;
        const clave = `${qr},${qg},${qb}`;

        const existente = mapaColores.get(clave);
        if (existente) {
          existente.count++;
        } else {
          mapaColores.set(clave, { r: qr, g: qg, b: qb, count: 1 });
        }
      }

      // Ordenar colores por frecuencia
      const ordenados = Array.from(mapaColores.values()).sort((a, b) => b.count - a.count);

      // Elegir hasta 3 colores distintivos con distancia visual suficiente
      const seleccionados: { r: number; g: number; b: number }[] = [];
      const distMinima = 50;

      for (const col of ordenados) {
        if (seleccionados.length >= 3) break;
        const esDistinto = seleccionados.every(
          (s) => distanciaColor(s.r, s.g, s.b, col.r, col.g, col.b) >= distMinima
        );
        if (esDistinto) {
          seleccionados.push(col);
        }
      }

      // Generar paleta completa de 3 colores
      let hex1 = '#3ecf8e';
      let hex2 = '#1f7a52';
      let hex3 = '#6ef0b0';

      if (seleccionados.length === 1) {
        hex1 = rgbAHex(seleccionados[0].r, seleccionados[0].g, seleccionados[0].b);
        hex2 = ajustarBrillo(hex1, -25);
        hex3 = ajustarBrillo(hex1, 30);
      } else if (seleccionados.length === 2) {
        hex1 = rgbAHex(seleccionados[0].r, seleccionados[0].g, seleccionados[0].b);
        hex2 = rgbAHex(seleccionados[1].r, seleccionados[1].g, seleccionados[1].b);
        hex3 = ajustarBrillo(hex1, 35);
      } else if (seleccionados.length >= 3) {
        hex1 = rgbAHex(seleccionados[0].r, seleccionados[0].g, seleccionados[0].b);
        hex2 = rgbAHex(seleccionados[1].r, seleccionados[1].g, seleccionados[1].b);
        hex3 = rgbAHex(seleccionados[2].r, seleccionados[2].g, seleccionados[2].b);
      }

      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        tieneFondoDetectado: tieneFondoUniforme,
        colorFondoDetectado,
        paletaSugerida: [hex1, hex2, hex3],
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al cargar la imagen del logo'));
    };

    img.src = url;
  });
}
