import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClaseAbcBadge } from '@/components/abc/ClaseAbcBadge';
import { EstadoAlertaBadge } from '@/components/productos/EstadoAlertaBadge';
import { ProductoFormDialog } from '@/components/productos/ProductoFormDialog';
import { ProductoProveedoresDialog } from '@/components/productos/ProductoProveedoresDialog';
import { ImportarCsvDialog } from '@/components/productos/ImportarCsvDialog';
import { useDesactivarProducto, useProductos } from '@/hooks/useProductos';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FiltrosProductos, ProductoListItemDto } from '@libredss/shared';

const LIMITE = 15;
const MAX_FREE_SKUS = 15;

export const ProductosPage: React.FC = () => {
  const { empresa } = useAuth();
  const esFreemium = empresa?.plan === 'gratuito';

  const [buscar, setBuscar] = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<ProductoListItemDto | null>(null);
  const [proveedoresDe, setProveedoresDe] = useState<ProductoListItemDto | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [desactivar, setDesactivar] = useState<ProductoListItemDto | null>(null);

  const buscarDebounced = useDebounce(buscar, 300);

  const filtros: FiltrosProductos = {
    page,
    limit: LIMITE,
    ...(buscarDebounced.trim() ? { buscar: buscarDebounced.trim() } : {}),
    ...(soloAlertas ? { soloAlertas: true } : {}),
  };

  const { data, isLoading, isFetching, isError } = useProductos(filtros);
  const desactivarMutation = useDesactivarProducto();

  const items = data?.data ?? [];
  const paginacion = data?.paginacion;
  const sinFiltro = buscarDebounced.trim() === '' && !soloAlertas;
  const totalActivos = sinFiltro ? paginacion?.total ?? 0 : null;
  const cupoFreemiumAlcanzado = esFreemium && totalActivos != null && totalActivos >= MAX_FREE_SKUS;

  const abrirCrear = () => {
    setEditando(null);
    setFormOpen(true);
  };

  const confirmarDesactivar = async () => {
    if (!desactivar) return;
    setError(null);
    try {
      await desactivarMutation.mutateAsync(desactivar.id);
      setDesactivar(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo desactivar el producto.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <Package className="h-6 w-6 text-primary" />
            Catálogo de productos
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro, edición y borrado lógico con clasificación ABC y alertas de stock (HU-06 a HU-10).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setCsvOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button type="button" onClick={abrirCrear}>
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Button>
        </div>
      </div>

      {esFreemium && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Plan Freemium: {totalActivos ?? '—'} de {MAX_FREE_SKUS} SKUs usados
                </p>
                <p className="text-xs text-muted-foreground">
                  El plan gratuito permite hasta {MAX_FREE_SKUS} productos activos.
                </p>
              </div>
            </div>
            {cupoFreemiumAlcanzado && (
              <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Límite alcanzado. Actualiza al plan de pago para registrar más SKUs.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="catalogo-buscar">Buscar por nombre o SKU</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="catalogo-buscar"
                className="pl-9"
                value={buscar}
                placeholder="Ej. cemento, CEM-30…"
                onChange={(e) => {
                  setBuscar(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              id="catalogo-solo-alertas"
              checked={soloAlertas}
              onCheckedChange={(v) => {
                setSoloAlertas(v === true);
                setPage(1);
              }}
            />
            <Label htmlFor="catalogo-solo-alertas" className="cursor-pointer">
              Solo alertas de stock
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Productos</CardTitle>
            <CardDescription>
              {paginacion ? `${paginacion.total} producto(s)` : 'Cargando…'}
            </CardDescription>
          </div>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription>No se pudo cargar el catálogo.</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay productos que coincidan con el filtro.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Clase</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">ROP</TableHead>
                    <TableHead className="text-right">Precio venta</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id} className={cn(p.estadoAlerta === 'sin_stock' && 'bg-destructive/5')}>
                      <TableCell className="text-xs">{p.sku ?? '—'}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{p.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.unidadMedida}
                          {p.unidadCompra ? ` · compra: ${p.unidadCompra} (×${p.factorConversion})` : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ClaseAbcBadge categoria={p.categoriaAbc} />
                      </TableCell>
                      <TableCell>
                        <EstadoAlertaBadge estado={p.estadoAlerta} />
                      </TableCell>
                      <TableCell className="text-right font-medium">{p.stockActual}</TableCell>
                      <TableCell className="text-right text-xs">{p.ropCalculado ?? '—'}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(p.precioVenta)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Editar ${p.nombre}`}
                            onClick={() => {
                              setEditando(p);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Proveedores de ${p.nombre}`}
                            onClick={() => setProveedoresDe(p)}
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Desactivar ${p.nombre}`}
                            onClick={() => setDesactivar(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

      <ProductoFormDialog open={formOpen} onOpenChange={setFormOpen} producto={editando} />
      <ProductoProveedoresDialog
        open={Boolean(proveedoresDe)}
        onOpenChange={(open) => !open && setProveedoresDe(null)}
        producto={proveedoresDe}
      />
      <ImportarCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />

      <Dialog
        open={Boolean(desactivar)}
        onOpenChange={(open) => !open && setDesactivar(null)}
        aria-label="Confirmar desactivación de producto"
      >
        <DialogHeader>
          <DialogTitle>Desactivar producto</DialogTitle>
          <DialogDescription>
            {desactivar ? `¿Desactivar «${desactivar.nombre}»? El producto dejará de aparecer en el catálogo activo.` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDesactivar(null)} disabled={desactivarMutation.isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={() => void confirmarDesactivar()} disabled={desactivarMutation.isPending}>
            {desactivarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Desactivar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};
