import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductAutocomplete } from '@/components/transacciones/ProductAutocomplete';
import { ApiError } from '@/api/client';
import type { AlertaReabastecimiento } from '@/api/transacciones.api';
import type { ProductoBusqueda } from '@/api/productos.api';
import { registrarVenta } from '@/offline/registrarVenta';
import { useSalesSync } from '@/offline/useSalesSync';
import { formatCurrency, hoyISO } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

interface ItemCarrito {
  producto: ProductoBusqueda;
  cantidad: number;
  precioVenta: number;
}

/**
 * Venta ágil pensada para el celular: buscar, tocar el resultado (agrega 1 unidad),
 * ajustar con +/- y confirmar con un toque en la barra inferior.
 * Forma de pago, fecha y observación quedan en "Más opciones" con valores por defecto.
 */
export const VentaPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { refrescarPendientes } = useSalesSync();

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [estadoPago, setEstadoPago] = useState<'contado' | 'credito_pendiente'>('contado');
  const [fechaEvento, setFechaEvento] = useState(hoyISO());
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [alertas, setAlertas] = useState<AlertaReabastecimiento[]>([]);
  const [enviando, setEnviando] = useState(false);

  const total = useMemo(
    () => carrito.reduce((acc, item) => acc + item.cantidad * item.precioVenta, 0),
    [carrito]
  );

  const mensajeStock = (p: ProductoBusqueda) =>
    `Stock insuficiente de "${p.nombre}": disponible ${p.stockActual} ${p.unidadMedida}.`;

  /** Un toque sobre el resultado de la búsqueda agrega 1 unidad. */
  const agregarProducto = (producto: ProductoBusqueda | null) => {
    if (!producto) return;
    setError(null);
    setExito(null);
    const yaEnCarrito = carrito.find((i) => i.producto.id === producto.id)?.cantidad ?? 0;
    if (yaEnCarrito + 1 > producto.stockActual) {
      setError(mensajeStock(producto));
      return;
    }
    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { producto, cantidad: 1, precioVenta: producto.precioVenta }];
    });
  };

  const quitar = (productoId: string) => setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId));

  /** Botones +/-: bajan hasta 1 (para quitar está el basurero) y suben hasta el stock disponible. */
  const cambiarCantidad = (item: ItemCarrito, delta: number) => {
    const nueva = item.cantidad + delta;
    if (nueva < 1) return;
    if (nueva > item.producto.stockActual) {
      setError(mensajeStock(item.producto));
      return;
    }
    setError(null);
    setCarrito((prev) => prev.map((i) => (i.producto.id === item.producto.id ? { ...i, cantidad: nueva } : i)));
  };

  const actualizarCantidad = (productoId: string, valor: string) => {
    const cant = Number(valor);
    setCarrito((prev) =>
      prev.map((i) =>
        i.producto.id === productoId
          ? { ...i, cantidad: Number.isFinite(cant) && cant > 0 && cant <= i.producto.stockActual ? cant : i.cantidad }
          : i
      )
    );
  };

  const actualizarPrecio = (productoId: string, valor: string) => {
    const precio = Number(valor);
    setCarrito((prev) =>
      prev.map((i) =>
        i.producto.id === productoId
          ? { ...i, precioVenta: Number.isFinite(precio) && precio >= 0 ? precio : i.precioVenta }
          : i
      )
    );
  };

  const limpiarFormulario = () => {
    setCarrito([]);
    setMotivo('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setExito(null);
    setAlertas([]);

    if (carrito.length === 0) {
      setError('Agrega al menos un producto a la nota de venta.');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await registrarVenta({
        items: carrito.map((i) => ({
          productoId: i.producto.id,
          cantidad: i.cantidad,
          precioVenta: i.precioVenta,
        })),
        estadoPago,
        fechaEvento,
        motivo: motivo.trim() || undefined,
      });

      if (resultado.via === 'online') {
        setAlertas(resultado.resultado.alertas ?? []);
        setExito(
          `Nota de venta ${resultado.notaId.slice(0, 8)} registrada con ${resultado.resultado.totalItems ?? carrito.length} ítem(s).`
        );
        await queryClient.invalidateQueries({ queryKey: ['transacciones'] });
      } else {
        setExito('Sin conexión: la nota quedó guardada en el dispositivo y se sincronizará automáticamente.');
        await refrescarPendientes();
      }
      limpiarFormulario();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo registrar la venta. Intenta nuevamente.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={ROUTES.transacciones}>
            <ArrowLeft className="h-4 w-4" />
            Kardex
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Venta ágil
        </h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {exito && (
        <Alert variant="success">
          <AlertTitle>Venta registrada</AlertTitle>
          <AlertDescription>{exito}</AlertDescription>
        </Alert>
      )}
      {alertas.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>Conviene pedir (alerta ROP)</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {alertas.map((a) => (
                <li key={a.productoId}>
                  <strong>{a.nombre}</strong>: posición {a.posicionInventario} bajo el ROP {a.ropCalculado}. Sugerido ordenar{' '}
                  {a.eoqSugerido} unidades.
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="producto-venta">Buscar producto (toca el resultado para agregarlo)</Label>
          <ProductAutocomplete id="producto-venta" value={null} onChange={agregarProducto} />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detalle de la nota ({carrito.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {carrito.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aún no agregaste productos a la nota.</p>
            ) : (
              carrito.map((item) => (
                <div key={item.producto.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{item.producto.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.producto.sku ? `SKU ${item.producto.sku} · ` : ''}Stock {item.producto.stockActual}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar ${item.producto.nombre}`}
                      onClick={() => quitar(item.producto.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Menos ${item.producto.nombre}`}
                        onClick={() => cambiarCantidad(item, -1)}
                        disabled={item.cantidad <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={1}
                        step="any"
                        aria-label={`Cantidad de ${item.producto.nombre}`}
                        value={item.cantidad}
                        onChange={(e) => actualizarCantidad(item.producto.id, e.target.value)}
                        className="w-16 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Más ${item.producto.nombre}`}
                        onClick={() => cambiarCantidad(item, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        aria-label={`Precio de ${item.producto.nombre}`}
                        value={item.precioVenta}
                        onChange={(e) => actualizarPrecio(item.producto.id, e.target.value)}
                        className="w-20 text-right"
                      />
                      <span className="w-20 text-right font-semibold text-foreground">
                        {formatCurrency(item.cantidad * item.precioVenta)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <details className="rounded-md border bg-muted/30 p-3">
          <summary className="cursor-pointer select-none text-sm font-medium text-foreground">
            Más opciones (forma de pago, fecha, observación)
          </summary>
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="estado-pago">Forma de pago</Label>
              <Select
                id="estado-pago"
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value as 'contado' | 'credito_pendiente')}
              >
                <option value="contado">Contado</option>
                <option value="credito_pendiente">Crédito pendiente (&quot;al fiado&quot;)</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha-venta">Fecha del evento</Label>
              <Input
                id="fecha-venta"
                type="date"
                value={fechaEvento}
                max={hoyISO()}
                onChange={(e) => setFechaEvento(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motivo-venta">Observación (opcional)</Label>
              <Textarea
                id="motivo-venta"
                value={motivo}
                maxLength={255}
                placeholder="Cliente, referencia u observación"
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
            {estadoPago === 'credito_pendiente' && (
              <Alert variant="warning">
                <AlertDescription className="text-xs">
                  El stock se descuenta hoy; la cobranza se controla aparte (CB-07).
                </AlertDescription>
              </Alert>
            )}
          </div>
        </details>

        {/* Barra fija sobre la navegación inferior: total y un toque para confirmar. */}
        <div className="sticky bottom-16 z-30 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border lg:bottom-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-muted-foreground">Total</div>
              <div className="truncate text-2xl font-extrabold leading-tight text-foreground">{formatCurrency(total)}</div>
            </div>
            <Button type="submit" size="lg" className="shrink-0 px-6" isLoading={enviando} disabled={carrito.length === 0}>
              Registrar venta
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
