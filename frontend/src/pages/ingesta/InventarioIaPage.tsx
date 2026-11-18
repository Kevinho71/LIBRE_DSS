import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CapturaImagenCard } from '@/components/ingesta/CapturaImagenCard';
import { productosApi } from '@/api/productos.api';
import { ApiError } from '@/api/client';
import { useCapturaImagen } from '@/hooks/useCapturaImagen';
import { useOcultarNavInferior } from '@/context/LayoutChromeContext';
import { generarUuid } from '@/lib/idempotency';
import { formatCurrency } from '@/lib/format';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { ItemMatcheado } from '@libredss/shared';

const UMBRAL_COINCIDENCIA = 0.3;

type Fase = 'captura' | 'revision' | 'listo';

interface FilaInventario {
  key: string;
  /** Lo que la IA leyó, para comparar con la foto. */
  descripcion: string;
  nombre: string;
  precioVenta: string;
  costo: string;
  stock: string;
  /** Nombre del producto del catálogo con el que coincidió: si existe, no se vuelve a registrar. */
  existente: string | null;
}

function filaDesdeItem(item: ItemMatcheado): FilaInventario {
  const coincide = Boolean(item.productoId) && (item.similitud ?? 0) >= UMBRAL_COINCIDENCIA;
  return {
    key: generarUuid(),
    descripcion: item.descripcion,
    nombre: item.descripcion,
    precioVenta: item.precioUnitario != null ? String(item.precioUnitario) : '',
    costo: item.costoUnitario != null ? String(item.costoUnitario) : '',
    stock: item.cantidad ? String(item.cantidad) : '',
    existente: coincide ? item.nombreProducto ?? item.descripcion : null,
  };
}

/** Devuelve el primer problema de la fila (texto para el operador) o null si está lista para registrarse. */
function problemaDe(fila: FilaInventario): string | null {
  if (fila.nombre.trim().length < 2) return 'el nombre debe tener al menos 2 caracteres.';
  if (!(Number(fila.precioVenta) > 0)) return 'indica el precio de venta (mayor a 0).';
  if (!(Number(fila.costo) > 0)) return 'indica el costo de compra (mayor a 0).';
  if (fila.stock.trim() === '' || !(Number(fila.stock) >= 0)) return 'indica el stock (0 o más).';
  return null;
}

const esResuelta = (fila: FilaInventario) => fila.existente !== null || problemaDe(fila) === null;

/**
 * Escaneo de inventario con IA: fotografía una lista de productos y regístralos en el catálogo con su
 * stock, costo y precio. Es independiente de la ingesta de ventas: aquí nunca se crea una venta.
 */
export const InventarioIaPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [fase, setFase] = useState<Fase>('captura');
  const [filas, setFilas] = useState<FilaInventario[]>([]);
  const [abiertoKey, setAbiertoKey] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);
  const [creados, setCreados] = useState(0);
  const [fotoAbierta, setFotoAbierta] = useState(false);

  const captura = useCapturaImagen('inventario', (resultado) => {
    const nuevas = resultado.items.map(filaDesdeItem);
    setFilas(nuevas);
    setAbiertoKey(nuevas.find((f) => !esResuelta(f))?.key ?? null);
    setErrores([]);
    setFase('revision');
  });

  // Flujo enfocado: la barra fija de esta pantalla reemplaza a la navegación principal.
  useOcultarNavInferior(fase === 'revision');

  const porRegistrar = useMemo(() => filas.filter((f) => f.existente === null).length, [filas]);
  const yaExisten = filas.length - porRegistrar;

  const actualizar = (key: string, patch: Partial<FilaInventario>) =>
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  const siguientePendiente = (despuesDe: string) => {
    const indice = filas.findIndex((f) => f.key === despuesDe);
    return (
      filas.find((f, i) => i > indice && !esResuelta(f)) ?? filas.find((f) => f.key !== despuesDe && !esResuelta(f))
    );
  };

  const quitar = (key: string) => {
    const restantes = filas.filter((f) => f.key !== key);
    setFilas(restantes);
    if (abiertoKey === key) setAbiertoKey(restantes.find((f) => !esResuelta(f))?.key ?? null);
  };

  const agregar = () => {
    const key = generarUuid();
    setFilas((prev) => [
      ...prev,
      { key, descripcion: '', nombre: '', precioVenta: '', costo: '', stock: '1', existente: null },
    ]);
    setAbiertoKey(key);
  };

  const reiniciar = () => {
    captura.reiniciar();
    setFilas([]);
    setAbiertoKey(null);
    setErrores([]);
    setCreados(0);
    setFotoAbierta(false);
    setFase('captura');
  };

  const guardar = async () => {
    const nuevosErrores: string[] = [];
    let primerProblema: string | null = null;
    const pendientes: FilaInventario[] = [];

    filas.forEach((fila, indice) => {
      if (fila.existente !== null) return;
      const vacia = fila.nombre.trim() === '' && fila.costo.trim() === '' && fila.precioVenta.trim() === '';
      if (vacia) return;
      const problema = problemaDe(fila);
      if (problema) {
        nuevosErrores.push(`Producto ${indice + 1}: ${problema}`);
        primerProblema ??= fila.key;
        return;
      }
      pendientes.push(fila);
    });

    if (pendientes.length === 0 && nuevosErrores.length === 0) {
      nuevosErrores.push('No hay productos nuevos para registrar.');
    }
    setErrores(nuevosErrores);
    if (nuevosErrores.length > 0) {
      if (primerProblema) setAbiertoKey(primerProblema);
      return;
    }

    setCreando(true);
    try {
      for (const fila of pendientes) {
        const creado = await productosApi.crear({
          nombre: fila.nombre.trim(),
          costoUnitario: Number(fila.costo),
          precioVenta: Number(fila.precioVenta),
          stockActual: Number(fila.stock),
          origenDato: 'ocr',
        });
        // Se marca como existente apenas se crea: si algo falla más adelante, reintentar no lo duplica.
        actualizar(fila.key, { existente: creado.nombre });
        setCreados((n) => n + 1);
      }
      void queryClient.invalidateQueries({ queryKey: ['productos'] });
      setFase('listo');
    } catch (err) {
      setErrores([err instanceof ApiError ? err.message : 'No se pudo registrar un producto. Intenta nuevamente.']);
    } finally {
      setCreando(false);
    }
  };

  const encabezado = (
    <div className="space-y-1">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={ROUTES.ingesta}>
          <ArrowLeft className="h-4 w-4" />
          IA
        </Link>
      </Button>
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
        <Boxes className="h-6 w-6 text-primary" />
        Escanear inventario
      </h1>
    </div>
  );

  if (fase === 'listo') {
    return (
      <div className="space-y-6">
        {encabezado}
        <Alert variant="success">
          <CheckCircle2 className="h-5 w-5" />
          <AlertTitle>Inventario registrado</AlertTitle>
          <AlertDescription>
            Se registraron {creados} producto(s) nuevo(s) en el catálogo, sin ninguna venta.
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={reiniciar}>
            <Plus className="h-4 w-4" />
            Escanear otro inventario
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.catalogo}>Ver catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (fase === 'captura') {
    return (
      <div className="space-y-6">
        {encabezado}
        <p className="text-sm text-muted-foreground">
          Fotografía una lista de productos o tu estante. La IA lee nombre, stock y, si se ven, costo y precio; tú
          revisas y confirmas. No se registra ninguna venta.
        </p>
        <Alert>
          <ShieldCheck className="h-5 w-5 text-primary" />
          <AlertTitle>Validación humana obligatoria</AlertTitle>
          <AlertDescription>La IA solo extrae información: ningún producto se crea hasta que confirmes.</AlertDescription>
        </Alert>
        <CapturaImagenCard
          captura={captura}
          titulo="Foto del inventario"
          descripcion="Se comprime en el dispositivo antes de subirse."
          textoGaleria="Adjuntar imagen"
          ariaGaleria="Adjuntar imagen del inventario"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {encabezado}

      <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
        {captura.previewUrl && (
          <button
            type="button"
            onClick={() => setFotoAbierta(true)}
            className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted"
            aria-label="Ver foto original"
          >
            <img src={captura.previewUrl} alt="Miniatura del inventario" className="h-full w-full object-cover" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Revisión del inventario
          </p>
          <p className="text-xs text-muted-foreground">
            {porRegistrar} por registrar · {yaExisten} ya existen en el catálogo.
          </p>
          {captura.previewUrl && (
            <button
              type="button"
              onClick={() => setFotoAbierta(true)}
              className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Ver foto original
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {filas.map((fila, indice) => {
          const resuelta = esResuelta(fila);
          const abierta = abiertoKey === fila.key;
          const precio = Number(fila.precioVenta);
          const costo = Number(fila.costo);
          return (
            <li key={fila.key} className="overflow-hidden rounded-lg border bg-card">
              <button
                type="button"
                aria-expanded={abierta}
                onClick={() => setAbiertoKey(abierta ? null : fila.key)}
                className="flex min-h-14 w-full items-center gap-3 p-3 text-left"
              >
                {resuelta ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Producto listo" />
                ) : (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-label="Producto por completar" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Producto {indice + 1}
                    {fila.existente !== null ? ' · Ya existe' : ''}
                  </p>
                  <p className="truncate text-sm font-medium text-foreground">{fila.existente ?? (fila.nombre || 'Producto sin nombre')}</p>
                  {!abierta && fila.existente === null && (
                    <p className="text-xs text-muted-foreground">
                      Stock {fila.stock || '—'} · Costo {costo > 0 ? formatCurrency(costo) : '—'} · Precio{' '}
                      {precio > 0 ? formatCurrency(precio) : '—'}
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

                  {fila.existente !== null ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Ya está en el catálogo como «{fila.existente}». No se vuelve a registrar.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => actualizar(fila.key, { existente: null })}
                      >
                        No es ese: registrarlo como nuevo
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor={`inv-nombre-${fila.key}`}>Nombre *</Label>
                        <Input
                          id={`inv-nombre-${fila.key}`}
                          value={fila.nombre}
                          maxLength={255}
                          autoComplete="off"
                          onChange={(e) => actualizar(fila.key, { nombre: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`inv-precio-${fila.key}`}>Precio de venta (Bs) *</Label>
                        <Input
                          id={`inv-precio-${fila.key}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={fila.precioVenta}
                          onChange={(e) => actualizar(fila.key, { precioVenta: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`inv-costo-${fila.key}`}>Costo de compra (Bs) *</Label>
                        <Input
                          id={`inv-costo-${fila.key}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={fila.costo}
                          onChange={(e) => actualizar(fila.key, { costo: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor={`inv-stock-${fila.key}`}>Stock actual *</Label>
                        <Input
                          id={`inv-stock-${fila.key}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={fila.stock}
                          onChange={(e) => actualizar(fila.key, { stock: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => quitar(fila.key)}
                      aria-label={`Quitar producto ${indice + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Quitar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAbiertoKey(siguientePendiente(fila.key)?.key ?? null)}
                    >
                      Listo, siguiente
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Button type="button" variant="outline" size="sm" onClick={agregar}>
        <Plus className="h-4 w-4" />
        Agregar producto
      </Button>

      {errores.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Revisa antes de guardar</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {errores.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Barra fija: reemplaza a la navegación principal durante la revisión. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:left-64"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Productos a registrar
            </p>
            <p className="truncate text-lg font-extrabold text-foreground" aria-live="polite">
              {porRegistrar}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={reiniciar}>
            <RotateCcw className="h-4 w-4" />
            Descartar
          </Button>
          <Button
            type="button"
            onClick={() => void guardar()}
            disabled={creando}
            aria-label="Guardar productos del inventario"
          >
            {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Guardar productos
          </Button>
        </div>
      </div>

      {captura.previewUrl && (
        <Dialog open={fotoAbierta} onOpenChange={setFotoAbierta} className="max-w-2xl" aria-label="Foto original del inventario">
          <DialogHeader>
            <DialogTitle>Foto original</DialogTitle>
          </DialogHeader>
          <img
            src={captura.previewUrl}
            alt="Foto original del inventario"
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        </Dialog>
      )}
    </div>
  );
};
