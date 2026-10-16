import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Receipt, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export const VentaPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { refrescarPendientes } = useSalesSync();

  const [producto, setProducto] = useState<ProductoBusqueda | null>(null);
  const [cantidad, setCantidad] = useState('1');
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

  const agregarAlCarrito = () => {
    setError(null);
    if (!producto) {
      setError('Selecciona un producto antes de agregarlo.');
      return;
    }
    const cant = Number(cantidad);
    if (!Number.isFinite(cant) || cant <= 0) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }

    const yaEnCarrito = carrito.find((i) => i.producto.id === producto.id)?.cantidad ?? 0;
    if (yaEnCarrito + cant > producto.stockActual) {
      setError(`Stock insuficiente de "${producto.nombre}": disponible ${producto.stockActual} ${producto.unidadMedida}.`);
      return;
    }

    setCarrito((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) => (i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + cant } : i));
      }
      return [...prev, { producto, cantidad: cant, precioVenta: producto.precioVenta }];
    });
    setProducto(null);
    setCantidad('1');
  };

  const quitar = (productoId: string) => setCarrito((prev) => prev.filter((i) => i.producto.id !== productoId));

  const actualizarCantidad = (productoId: string, valor: string) => {
    const cant = Number(valor);
    setCarrito((prev) =>
      prev.map((i) =>
        i.producto.id === productoId
          ? { ...i, cantidad: Number.isFinite(cant) && cant > 0 ? cant : i.cantidad }
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
    setProducto(null);
    setCantidad('1');
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={ROUTES.transacciones}>
            <ArrowLeft className="h-4 w-4" />
            Kardex
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Venta ágil
          </h1>
          <p className="text-sm text-muted-foreground">Nota multilínea atómica con descuento de stock inmediato (CB-03).</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {exito && (
        <Alert variant="success">
          <AlertTitle>Operación exitosa</AlertTitle>
          <AlertDescription>{exito}</AlertDescription>
        </Alert>
      )}
      {alertas.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>Alerta de reabastecimiento (ROP)</AlertTitle>
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

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Agregar producto</CardTitle>
              <CardDescription>Busca por nombre o SKU y define la cantidad a vender.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="producto-venta">Producto</Label>
                <ProductAutocomplete id="producto-venta" value={producto} onChange={setProducto} />
              </div>
              <div className="flex items-end gap-3">
                <div className="w-32 space-y-1.5">
                  <Label htmlFor="cantidad-venta">Cantidad</Label>
                  <Input
                    id="cantidad-venta"
                    type="number"
                    min={1}
                    step="any"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={agregarAlCarrito}>
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalle de la nota ({carrito.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {carrito.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Aún no agregaste productos a la nota.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-24 text-right">Cantidad</TableHead>
                      <TableHead className="w-28 text-right">Precio</TableHead>
                      <TableHead className="w-28 text-right">Subtotal</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrito.map((item) => (
                      <TableRow key={item.producto.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{item.producto.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.producto.sku ? `SKU ${item.producto.sku} · ` : ''}Stock {item.producto.stockActual}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            step="any"
                            aria-label={`Cantidad de ${item.producto.nombre}`}
                            value={item.cantidad}
                            onChange={(e) => actualizarCantidad(item.producto.id, e.target.value)}
                            className="h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            aria-label={`Precio de ${item.producto.nombre}`}
                            value={item.precioVenta}
                            onChange={(e) => actualizarPrecio(item.producto.id, e.target.value)}
                            className="h-8 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(item.cantidad * item.precioVenta)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Quitar ${item.producto.nombre}`}
                            onClick={() => quitar(item.producto.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="lg:sticky lg:top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="estado-pago">Forma de pago</Label>
                <Select
                  id="estado-pago"
                  value={estadoPago}
                  onChange={(e) => setEstadoPago(e.target.value as 'contado' | 'credito_pendiente')}
                >
                  <option value="contado">Contado</option>
                  <option value="credito_pendiente">Crédito pendiente ("al fiado")</option>
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

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-xl font-extrabold text-foreground">{formatCurrency(total)}</span>
              </div>

              <Button type="submit" className="w-full" isLoading={enviando} disabled={carrito.length === 0}>
                Registrar nota de venta
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};
