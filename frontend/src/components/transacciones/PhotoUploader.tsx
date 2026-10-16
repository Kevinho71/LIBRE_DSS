import React, { useCallback, useEffect, useRef } from 'react';
import { AlertCircle, Camera, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { storageApi } from '@/api/storage.api';
import {
  comprimirImagen,
  esImagenValida,
  MAX_FOTOS_POR_LOTE,
  MAX_TAMANO_ENTRADA_BYTES,
} from '@/lib/imageCompression';
import { generarUuid } from '@/lib/idempotency';
import { cn } from '@/lib/utils';

export type EstadoFoto = 'comprimiendo' | 'subiendo' | 'subida' | 'error';

export interface FotoAdjunta {
  id: string;
  filename: string;
  previewUrl: string;
  estado: EstadoFoto;
  key?: string;
  error?: string;
  originalBytes?: number;
  comprimidoBytes?: number;
}

export interface PhotoUploaderProps {
  value: FotoAdjunta[];
  onChange: (fotos: FotoAdjunta[]) => void;
  max?: number;
  disabled?: boolean;
}

function formatearBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  return `${Math.round(bytes / 1024)} KB`;
}

const ESTADO_LABEL: Record<EstadoFoto, string> = {
  comprimiendo: 'Comprimiendo…',
  subiendo: 'Subiendo…',
  subida: 'Subida',
  error: 'Error',
};

/** Hasta 5 fotos comprimidas en Canvas y subidas por presigned URL (HU-35). */
export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ value, onChange, max = MAX_FOTOS_POR_LOTE, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fotosRef = useRef<FotoAdjunta[]>(value);

  useEffect(() => {
    fotosRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      fotosRef.current.forEach((foto) => URL.revokeObjectURL(foto.previewUrl));
    };
  }, []);

  const aplicar = useCallback(
    (next: FotoAdjunta[]) => {
      fotosRef.current = next;
      onChange(next);
    },
    [onChange]
  );

  const actualizarFoto = useCallback(
    (id: string, patch: Partial<FotoAdjunta>) => {
      aplicar(fotosRef.current.map((foto) => (foto.id === id ? { ...foto, ...patch } : foto)));
    },
    [aplicar]
  );

  const agregarConError = useCallback(
    (filename: string, mensaje: string) => {
      aplicar([
        ...fotosRef.current,
        {
          id: generarUuid(),
          filename,
          previewUrl: '',
          estado: 'error',
          error: mensaje,
        },
      ]);
    },
    [aplicar]
  );

  const procesarArchivos = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const capacidad = max - fotosRef.current.length;
      if (capacidad <= 0) {
        agregarConError('', `Máximo ${max} fotografías por lote`);
        return;
      }

      const archivos = Array.from(files).slice(0, capacidad);

      for (const file of archivos) {
        if (!esImagenValida(file)) {
          agregarConError(file.name, 'El archivo no es una imagen');
          continue;
        }
        if (file.size > MAX_TAMANO_ENTRADA_BYTES) {
          agregarConError(file.name, 'La imagen supera el límite de 12 MB');
          continue;
        }

        const id = generarUuid();
        const previewOriginal = URL.createObjectURL(file);
        aplicar([
          ...fotosRef.current,
          {
            id,
            filename: file.name,
            previewUrl: previewOriginal,
            estado: 'comprimiendo',
            originalBytes: file.size,
          },
        ]);

        void (async () => {
          try {
            const comprimida = await comprimirImagen(file);
            URL.revokeObjectURL(previewOriginal);
            actualizarFoto(id, {
              estado: 'subiendo',
              filename: comprimida.filename,
              previewUrl: URL.createObjectURL(comprimida.blob),
              comprimidoBytes: comprimida.comprimidoBytes,
            });

            const presigned = await storageApi.solicitarPresignedUrl(comprimida.filename, comprimida.contentType);
            await storageApi.subirArchivo(presigned.uploadUrl, comprimida.blob, comprimida.contentType);
            actualizarFoto(id, { estado: 'subida', key: presigned.key });
          } catch (error) {
            actualizarFoto(id, {
              estado: 'error',
              error: error instanceof Error ? error.message : 'Fallo al subir la imagen',
            });
          }
        })();
      }

      if (inputRef.current) inputRef.current.value = '';
    },
    [actualizarFoto, agregarConError, aplicar, max]
  );

  const quitar = (id: string) => {
    const foto = fotosRef.current.find((f) => f.id === id);
    if (foto?.previewUrl) URL.revokeObjectURL(foto.previewUrl);
    aplicar(fotosRef.current.filter((f) => f.id !== id));
  };

  const restantes = max - value.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {value.length} de {max} fotografías · compresión local antes de subir
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || restantes <= 0}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          Adjuntar fotos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => procesarArchivos(e.target.files)}
          aria-label="Adjuntar fotografías"
        />
      </div>

      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((foto) => (
            <li key={foto.id} className="overflow-hidden rounded-lg border bg-card">
              <div className="relative h-28 w-full bg-muted">
                {foto.previewUrl ? (
                  <img
                    src={foto.previewUrl}
                    alt={foto.filename || 'fotografía adjunta'}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => quitar(foto.id)}
                  disabled={disabled}
                  aria-label={`Quitar ${foto.filename || 'fotografía'}`}
                  className="absolute right-1.5 top-1.5 rounded-md bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-0.5 p-2">
                <p className="truncate text-xs font-medium text-foreground" title={foto.filename}>
                  {foto.filename || 'imagen'}
                </p>
                <div
                  className={cn(
                    'flex items-center gap-1 text-[11px]',
                    foto.estado === 'error' ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {foto.estado === 'comprimiendo' || foto.estado === 'subiendo' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : foto.estado === 'subida' ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  <span>{foto.error ?? ESTADO_LABEL[foto.estado]}</span>
                </div>
                {foto.comprimidoBytes && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatearBytes(foto.originalBytes)} → {formatearBytes(foto.comprimidoBytes)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
