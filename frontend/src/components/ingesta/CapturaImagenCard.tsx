import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/api/client';
import { ESTADO_CAPTURA_LABEL, type CapturaImagen } from '@/hooks/useCapturaImagen';

export interface CapturaImagenCardProps {
  captura: CapturaImagen;
  titulo: string;
  descripcion: string;
  textoGaleria?: string;
  ariaGaleria: string;
}

/** Tarjeta de captura: elegir de la galería o tomar foto con la cámara trasera, con estado y errores. */
export const CapturaImagenCard: React.FC<CapturaImagenCardProps> = ({
  captura,
  titulo,
  descripcion,
  textoGaleria = 'Adjuntar imagen',
  ariaGaleria,
}) => {
  const { analizando, estado, fileName, previewUrl, errorArchivo, errorAnalisis, galeriaRef, camaraRef } = captura;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4" />
          {titulo}
        </CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={analizando} onClick={() => galeriaRef.current?.click()}>
            {analizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {textoGaleria}
          </Button>
          <Button type="button" disabled={analizando} onClick={() => camaraRef.current?.click()}>
            <Camera className="h-4 w-4" />
            Tomar foto
          </Button>
          {fileName && <span className="max-w-[220px] truncate text-xs text-muted-foreground">{fileName}</span>}
        </div>

        {/* capture="environment" abre directamente la cámara trasera del celular */}
        <input
          ref={camaraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void captura.seleccionarArchivo(e.target.files?.[0])}
          aria-label="Tomar foto con la cámara"
        />
        <input
          ref={galeriaRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void captura.seleccionarArchivo(e.target.files?.[0])}
          aria-label={ariaGaleria}
        />

        {analizando && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {ESTADO_CAPTURA_LABEL[estado as Exclude<typeof estado, 'idle'>]}
          </div>
        )}

        {errorArchivo && (
          <Alert variant="destructive">
            <AlertDescription>{errorArchivo}</AlertDescription>
          </Alert>
        )}
        {errorAnalisis && (
          <Alert variant="destructive">
            <AlertDescription>
              {errorAnalisis instanceof ApiError
                ? errorAnalisis.message
                : 'No se pudo analizar la imagen. Intenta con otra fotografía.'}
            </AlertDescription>
          </Alert>
        )}

        {previewUrl && (
          <div className="h-40 w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
            <img src={previewUrl} alt="Vista previa de la imagen" className="h-full w-full object-contain" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
