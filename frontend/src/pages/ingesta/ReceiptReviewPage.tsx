import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileScan,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductAutocomplete } from '@/components/transacciones/ProductAutocomplete';
import { ingestaApi } from '@/api/ingesta.api';
import { storageApi } from '@/api/storage.api';
import { ApiError } from '@/api/client';
import { comprimirImagen, esImagenValida, MAX_TAMANO_ENTRADA_BYTES } from '@/lib/imageCompression';
import { generarUuid } from '@/lib/idempotency';
import { useAuth } from '@/context/AuthContext';
import { hoyISO } from '@/lib/format';
import type { ProductoBusqueda } from '@/api/productos.api';
import type { ItemMatcheado, ResultadoConfirmacion, ResultadoExtraccion } from '@libredss/shared';

const UMBRAL_COINCIDENCIA = 0.3;

type Fase = 'seleccion' | 'revision' | 'confirmada';
type EstadoAnalisis = 'idle' | 'comprimiendo' | 'subiendo' | 'analizando';

const ESTADO_LABEL: Record<Exclude<EstadoAnalisis, 'idle'>, string> = {
  comprimiendo: 'Optimizando imagen…',
  subiendo: 'Subiendo recibo…',
  analizando: 'Extrayendo productos con IA…',
};

interface FilaIngesta {
  key: string;
  descripcion: string;
  sugeridoId: string | null;
  sugeridoNombre: string | null;
  sugeridoSku: string | null;
  similitud: number | null;
  producto: ProductoBusqueda | null;
  cantidad: string;
  precioVenta: string;
}

function productoDesdeItem(item: ItemMatcheado): ProductoBusqueda | null {
  if (!item.productoId) return null;
  return {
    id: item.productoId,
    sku: item.sku,
    nombre: item.nombreProducto ?? item.descripcion,
    precioVenta: item.precioUnitario ?? 0,
    costoUnitario: 0,
    stockActual: 0,
    unidadMedida: '',
    factorConversion: 1,
    unidadCompra: null,
  };
}

function filaDesdeItem(item: ItemMatcheado): FilaIngesta {
  return {
    key: generarUuid(),
    descripcion: item.descripcion,
    sugeridoId: item.productoId,
    sugeridoNombre: item.nombreProducto,
    sugeridoSku: item.sku,
    similitud: item.similitud,
    producto: productoDesdeItem(item),
    cantidad: item.cantidad ? String(item.cantidad) : '',
    precioVenta: item.precioUnitario != null ? String(item.precioUnitario) : '',
  };
}

/**
 * Pantalla Human-in-the-Loop de ingesta asistida por IA (HU-37). El operador
 * adjunta un recibo, revisa y corrige los ítems y la fecha extraídos, y solo
 * entonces confirma. Sin confirmación no se persiste ninguna transacción.
 */
export const ReceiptReviewPage: React.FC = () => {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fase, setFase] = useState<Fase>('seleccion');
  const [estado, setEstado] = useState<EstadoAnalisis>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [ingesta, setIngesta] = useState<ResultadoExtraccion | null>(null);
  const [fechaEvento, setFechaEvento] = useState('');
  const [filas, setFilas] = useState<FilaIngesta[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmacion, setConfirmacion] = useState<ResultadoConfirmacion | null>(null);

  const analizar = useMutation({
    mutationFn: async (file: File) => {
      setEstado('comprimiendo');
      const comprimida = await comprimirImagen(file);
      setEstado('subiendo');
      const presigned = await storageApi.solicitarPresignedUrl(comprimida.filename, comprimida.contentType);
      await storageApi.subirArchivo(presigned.uploadUrl, comprimida.blob, comprimida.contentType);
      setEstado('analizando');
      return ingestaApi.extraer({ s3Key: presigned.key });
    },
    onSuccess: (resultado) => {
      setIngesta(resultado);
      setFechaEvento(resultado.fechaSugerida ?? '');
      setFilas(resultado.items.map(filaDesdeItem));
      setFase('revision');
      setErrores([]);
      setEstado('idle');
    },
    onError: () => setEstado('idle'),
  });

  const confirmar = useMutation({
    mutationFn: (payload: { fechaEvento: string; items: { productoId: string; cantidad: number; precioVenta?: number }[] }) =>
      ingestaApi.confirmar(ingesta!.ingestaId, payload),
    onSuccess: (resultado) => {
      setConfirmacion(resultado);
      setFase('confirmada');
      void queryClient.invalidateQueries({ queryKey: ['transacciones'] });
    },
  });

  const seleccionarArchivo = (file: File | undefined) => {
    if (!file) return;
    setErrores([]);
    if (!esImagenValida(file)) {
      setErrores(['El archivo debe ser una imagen (JPG, PNG, WEBP…).']);
      return;
    }
    if (file.size > MAX_TAMANO_ENTRADA_BYTES) {
      setErrores(['La imagen supera el límite de 12 MB.']);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    analizar.mutate(file);
  };

  const reiniciar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setIngesta(null);
    setFilas([]);
    setFechaEvento('');
    setErrores([]);
    setEstado('idle');
    setConfirmacion(null);
    setFase('seleccion');
    if (inputRef.current) inputRef.current.value = '';
  };

  const actualizarFila = (key: string, patch: Partial<FilaIngesta>) => {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  };

  const quitarFila = (key: string) => {
    setFilas((prev) => prev.filter((f) => f.key !== key));
  };

  const agregarFila = () => {
    setFilas((prev) => [
      ...prev,
      {
        key: generarUuid(),
        descripcion: '',
        sugeridoId: null,
        sugeridoNombre: null,
        sugeridoSku: null,
        similitud: null,
        producto: null,
        cantidad: '1',
        precioVenta: '',
      },
    ]);
  };

  const resumenCoincidencias = useMemo(() => {
    const conCoincidencia = filas.filter((f) => f.producto && (f.similitud ?? 0) >= UMBRAL_COINCIDENCIA).length;
    const dudosos = filas.filter((f) => !f.producto || (f.similitud ?? 0) < UMBRAL_COINCIDENCIA).length;
    return { total: filas.length, conCoincidencia, dudosos };
  }, [filas]);

  const validarYConfirmar = () => {
    const nuevosErrores: string[] = [];
    if (!fechaEvento) {
      nuevosErrores.push('Debes indicar la fecha del recibo antes de guardar.');
    }

    const items: { productoId: string; cantidad: number; precioVenta?: number }[] = [];
    filas.forEach((fila, indice) => {
      const cantidad = Number(fila.cantidad);
      if (fila.descripcion.trim() === '' && !fila.producto) {
        return; // fila vacía añadida manualmente y sin usar
      }
      if (!fila.producto) {
        nuevosErrores.push(`Ítem ${indice + 1}: asigna un producto del catálogo.`);
        return;
      }
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        nuevosErrores.push(`Ítem ${indice + 1}: la cantidad debe ser mayor a 0.`);
        return;
      }
      const precio = fila.precioVenta.trim() === '' ? undefined : Number(fila.precioVenta);
      if (precio !== undefined && (!Number.isFinite(precio) || precio < 0)) {
        nuevosErrores.push(`Ítem ${indice + 1}: el precio de venta no puede ser negativo.`);
        return;
      }
      items.push({ productoId: fila.producto.id, cantidad, ...(precio !== undefined ? { precioVenta: precio } : {}) });
    });

    if (items.length === 0 && nuevosErrores.length === 0) {
      nuevosErrores.push('Agrega al menos un ítem para confirmar la ingesta.');
    }

    setErrores(nuevosErrores);
    if (nuevosErrores.length > 0) return;

    confirmar.mutate({ fechaEvento, items });
  };

  const analizando = estado !== 'idle';

  if (fase === 'confirmada' && confirmacion) {
    return (
      <div className="space-y-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
          <FileScan className="h-6 w-6 text-primary" />
          Ingesta asistida por IA
        </h1>
        <Alert variant="success">
          <CheckCircle2 className="h-5 w-5" />
          <AlertTitle>Ingesta confirmada</AlertTitle>
          <AlertDescription>
            {confirmacion.yaConfirmada
              ? 'Esta ingesta ya estaba confirmada; no se duplicaron transacciones.'
              : `Se registraron ${confirmacion.transaccionesCreadas} movimiento(s) de venta para la fecha ${fechaEvento}.`}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button type="button" onClick={reiniciar}>
            <Plus className="h-4 w-4" />
            Nueva ingesta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
          <FileScan className="h-6 w-6 text-primary" />
          Ingesta asistida por IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Captura un recibo, revisa los ítems y la fecha extraídos y confirma manualmente (HU-37).
        </p>
      </div>

      <Alert>
        <ShieldCheck className="h-5 w-5 text-primary" />
        <AlertTitle>Validación humana obligatoria</AlertTitle>
        <AlertDescription>
          La IA solo extrae información: ninguna transacción se guarda hasta que confirmes la fecha y los ítems.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Recibo
          </CardTitle>
          <CardDescription>Se comprime en el dispositivo antes de subirse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={analizando || fase === 'revision'}
              onClick={() => inputRef.current?.click()}
            >
              {analizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {fase === 'revision' ? 'Recibo cargado' : 'Adjuntar recibo'}
            </Button>
            {fileName && <span className="text-xs text-muted-foreground truncate max-w-[220px]">{fileName}</span>}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => seleccionarArchivo(e.target.files?.[0])}
              aria-label="Adjuntar imagen del recibo"
            />
          </div>

          {analizando && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {ESTADO_LABEL[estado as Exclude<EstadoAnalisis, 'idle'>]}
            </div>
          )}

          {analizar.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {analizar.error instanceof ApiError
                  ? analizar.error.message
                  : 'No se pudo analizar el recibo. Intenta con otra imagen.'}
              </AlertDescription>
            </Alert>
          )}

          {previewUrl && (
            <div className="h-40 w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
              <img src={previewUrl} alt="Vista previa del recibo" className="h-full w-full object-contain" />
            </div>
          )}
        </CardContent>
      </Card>

      {fase === 'revision' && ingesta && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Revisión de la extracción
              </CardTitle>
              <CardDescription>
                {resumenCoincidencias.total} ítem(s) · {resumenCoincidencias.conCoincidencia} con coincidencia ·{' '}
                {resumenCoincidencias.dudosos} por revisar.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="ingesta-fecha">
                Fecha del recibo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ingesta-fecha"
                type="date"
                value={fechaEvento}
                max={hoyISO()}
                onChange={(e) => setFechaEvento(e.target.value)}
                error={!fechaEvento ? 'Obligatoria' : undefined}
              />
            </div>

            <ul className="space-y-3">
              {filas.map((fila, indice) => {
                const conCoincidencia = Boolean(fila.producto) && (fila.similitud ?? 0) >= UMBRAL_COINCIDENCIA;
                return (
                  <li key={fila.key} className="rounded-lg border bg-card p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Ítem {indice + 1}
                        </p>
                        <p className="truncate text-sm text-foreground">
                          {fila.descripcion || 'Ítem manual'}
                        </p>
                        <div className="mt-1">
                          {fila.producto ? (
                            <Badge variant={conCoincidencia ? 'success' : 'freemium'} className="gap-1">
                              {conCoincidencia ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {fila.similitud != null ? `Similitud ${(fila.similitud * 100).toFixed(0)}%` : 'Coincidencia'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Sin coincidencia
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => quitarFila(fila.key)}
                        aria-label={`Quitar ítem ${indice + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`ingesta-producto-${fila.key}`}>Producto del catálogo</Label>
                        <ProductAutocomplete
                          id={`ingesta-producto-${fila.key}`}
                          value={fila.producto}
                          onChange={(producto) => actualizarFila(fila.key, { producto })}
                          detalleSeleccion={
                            fila.sugeridoNombre
                              ? `Coincidencia IA: ${fila.sugeridoNombre}${fila.similitud != null ? ` (${(fila.similitud * 100).toFixed(0)}%)` : ''}`
                              : 'Producto asignado manualmente'
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`ingesta-cantidad-${fila.key}`}>Cantidad</Label>
                        <Input
                          id={`ingesta-cantidad-${fila.key}`}
                          type="number"
                          min="0"
                          step="1"
                          value={fila.cantidad}
                          onChange={(e) => actualizarFila(fila.key, { cantidad: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`ingesta-precio-${fila.key}`}>Precio de venta (opcional)</Label>
                        <Input
                          id={`ingesta-precio-${fila.key}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={fila.precioVenta}
                          onChange={(e) => actualizarFila(fila.key, { precioVenta: e.target.value })}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
                <Plus className="h-4 w-4" />
                Agregar ítem
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={reiniciar}>
                <RotateCcw className="h-4 w-4" />
                Descartar
              </Button>
            </div>

            {errores.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Revisa antes de confirmar</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {errores.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {confirmar.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {confirmar.error instanceof ApiError
                    ? confirmar.error.message
                    : 'No se pudo confirmar la ingesta. Intenta nuevamente.'}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={validarYConfirmar}
                disabled={confirmar.isPending || !usuario}
                aria-label="Confirmar y guardar ingesta"
              >
                {confirmar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar y guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
