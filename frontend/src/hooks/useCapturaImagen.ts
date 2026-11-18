import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ingestaApi } from '@/api/ingesta.api';
import { storageApi } from '@/api/storage.api';
import { comprimirImagen, esImagenValida, MAX_TAMANO_ENTRADA_BYTES, type FotoComprimida } from '@/lib/imageCompression';
import type { ModoIngesta, ResultadoExtraccion } from '@libredss/shared';

export type EstadoCaptura = 'idle' | 'comprimiendo' | 'subiendo' | 'analizando';

export const ESTADO_CAPTURA_LABEL: Record<Exclude<EstadoCaptura, 'idle'>, string> = {
  comprimiendo: 'Optimizando imagen…',
  subiendo: 'Subiendo imagen…',
  analizando: 'Extrayendo productos con IA…',
};

/**
 * Captura una foto, la comprime en el dispositivo, la sube por URL prefirmada y pide la extracción
 * a la IA en el modo indicado. Es el tramo común de la ingesta de ventas y del escaneo de inventario.
 */
export function useCapturaImagen(modo: ModoIngesta, onResultado: (resultado: ResultadoExtraccion) => void) {
  const galeriaRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);

  const [estado, setEstado] = useState<EstadoCaptura>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  const analizar = useMutation({
    mutationFn: async (comprimida: FotoComprimida) => {
      setEstado('subiendo');
      const presigned = await storageApi.solicitarPresignedUrl(comprimida.filename, comprimida.contentType);
      await storageApi.subirArchivo(presigned.uploadUrl, comprimida.blob, comprimida.contentType);
      setEstado('analizando');
      return ingestaApi.extraer({ s3Key: presigned.key, ...(modo === 'inventario' ? { modo } : {}) });
    },
    onSuccess: (resultado) => {
      setEstado('idle');
      onResultado(resultado);
    },
    onError: () => setEstado('idle'),
  });

  const seleccionarArchivo = async (file: File | undefined) => {
    if (!file) return;
    setErrorArchivo(null);
    if (!esImagenValida(file)) {
      setErrorArchivo('El archivo debe ser una imagen (JPG, PNG, WEBP…).');
      return;
    }
    if (file.size > MAX_TAMANO_ENTRADA_BYTES) {
      setErrorArchivo('La imagen supera el límite de 12 MB.');
      return;
    }

    setEstado('comprimiendo');
    try {
      // La vista previa usa el blob ya comprimido (lo que realmente se sube), no el File original.
      const comprimida = await comprimirImagen(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(comprimida.blob));
      setFileName(comprimida.filename);
      analizar.mutate(comprimida);
    } catch {
      setEstado('idle');
      setErrorArchivo('No se pudo procesar la imagen. Intenta con otra fotografía.');
    }
  };

  const reiniciar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setErrorArchivo(null);
    setEstado('idle');
    analizar.reset();
    if (galeriaRef.current) galeriaRef.current.value = '';
    if (camaraRef.current) camaraRef.current.value = '';
  };

  return {
    estado,
    analizando: estado !== 'idle',
    previewUrl,
    fileName,
    errorArchivo,
    errorAnalisis: analizar.isError ? analizar.error : null,
    galeriaRef,
    camaraRef,
    seleccionarArchivo,
    reiniciar,
  };
}

export type CapturaImagen = ReturnType<typeof useCapturaImagen>;
