export const MAX_DIMENSION_DEFAULT = 1024;
export const CALIDAD_DEFAULT = 0.7;
export const MAX_FOTOS_POR_LOTE = 5;
export const MAX_TAMANO_ENTRADA_BYTES = 12 * 1024 * 1024; // 12 MB por archivo original

export interface Dimensiones {
  width: number;
  height: number;
}

export interface FotoComprimida {
  blob: Blob;
  filename: string;
  contentType: string;
  width: number;
  height: number;
  originalBytes: number;
  comprimidoBytes: number;
}

/**
 * Reduce proporcionalmente las dimensiones para que el lado mayor no exceda
 * `maxDimension`, preservando el aspecto. Función pura y testeable.
 */
export function calcularDimensiones(
  naturalWidth: number,
  naturalHeight: number,
  maxDimension: number = MAX_DIMENSION_DEFAULT
): Dimensiones {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: 0, height: 0 };
  }

  if (naturalWidth <= maxDimension && naturalHeight <= maxDimension) {
    return { width: Math.round(naturalWidth), height: Math.round(naturalHeight) };
  }

  const ratio = Math.min(maxDimension / naturalWidth, maxDimension / naturalHeight);
  return {
    width: Math.max(1, Math.round(naturalWidth * ratio)),
    height: Math.max(1, Math.round(naturalHeight * ratio)),
  };
}

/** Fuerza extensión `.jpg` (la compresión siempre produce JPEG). */
export function nombreComprimido(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, '').trim() || 'foto';
  return `${base}.jpg`;
}

export function esImagenValida(file: File): boolean {
  return file.type.startsWith('image/');
}

async function cargarImagen(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
    } catch {
      // Cae al camino con HTMLImageElement.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      img.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

/**
 * Comprime una fotografía en el navegador vía Canvas (≤`maxDimension` px y JPEG
 * de calidad `calidad`) antes de subirla a S3 por presigned URL (HU-35).
 */
export async function comprimirImagen(
  file: File,
  options: { maxDimension?: number; calidad?: number } = {}
): Promise<FotoComprimida> {
  const maxDimension = options.maxDimension ?? MAX_DIMENSION_DEFAULT;
  const calidad = options.calidad ?? CALIDAD_DEFAULT;

  const { source, width, height, cleanup } = await cargarImagen(file);

  try {
    const destino = calcularDimensiones(width, height, maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = destino.width;
    canvas.height = destino.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('El navegador no soporta el contexto 2D de Canvas');
    }

    ctx.drawImage(source, 0, 0, destino.width, destino.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', calidad);
    });

    const comprimido = blob ?? new Blob([], { type: 'image/jpeg' });

    return {
      blob: comprimido,
      filename: nombreComprimido(file.name),
      contentType: 'image/jpeg',
      width: destino.width,
      height: destino.height,
      originalBytes: file.size,
      comprimidoBytes: comprimido.size,
    };
  } finally {
    cleanup();
  }
}
