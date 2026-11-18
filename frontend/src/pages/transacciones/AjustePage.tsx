import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductAutocomplete } from '@/components/transacciones/ProductAutocomplete';
import { ApiError } from '@/api/client';
import { transaccionesApi } from '@/api/transacciones.api';
import type { ProductoBusqueda } from '@/api/productos.api';
import { generarUuid } from '@/lib/idempotency';
import { hoyISO } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

type Operacion = 'conteo' | 'merma' | 'devolucion_cliente' | 'devolucion_proveedor';

const OPERACIONES: Array<{ value: Operacion; label: string }> = [
  { value: 'conteo', label: 'Ajuste por conteo físico (arqueo)' },
  { value: 'merma', label: 'Registrar merma' },
  { value: 'devolucion_cliente', label: 'Devolución de cliente' },
  { value: 'devolucion_proveedor', label: 'Devolución a proveedor' },
];

export const AjustePage: React.FC = () => {
  const queryClient = useQueryClient();

  const [operacion, setOperacion] = useState<Operacion>('conteo');
  const [producto, setProducto] = useState<ProductoBusqueda | null>(null);
  const [conteoFisico, setConteoFisico] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [fechaEvento, setFechaEvento] = useState(hoyISO());
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const esConteo = operacion === 'conteo';
  const esDevolucion = operacion === 'devolucion_cliente' || operacion === 'devolucion_proveedor';

  const diferencia = useMemo(() => {
    if (!producto || conteoFisico === '') return null;
    return Number(conteoFisico) - producto.stockActual;
  }, [conteoFisico, producto]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setExito(null);

    if (!producto) {
      setError('Selecciona el producto afectado.');
      return;
    }
    if (motivo.trim().length < 3) {
      setError('El motivo es obligatorio (mínimo 3 caracteres).');
      return;
    }
    if (esConteo && conteoFisico === '') {
      setError('Ingresa el conteo físico real.');
      return;
    }
    if (!esConteo) {
      const cant = Number(cantidad);
      if (!Number.isFinite(cant) || cant <= 0) {
        setError('La cantidad debe ser mayor a 0.');
        return;
      }
    }

    setEnviando(true);
    try {
      if (esDevolucion) {
        const resultado = await transaccionesApi.registrarDevolucion({
          productoId: producto.id,
          tipo: operacion,
          cantidad: Number(cantidad),
          motivo: motivo.trim(),
          fechaEvento,
          llaveIdempotencia: generarUuid(),
        });
        setExito(`Devolución registrada. Nuevo stock: ${resultado.nuevoStock ?? '—'} ${producto.unidadMedida}.`);
      } else {
        const resultado = await transaccionesApi.registrarAjuste({
          productoId: producto.id,
          ...(esConteo ? { conteoFisico: Number(conteoFisico) } : { cantidad: Number(cantidad) }),
          motivo: motivo.trim(),
          fechaEvento,
          llaveIdempotencia: generarUuid(),
        });
        setExito(`Ajuste registrado. Nuevo stock: ${resultado.nuevoStock ?? '—'} ${producto.unidadMedida}.`);
      }

      setProducto(null);
      setConteoFisico('');
      setCantidad('1');
      setMotivo('');
      await queryClient.invalidateQueries({ queryKey: ['transacciones'] });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo registrar el movimiento. Verifica tu conexión e intenta nuevamente.');
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
            <ClipboardList className="h-6 w-6 text-amber-600" />
            Ajustes, mermas y devoluciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Sincroniza el stock con el conteo real o registra devoluciones (CB-05 / CB-06).
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

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalle del movimiento</CardTitle>
            <CardDescription>Elige la operación y completa los datos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ajuste-operacion">Tipo de operación</Label>
              <Select
                id="ajuste-operacion"
                value={operacion}
                onChange={(e) => setOperacion(e.target.value as Operacion)}
              >
                {OPERACIONES.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ajuste-producto">Producto</Label>
              <ProductAutocomplete id="ajuste-producto" value={producto} onChange={setProducto} />
            </div>

            {esConteo ? (
              <div className="space-y-1.5">
                <Label htmlFor="ajuste-conteo">Conteo físico real ({producto?.unidadMedida ?? 'unidades'})</Label>
                <Input
                  id="ajuste-conteo"
                  type="number"
                  min={0}
                  step="any"
                  value={conteoFisico}
                  onChange={(e) => setConteoFisico(e.target.value)}
                />
                {producto && diferencia !== null && (
                  <p className="text-xs text-muted-foreground">
                    Stock del sistema: <strong>{producto.stockActual}</strong> · Diferencia:{' '}
                    <strong className={diferencia === 0 ? '' : diferencia > 0 ? 'text-emerald-700' : 'text-destructive'}>
                      {diferencia > 0 ? `+${diferencia}` : diferencia}
                    </strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="ajuste-cantidad">Cantidad ({producto?.unidadMedida ?? 'unidades'})</Label>
                <Input
                  id="ajuste-cantidad"
                  type="number"
                  min={1}
                  step="any"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ajuste-motivo">Motivo</Label>
              <Textarea
                id="ajuste-motivo"
                value={motivo}
                maxLength={255}
                placeholder="Ej. rotura por caída, diferencia de conteo, material dañado…"
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ajuste-fecha">Fecha del evento</Label>
              <Input
                id="ajuste-fecha"
                type="date"
                value={fechaEvento}
                max={hoyISO()}
                onChange={(e) => setFechaEvento(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" isLoading={enviando}>
              Registrar movimiento
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Impacto en el motor DSS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              Las mermas y ajustes <strong>no</strong> se suman a la demanda comercial, evitando recomendar pedidos
              excesivos por descalces operativos.
            </p>
            <p>
              Las devoluciones de cliente restituyen el stock sin inflar la demanda real; las devoluciones a proveedor
              restan el material defectuoso.
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
