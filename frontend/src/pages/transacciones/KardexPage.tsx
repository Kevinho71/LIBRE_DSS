import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  Filter,
  Loader2,
  PackagePlus,
  RotateCcw,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductAutocomplete } from '@/components/transacciones/ProductAutocomplete';
import { TipoTransaccionBadge } from '@/components/transacciones/TipoTransaccionBadge';
import { EstadoPagoBadge } from '@/components/transacciones/EstadoPagoBadge';
import { useTransacciones } from '@/hooks/useTransacciones';
import { transaccionesApi, type FiltrosTransacciones, type TransaccionItem } from '@/api/transacciones.api';
import type { ProductoBusqueda } from '@/api/productos.api';
import { ApiError } from '@/api/client';
import { TIPOS_FILTRO, formatCurrency, formatDate, labelEstadoPago } from '@/lib/format';
import { ROUTES } from '@/lib/routes';
import type { EstadoPagoTransaccion, TipoTransaccion } from '@libredss/shared';

const LIMITE = 20;

export const KardexPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [tipo, setTipo] = useState<TipoTransaccion | ''>('');
  const [estadoPago, setEstadoPago] = useState<EstadoPagoTransaccion | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [producto, setProducto] = useState<ProductoBusqueda | null>(null);
  const [page, setPage] = useState(1);

  const [notaAbierta, setNotaAbierta] = useState<string | null>(null);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const filtros: FiltrosTransacciones = {
    page,
    limit: LIMITE,
    ...(tipo ? { tipo } : {}),
    ...(estadoPago ? { estadoPago } : {}),
    ...(desde ? { desde } : {}),
    ...(hasta ? { hasta } : {}),
    ...(producto ? { productoId: producto.id } : {}),
  };

  const { data, isLoading, isFetching, isError } = useTransacciones(filtros);

  const notaQuery = useQuery({
    queryKey: ['transacciones', 'nota', notaAbierta],
    queryFn: () => transaccionesApi.obtenerPorNota(notaAbierta as string),
    enabled: Boolean(notaAbierta),
  });

  const reiniciarFiltros = () => {
    setTipo('');
    setEstadoPago('');
    setDesde('');
    setHasta('');
    setProducto(null);
    setPage(1);
  };

  const marcarPagado = async (item: TransaccionItem) => {
    setErrorAccion(null);
    setActualizandoId(item.id);
    try {
      if (item.notaId) {
        await transaccionesApi.actualizarPagoPorNota(item.notaId, 'credito_pagado');
      } else {
        await transaccionesApi.actualizarPago(item.id, 'credito_pagado');
      }
      await queryClient.invalidateQueries({ queryKey: ['transacciones'] });
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado de pago.');
    } finally {
      setActualizandoId(null);
    }
  };

  const paginacion = data?.paginacion;
  const items = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Kardex / Historial
          </h1>
          <p className="text-sm text-muted-foreground">Movimientos de inventario con filtros por fecha, tipo y producto (HU-14).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={ROUTES.venta}>
              <ShoppingCart className="h-4 w-4" />
              Nueva venta
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.ingreso}>
              <PackagePlus className="h-4 w-4" />
              Ingreso
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5 lg:col-span-3">
            <Label htmlFor="kardex-producto">Producto</Label>
            <ProductAutocomplete
              id="kardex-producto"
              value={producto}
              onChange={(p) => {
                setProducto(p);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kardex-tipo">Tipo</Label>
            <Select
              id="kardex-tipo"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoTransaccion | '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {TIPOS_FILTRO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kardex-estado">Estado de pago</Label>
            <Select
              id="kardex-estado"
              value={estadoPago}
              onChange={(e) => {
                setEstadoPago(e.target.value as EstadoPagoTransaccion | '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="contado">Contado</option>
              <option value="credito_pendiente">Crédito pendiente</option>
              <option value="credito_pagado">Crédito pagado</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="kardex-desde">Desde</Label>
              <Input
                id="kardex-desde"
                type="date"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kardex-hasta">Hasta</Label>
              <Input
                id="kardex-hasta"
                type="date"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="ghost" onClick={reiniciarFiltros}>
              <RotateCcw className="h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {errorAccion && (
        <Alert variant="destructive">
          <AlertDescription>{errorAccion}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Movimientos</CardTitle>
            <CardDescription>
              {paginacion ? `${paginacion.total} registro(s)` : 'Cargando…'}
            </CardDescription>
          </div>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription>No se pudo cargar el historial de transacciones.</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay movimientos para los filtros seleccionados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo unit.</TableHead>
                  <TableHead className="text-right">Precio venta</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-xs">{formatDate(item.fechaEvento)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{item.producto?.nombre ?? item.productoId.slice(0, 8)}</div>
                      {item.producto?.sku && (
                        <div className="text-xs text-muted-foreground">SKU {item.producto.sku}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <TipoTransaccionBadge tipo={item.tipo} />
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.cantidad}</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(item.costoUnitarioHistorico)}</TableCell>
                    <TableCell className="text-right text-xs">
                      {item.precioVentaHistorico != null ? formatCurrency(item.precioVentaHistorico) : '—'}
                    </TableCell>
                    <TableCell>
                      <EstadoPagoBadge estado={item.estadoPago} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {item.notaId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setNotaAbierta(item.notaId)}
                            aria-label="Ver nota de venta"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Nota
                          </Button>
                        )}
                        {item.estadoPago === 'credito_pendiente' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={actualizandoId === item.id}
                            onClick={() => void marcarPagado(item)}
                          >
                            {actualizandoId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Pagado
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {paginacion && paginacion.totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">
                Página {paginacion.pagina} de {paginacion.totalPaginas}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={paginacion.pagina <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={paginacion.pagina >= paginacion.totalPaginas}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(notaAbierta)} onOpenChange={(open) => !open && setNotaAbierta(null)} aria-label="Detalle de nota de venta">
        <DialogHeader>
          <DialogTitle>Nota de venta</DialogTitle>
          <DialogDescription>
            {notaAbierta ? `Identificador ${notaAbierta.slice(0, 8)}…` : ''}
          </DialogDescription>
        </DialogHeader>

        {notaQuery.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : notaQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>No se pudo cargar la nota de venta.</AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(notaQuery.data?.items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{item.producto?.nombre ?? item.productoId.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">{labelEstadoPago(item.estadoPago)}</div>
                  </TableCell>
                  <TableCell className="text-right">{item.cantidad}</TableCell>
                  <TableCell className="text-right text-xs">
                    {item.precioVentaHistorico != null ? formatCurrency(item.precioVentaHistorico) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setNotaAbierta(null)}>
            Cerrar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};
