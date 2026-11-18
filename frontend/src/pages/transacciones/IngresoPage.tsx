import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductAutocomplete } from '@/components/transacciones/ProductAutocomplete';
import { PhotoUploader, type FotoAdjunta } from '@/components/transacciones/PhotoUploader';
import { ApiError } from '@/api/client';
import { transaccionesApi } from '@/api/transacciones.api';
import type { ProductoBusqueda } from '@/api/productos.api';
import { generarUuid } from '@/lib/idempotency';
import { formatCurrency, hoyISO } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

export const IngresoPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [producto, setProducto] = useState<ProductoBusqueda | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [esUnidadCompra, setEsUnidadCompra] = useState(false);
  const [costoIngreso, setCostoIngreso] = useState('');
  const [actualizarCosto, setActualizarCosto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [fechaEvento, setFechaEvento] = useState(hoyISO());
  const [fotos, setFotos] = useState<FotoAdjunta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const permiteConversion = Boolean(producto && producto.unidadCompra && producto.factorConversion > 1);

  const calculo = useMemo(() => {
    const cant = Number(cantidad) || 0;
    const factor = permiteConversion && esUnidadCompra ? producto!.factorConversion : 1;
    const unidadesAStock = cant * factor;
    const costoUnitario = costoIngreso ? Number(costoIngreso) : producto?.costoUnitario ?? 0;
    const costoPorUnidadVenta = factor > 1 && costoIngreso ? costoUnitario / factor : costoUnitario;
    return {
      factor,
      unidadesAStock,
      costoPorUnidadVenta,
      stockResultante: (producto?.stockActual ?? 0) + unidadesAStock,
    };
  }, [cantidad, costoIngreso, esUnidadCompra, permiteConversion, producto]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setExito(null);

    if (!producto) {
      setError('Selecciona el producto que ingresa a almacén.');
      return;
    }
    const cant = Number(cantidad);
    if (!Number.isFinite(cant) || cant <= 0) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }
    if (fotos.some((f) => f.estado === 'comprimiendo' || f.estado === 'subiendo')) {
      setError('Espera a que terminen de subir las fotografías.');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await transaccionesApi.registrarIngreso({
        productoId: producto.id,
        cantidad: cant,
        esUnidadCompra: permiteConversion && esUnidadCompra,
        costoUnitarioIngreso: costoIngreso ? Number(costoIngreso) : undefined,
        actualizarCostoReposicion: actualizarCosto,
        fechaEvento,
        llaveIdempotencia: generarUuid(),
        motivo: motivo.trim() || undefined,
      });

      setExito(
        `Ingreso registrado. Nuevo stock: ${resultado.nuevoStock ?? calculo.stockResultante} ${producto.unidadMedida}.`
      );
      setProducto(null);
      setCantidad('1');
      setEsUnidadCompra(false);
      setCostoIngreso('');
      setActualizarCosto(false);
      setMotivo('');
      setFotos([]);
      await queryClient.invalidateQueries({ queryKey: ['transacciones'] });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo registrar el ingreso. Verifica tu conexión e intenta nuevamente.');
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
            <PackagePlus className="h-6 w-6 text-emerald-600" />
            Ingreso de mercadería
          </h1>
          <p className="text-sm text-muted-foreground">
            Recepción de compras con conversión de empaques mayoristas (CB-04).
          </p>
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

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datos del ingreso</CardTitle>
            <CardDescription>Selecciona el artículo y la cantidad recibida.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ingreso-producto">Producto</Label>
              <ProductAutocomplete
                id="ingreso-producto"
                value={producto}
                onChange={(p) => {
                  setProducto(p);
                  setEsUnidadCompra(false);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ingreso-cantidad">
                  Cantidad {permiteConversion && esUnidadCompra ? `(${producto?.unidadCompra}s)` : producto ? `(${producto.unidadMedida})` : ''}
                </Label>
                <Input
                  id="ingreso-cantidad"
                  type="number"
                  min={1}
                  step="any"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ingreso-costo">Costo unitario (Bs, opcional)</Label>
                <Input
                  id="ingreso-costo"
                  type="number"
                  min={0}
                  step="any"
                  placeholder={producto ? String(producto.costoUnitario) : '0.00'}
                  value={costoIngreso}
                  onChange={(e) => setCostoIngreso(e.target.value)}
                />
              </div>
            </div>

            {permiteConversion && (
              <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3">
                <Checkbox
                  id="ingreso-unidad-compra"
                  checked={esUnidadCompra}
                  onCheckedChange={(v) => setEsUnidadCompra(v === true)}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="ingreso-unidad-compra" className="cursor-pointer">
                    Recibido en {producto?.unidadCompra}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Se convierte a {producto?.factorConversion} {producto?.unidadMedida} por unidad de compra.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Checkbox
                id="ingreso-actualizar-costo"
                checked={actualizarCosto}
                disabled={!costoIngreso}
                onCheckedChange={(v) => setActualizarCosto(v === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="ingreso-actualizar-costo" className="cursor-pointer">
                  Actualizar costo de reposición del catálogo
                </Label>
                <p className="text-xs text-muted-foreground">El EOQ/ROP usa el costo vigente del producto (CB-01).</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ingreso-fecha">Fecha del evento</Label>
              <Input
                id="ingreso-fecha"
                type="date"
                value={fechaEvento}
                max={hoyISO()}
                onChange={(e) => setFechaEvento(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ingreso-motivo">Observación (opcional)</Label>
              <Textarea
                id="ingreso-motivo"
                value={motivo}
                maxLength={255}
                placeholder="Proveedor, número de factura, etc."
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" isLoading={enviando}>
              Registrar ingreso
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Previsualización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Factor de conversión</span>
                <span className="font-medium text-foreground">×{calculo.factor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unidades a stock</span>
                <span className="font-semibold text-foreground">{calculo.unidadesAStock}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo por unidad de venta</span>
                <span className="font-medium text-foreground">{formatCurrency(calculo.costoPorUnidadVenta)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Stock resultante</span>
                <span className="font-bold text-emerald-700">{calculo.stockResultante}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fotografía del recibo (opcional)</CardTitle>
              <CardDescription>Hasta 5 imágenes, comprimidas en el navegador antes de subir a S3.</CardDescription>
            </CardHeader>
            <CardContent>
              <PhotoUploader value={fotos} onChange={setFotos} />
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};
