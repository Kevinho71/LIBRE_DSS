import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileScan,
  Image as ImageIcon,
  Loader2,
  Pencil,
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
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductAutocomplete } from '@/components/transacciones/ProductAutocomplete';
import { NuevoProductoSheet, type NuevoProductoValores } from '@/components/ingesta/NuevoProductoSheet';
import { useSugerenciasProducto } from '@/hooks/useSugerenciasProducto';
import { useOcultarNavInferior } from '@/context/LayoutChromeContext';
import { ingestaApi } from '@/api/ingesta.api';
import { storageApi } from '@/api/storage.api';
import { productosApi } from '@/api/productos.api';
import { ApiError } from '@/api/client';
import { comprimirImagen, esImagenValida, MAX_TAMANO_ENTRADA_BYTES, type FotoComprimida } from '@/lib/imageCompression';
import { generarUuid } from '@/lib/idempotency';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, hoyISO } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/routes';
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

/** Datos para dar de alta en el catálogo un ítem que la IA no logró emparejar. */
interface ProductoNuevoDraft {
  nombre: string;
  /** Stock disponible ANTES de registrar esta venta (la venta lo descuenta). */
  stock: string;
  costo: string;
}

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
  nuevo: ProductoNuevoDraft | null;
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
    nuevo: null,
  };
}

/** Una fila está resuelta si tiene coincidencia confiable, producto elegido a mano o alta de producto nuevo. */
function esResuelta(fila: FilaIngesta): boolean {
  if (fila.nuevo) return true;
  return Boolean(fila.producto) && (fila.similitud == null || fila.similitud >= UMBRAL_COINCIDENCIA);
}

function precioEfectivo(fila: FilaIngesta): number | null {
  if (fila.precioVenta.trim() !== '') {
    const n = Number(fila.precioVenta);
    return Number.isFinite(n) ? n : null;
  }
  return fila.producto?.precioVenta ?? null;
}

function subtotalDe(fila: FilaIngesta): number | null {
  const cantidad = Number(fila.cantidad);
  const precio = precioEfectivo(fila);
  if (!Number.isFinite(cantidad) || cantidad <= 0 || precio == null) return null;
  return cantidad * precio;
}

const Sugerencias: React.FC<{ descripcion: string; onElegir: (producto: ProductoBusqueda) => void }> = ({
  descripcion,
  onElegir,
}) => {
  const sugerencias = useSugerenciasProducto(descripcion, descripcion.trim().length >= 3);
  if (sugerencias.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Sugerencias:</p>
      <div className="flex flex-wrap gap-2">
        {sugerencias.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onElegir(p)}
            className="min-h-10 rounded-full border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            {p.nombre}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Pantalla Human-in-the-Loop de ingesta asistida por IA (HU-37). El operador
 * adjunta un recibo, revisa y corrige los ítems y la fecha extraídos, y solo
 * entonces confirma. Sin confirmación no se persiste ninguna transacción.
 */
export const ReceiptReviewPage: React.FC = () => {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);

  const [fase, setFase] = useState<Fase>('seleccion');
  const [estado, setEstado] = useState<EstadoAnalisis>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [ingesta, setIngesta] = useState<ResultadoExtraccion | null>(null);
  const [fechaEvento, setFechaEvento] = useState('');
  const [filas, setFilas] = useState<FilaIngesta[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmacion, setConfirmacion] = useState<ResultadoConfirmacion | null>(null);
  const [creandoProductos, setCreandoProductos] = useState(false);
  const [abiertoKey, setAbiertoKey] = useState<string | null>(null);
  const [hojaKey, setHojaKey] = useState<string | null>(null);
  const [fotoAbierta, setFotoAbierta] = useState(false);

  // Flujo enfocado: la barra fija inferior de esta pantalla reemplaza a la navegación principal.
  useOcultarNavInferior(fase === 'revision');

  const analizar = useMutation({
    mutationFn: async (comprimida: FotoComprimida) => {
      setEstado('subiendo');
      const presigned = await storageApi.solicitarPresignedUrl(comprimida.filename, comprimida.contentType);
      await storageApi.subirArchivo(presigned.uploadUrl, comprimida.blob, comprimida.contentType);
      setEstado('analizando');
      return ingestaApi.extraer({ s3Key: presigned.key });
    },
    onSuccess: (resultado) => {
      setIngesta(resultado);
      setFechaEvento(resultado.fechaSugerida ?? '');
      const nuevasFilas = resultado.items.map(filaDesdeItem);
      setFilas(nuevasFilas);
      setAbiertoKey(nuevasFilas.find((f) => !esResuelta(f))?.key ?? null);
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

  const seleccionarArchivo = async (file: File | undefined) => {
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

    setEstado('comprimiendo');
    try {
      // La vista previa usa el blob ya comprimido en Canvas (no el archivo original),
      // así se muestra exactamente lo que se sube y no se inyecta el File en el DOM.
      const comprimida = await comprimirImagen(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(comprimida.blob));
      setFileName(comprimida.filename);
      analizar.mutate(comprimida);
    } catch {
      setEstado('idle');
      setErrores(['No se pudo procesar la imagen. Intenta con otra fotografía.']);
    }
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
    setAbiertoKey(null);
    setHojaKey(null);
    setFotoAbierta(false);
    setFase('seleccion');
    if (inputRef.current) inputRef.current.value = '';
    if (camaraRef.current) camaraRef.current.value = '';
  };

  const actualizarFila = (key: string, patch: Partial<FilaIngesta>) => {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  };

  /** Aplica un cambio resolutivo y, si la fila queda resuelta, colapsa y abre la siguiente pendiente. */
  const aplicarYAvanzar = (key: string, patch: Partial<FilaIngesta>) => {
    const actualizadas = filas.map((f) => (f.key === key ? { ...f, ...patch } : f));
    setFilas(actualizadas);
    const indice = actualizadas.findIndex((f) => f.key === key);
    if (indice >= 0 && esResuelta(actualizadas[indice]!)) {
      const siguiente =
        actualizadas.find((f, i) => i > indice && !esResuelta(f)) ?? actualizadas.find((f) => !esResuelta(f));
      setAbiertoKey(siguiente?.key ?? null);
    }
  };

  const quitarFila = (key: string) => {
    const restantes = filas.filter((f) => f.key !== key);
    setFilas(restantes);
    if (abiertoKey === key) setAbiertoKey(restantes.find((f) => !esResuelta(f))?.key ?? null);
  };

  const agregarFila = () => {
    const key = generarUuid();
    setFilas((prev) => [
      ...prev,
      {
        key,
        descripcion: '',
        sugeridoId: null,
        sugeridoNombre: null,
        sugeridoSku: null,
        similitud: null,
        producto: null,
        cantidad: '1',
        precioVenta: '',
        nuevo: null,
      },
    ]);
    setAbiertoKey(key);
  };

  const guardarProductoNuevo = (key: string, valores: NuevoProductoValores) => {
    aplicarYAvanzar(key, {
      producto: null,
      precioVenta: valores.precioVenta,
      nuevo: { nombre: valores.nombre, stock: valores.stock, costo: valores.costo },
    });
  };

  const totalRecibo = useMemo(
    () => filas.reduce((suma, fila) => suma + (subtotalDe(fila) ?? 0), 0),
    [filas]
  );

  const resumenCoincidencias = useMemo(() => {
    const conCoincidencia = filas.filter((f) => f.producto && (f.similitud ?? 0) >= UMBRAL_COINCIDENCIA).length;
    const dudosos = filas.filter((f) => !f.nuevo && (!f.producto || (f.similitud ?? 0) < UMBRAL_COINCIDENCIA)).length;
    return { total: filas.length, conCoincidencia, dudosos };
  }, [filas]);

  const validarYConfirmar = async () => {
    const nuevosErrores: string[] = [];
    if (!fechaEvento) {
      nuevosErrores.push('Debes indicar la fecha del recibo antes de guardar.');
    }

    // Cada entrada conserva la fila de origen para completar el productoId de los productos nuevos.
    const pendientes: { fila: FilaIngesta; cantidad: number; precio?: number }[] = [];
    let primerProblema: string | null = null;
    const marcar = (mensaje: string, key: string) => {
      nuevosErrores.push(mensaje);
      primerProblema ??= key;
    };
    filas.forEach((fila, indice) => {
      const cantidad = Number(fila.cantidad);
      if (fila.descripcion.trim() === '' && !fila.producto && !fila.nuevo) {
        return; // fila vacía añadida manualmente y sin usar
      }
      if (!fila.producto && !fila.nuevo) {
        marcar(`Ítem ${indice + 1}: asigna un producto del catálogo o agrégalo como nuevo.`, fila.key);
        return;
      }
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        marcar(`Ítem ${indice + 1}: la cantidad debe ser mayor a 0.`, fila.key);
        return;
      }
      const precio = fila.precioVenta.trim() === '' ? undefined : Number(fila.precioVenta);
      if (precio !== undefined && (!Number.isFinite(precio) || precio < 0)) {
        marcar(`Ítem ${indice + 1}: el precio de venta no puede ser negativo.`, fila.key);
        return;
      }
      if (fila.nuevo) {
        const costo = Number(fila.nuevo.costo);
        const stock = Number(fila.nuevo.stock);
        if (fila.nuevo.nombre.trim().length < 2) {
          marcar(`Ítem ${indice + 1}: el nombre del producto nuevo debe tener al menos 2 caracteres.`, fila.key);
          return;
        }
        if (precio === undefined || precio <= 0) {
          marcar(`Ítem ${indice + 1}: confirma el precio de venta (mayor a 0) del producto nuevo.`, fila.key);
          return;
        }
        if (fila.nuevo.costo.trim() === '' || !Number.isFinite(costo) || costo <= 0) {
          marcar(`Ítem ${indice + 1}: indica el costo de compra (mayor a 0) del producto nuevo.`, fila.key);
          return;
        }
        if (fila.nuevo.stock.trim() === '' || !Number.isFinite(stock) || stock < 0) {
          marcar(`Ítem ${indice + 1}: indica el stock disponible (0 o más) del producto nuevo.`, fila.key);
          return;
        }
        if (stock < cantidad) {
          marcar(
            `Ítem ${indice + 1}: el stock (${stock}) no alcanza para vender ${cantidad}. Indica el stock disponible antes de esta venta.`,
            fila.key,
          );
          return;
        }
      }
      pendientes.push({ fila, cantidad, ...(precio !== undefined ? { precio } : {}) });
    });

    if (pendientes.length === 0 && nuevosErrores.length === 0) {
      nuevosErrores.push('Agrega al menos un ítem para confirmar la ingesta.');
    }

    setErrores(nuevosErrores);
    if (nuevosErrores.length > 0) {
      if (primerProblema) setAbiertoKey(primerProblema);
      return;
    }

    // Los productos nuevos se crean recién ahora (descartar la ingesta no deja basura en el catálogo).
    // Cada uno queda asignado a su fila apenas se crea: si algo falla y se reintenta, no se duplica.
    setCreandoProductos(true);
    try {
      const items: { productoId: string; cantidad: number; precioVenta?: number }[] = [];
      for (const { fila, cantidad, precio } of pendientes) {
        let productoId = fila.producto?.id;
        if (!productoId && fila.nuevo) {
          const creado = await productosApi.crear({
            nombre: fila.nuevo.nombre.trim(),
            costoUnitario: Number(fila.nuevo.costo),
            precioVenta: precio ?? 0,
            stockActual: Number(fila.nuevo.stock),
            origenDato: 'manual',
          });
          productoId = creado.id;
          const asignado: ProductoBusqueda = {
            id: creado.id,
            sku: creado.sku,
            nombre: creado.nombre,
            precioVenta: creado.precioVenta,
            costoUnitario: creado.costoUnitario,
            stockActual: creado.stockActual,
            unidadMedida: creado.unidadMedida,
            factorConversion: creado.factorConversion,
            unidadCompra: creado.unidadCompra,
          };
          actualizarFila(fila.key, { producto: asignado, nuevo: null, similitud: null, sugeridoNombre: null });
          void queryClient.invalidateQueries({ queryKey: ['productos'] });
        }
        items.push({ productoId: productoId!, cantidad, ...(precio !== undefined ? { precioVenta: precio } : {}) });
      }
      confirmar.mutate({ fechaEvento, items });
    } catch (err) {
      setErrores([err instanceof ApiError ? err.message : 'No se pudo crear un producto nuevo. Intenta nuevamente.']);
    } finally {
      setCreandoProductos(false);
    }
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

  const hojaFila = hojaKey ? filas.find((f) => f.key === hojaKey) ?? null : null;
  const enRevision = fase === 'revision' && ingesta;

  return (
    <div className={cn('space-y-6', enRevision && 'pb-28')}>
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={ROUTES.ingesta}>
            <ArrowLeft className="h-4 w-4" />
            IA
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
          <FileScan className="h-6 w-6 text-primary" />
          Vender con IA
        </h1>
        {!enRevision && (
          <p className="text-sm text-muted-foreground">
            Captura un recibo, revisa los ítems y la fecha extraídos y confirma manualmente (HU-37).
          </p>
        )}
      </div>

      {!enRevision && (
        <Alert>
          <ShieldCheck className="h-5 w-5 text-primary" />
          <AlertTitle>Validación humana obligatoria</AlertTitle>
          <AlertDescription>
            La IA solo extrae información: ninguna transacción se guarda hasta que confirmes la fecha y los ítems.
          </AlertDescription>
        </Alert>
      )}

      {!enRevision && (
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
              <Button type="button" variant="outline" disabled={analizando} onClick={() => inputRef.current?.click()}>
                {analizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Adjuntar recibo
              </Button>
              <Button type="button" disabled={analizando} onClick={() => camaraRef.current?.click()}>
                <Camera className="h-4 w-4" />
                Tomar foto
              </Button>
              {fileName && <span className="text-xs text-muted-foreground truncate max-w-[220px]">{fileName}</span>}
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
      )}

      {/* Los inputs viven siempre en el DOM: se reutilizan al reiniciar. */}
      {/* capture="environment" abre directamente la cámara trasera del celular */}
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void seleccionarArchivo(e.target.files?.[0])}
        aria-label="Tomar foto del cuaderno o recibo"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void seleccionarArchivo(e.target.files?.[0])}
        aria-label="Adjuntar imagen del recibo"
      />

      {enRevision && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            {previewUrl && (
              <button
                type="button"
                onClick={() => setFotoAbierta(true)}
                className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted"
                aria-label="Ver foto original"
              >
                <img src={previewUrl} alt="Miniatura del recibo" className="h-full w-full object-cover" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Revisión de la extracción
              </p>
              <p className="text-xs text-muted-foreground">
                {resumenCoincidencias.total} ítem(s) · {resumenCoincidencias.conCoincidencia} con coincidencia ·{' '}
                {resumenCoincidencias.dudosos} por revisar.
              </p>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => setFotoAbierta(true)}
                  className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Ver foto original
                </button>
              )}
            </div>
          </div>

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

          <ul className="space-y-2">
            {filas.map((fila, indice) => {
              const resuelta = esResuelta(fila);
              const abierta = abiertoKey === fila.key;
              const nombreMostrado = fila.producto?.nombre ?? fila.nuevo?.nombre ?? (fila.descripcion || 'Ítem manual');
              const subtotal = subtotalDe(fila);
              const precio = precioEfectivo(fila);
              return (
                <li key={fila.key} className="overflow-hidden rounded-lg border bg-card">
                  <button
                    type="button"
                    aria-expanded={abierta}
                    onClick={() => setAbiertoKey(abierta ? null : fila.key)}
                    className="flex min-h-14 w-full items-center gap-3 p-3 text-left"
                  >
                    {resuelta ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Ítem validado" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-label="Ítem por revisar" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Ítem {indice + 1}
                        {fila.nuevo ? ' · Producto nuevo' : ''}
                      </p>
                      <p className="truncate text-sm font-medium text-foreground">{nombreMostrado}</p>
                      {!abierta && (
                        <p className="text-xs text-muted-foreground">
                          {fila.cantidad || '0'} × {precio != null ? formatCurrency(precio) : '—'}
                          {subtotal != null ? ` = ${formatCurrency(subtotal)}` : ''}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', abierta && 'rotate-180')}
                    />
                  </button>

                  {abierta && (
                    <div className="space-y-3 border-t p-3">
                      {fila.descripcion && (
                        <p className="text-xs text-muted-foreground">
                          La IA leyó: <span className="font-medium text-foreground">«{fila.descripcion}»</span>
                        </p>
                      )}

                      {fila.nuevo ? (
                        <div className="flex items-start justify-between gap-2 rounded-md border border-dashed bg-muted/30 p-3">
                          <div className="min-w-0 text-sm">
                            <p className="font-medium text-foreground">{fila.nuevo.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              Costo {formatCurrency(Number(fila.nuevo.costo))} · Stock {fila.nuevo.stock} · se crea al
                              confirmar
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button type="button" variant="outline" size="sm" onClick={() => setHojaKey(fila.key)}>
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => actualizarFila(fila.key, { nuevo: null })}
                            >
                              Quitar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {!resuelta && (
                            <Badge variant="freemium" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {fila.producto ? 'Coincidencia dudosa' : 'Sin coincidencia aún'}
                            </Badge>
                          )}
                          <Label htmlFor={`ingesta-producto-${fila.key}`}>Producto del catálogo</Label>
                          <ProductAutocomplete
                            id={`ingesta-producto-${fila.key}`}
                            value={fila.producto}
                            onChange={(producto) =>
                              aplicarYAvanzar(fila.key, { producto, nuevo: null, similitud: null })
                            }
                            detalleSeleccion={
                              fila.sugeridoNombre && fila.similitud != null
                                ? `Coincidencia IA: ${fila.sugeridoNombre} (${(fila.similitud * 100).toFixed(0)}%)`
                                : 'Producto asignado manualmente'
                            }
                          />
                          {!fila.producto && (
                            <Sugerencias
                              descripcion={fila.descripcion}
                              onElegir={(producto) =>
                                aplicarYAvanzar(fila.key, { producto, nuevo: null, similitud: null })
                              }
                            />
                          )}
                          {!fila.producto && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setHojaKey(fila.key)}>
                              <Plus className="h-4 w-4" />
                              Producto nuevo
                            </Button>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`ingesta-cantidad-${fila.key}`}>Cantidad</Label>
                          <Input
                            id={`ingesta-cantidad-${fila.key}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="1"
                            value={fila.cantidad}
                            onChange={(e) => actualizarFila(fila.key, { cantidad: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`ingesta-precio-${fila.key}`}>
                            {fila.nuevo ? 'Precio de venta (Bs) *' : 'Precio de venta (opcional)'}
                          </Label>
                          <Input
                            id={`ingesta-precio-${fila.key}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={fila.precioVenta}
                            onChange={(e) => actualizarFila(fila.key, { precioVenta: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => quitarFila(fila.key)}
                          aria-label={`Quitar ítem ${indice + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Quitar ítem
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
            <Plus className="h-4 w-4" />
            Agregar ítem
          </Button>

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
        </div>
      )}

      {/* Barra fija: reemplaza a la navegación principal durante la revisión y muestra el total en vivo. */}
      {enRevision && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:left-64"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total del recibo</p>
              <p className="truncate text-lg font-extrabold text-foreground" aria-live="polite">
                {formatCurrency(totalRecibo)}
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={reiniciar}>
              <RotateCcw className="h-4 w-4" />
              Descartar
            </Button>
            <Button
              type="button"
              onClick={() => void validarYConfirmar()}
              disabled={confirmar.isPending || creandoProductos || !usuario}
              aria-label="Confirmar y guardar ingesta"
            >
              {confirmar.isPending || creandoProductos ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmar y guardar
            </Button>
          </div>
        </div>
      )}

      {hojaFila && (
        <NuevoProductoSheet
          open
          onOpenChange={(abierto) => {
            if (!abierto) setHojaKey(null);
          }}
          inicial={{
            nombre: hojaFila.nuevo?.nombre ?? hojaFila.descripcion.trim(),
            precioVenta: hojaFila.precioVenta,
            costo: hojaFila.nuevo?.costo ?? '',
            stock: hojaFila.nuevo?.stock ?? '',
          }}
          cantidad={Number(hojaFila.cantidad) || 0}
          onGuardar={(valores) => guardarProductoNuevo(hojaFila.key, valores)}
        />
      )}

      {previewUrl && (
        <Dialog open={fotoAbierta} onOpenChange={setFotoAbierta} className="max-w-2xl" aria-label="Foto original del recibo">
          <DialogHeader>
            <DialogTitle>Foto original</DialogTitle>
          </DialogHeader>
          <img src={previewUrl} alt="Foto original del recibo" className="max-h-[70vh] w-full rounded-md object-contain" />
        </Dialog>
      )}
    </div>
  );
};
