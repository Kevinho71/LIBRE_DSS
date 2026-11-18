import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Star, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProveedores, useProveedoresDeProducto, useAsociarProveedor } from '@/hooks/useProveedores';
import { ApiError } from '@/api/client';
import { formatCurrency } from '@/lib/format';
import { ROUTES } from '@/lib/routes';
import type { ProductoListItemDto } from '@libredss/shared';

interface VinculoForm {
  proveedorId: string;
  codigoProveedor: string;
  costoCompra: string;
  leadTimeDias: string;
  costoPedido: string;
  loteMinimo: string;
  esPrincipal: boolean;
}

const FORM_VACIO: VinculoForm = {
  proveedorId: '',
  codigoProveedor: '',
  costoCompra: '',
  leadTimeDias: '3',
  costoPedido: '50',
  loteMinimo: '1',
  esPrincipal: true,
};

export interface ProductoProveedoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: ProductoListItemDto | null;
}

/**
 * Vinculación N:M producto↔proveedor (HU-08, CB-02): código de proveedor, lead
 * time, costo de compra/pedido, lote mínimo y marca de proveedor principal.
 */
export const ProductoProveedoresDialog: React.FC<ProductoProveedoresDialogProps> = ({
  open,
  onOpenChange,
  producto,
}) => {
  const productoId = producto?.id ?? null;
  const proveedoresQuery = useProveedores();
  const vinculosQuery = useProveedoresDeProducto(open ? productoId : null);
  const asociar = useAsociarProveedor(productoId);

  const [form, setForm] = useState<VinculoForm>(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(FORM_VACIO);
      setError(null);
    }
  }, [open, productoId]);

  const set = <K extends keyof VinculoForm>(campo: K, valor: VinculoForm[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const handleAsociar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.proveedorId) {
      setError('Selecciona un proveedor.');
      return;
    }

    try {
      await asociar.mutateAsync({
        proveedorId: form.proveedorId,
        codigoProveedor: form.codigoProveedor.trim() !== '' ? form.codigoProveedor.trim() : null,
        costoCompra: form.costoCompra.trim() !== '' ? Number(form.costoCompra) : null,
        leadTimeDias: Math.max(1, Math.trunc(Number(form.leadTimeDias) || 3)),
        costoPedido: Number(form.costoPedido) || 50,
        loteMinimo: Number(form.loteMinimo) || 1,
        esPrincipal: form.esPrincipal,
      });
      setForm(FORM_VACIO);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo asociar el proveedor.');
    }
  };

  const proveedores = proveedoresQuery.data ?? [];
  const vinculos = vinculosQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-3xl" aria-label="Proveedores del producto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Proveedores del producto
        </DialogTitle>
        <DialogDescription>
          {producto ? `${producto.nombre}${producto.sku ? ` · SKU ${producto.sku}` : ''}` : ''}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {vinculosQuery.isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : vinculosQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>No se pudieron cargar los proveedores del producto.</AlertDescription>
        </Alert>
      ) : vinculos.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Este producto aún no tiene proveedores asociados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Lead time</TableHead>
                <TableHead className="text-right">Costo compra</TableHead>
                <TableHead className="text-right">Lote mín.</TableHead>
                <TableHead>Principal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vinculos.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium text-foreground">{v.proveedorNombre ?? '—'}</TableCell>
                  <TableCell className="text-xs">{v.codigoProveedor ?? '—'}</TableCell>
                  <TableCell className="text-right text-xs">{v.leadTimeDias} día(s)</TableCell>
                  <TableCell className="text-right text-xs">
                    {v.costoCompra != null ? formatCurrency(v.costoCompra) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-xs">{v.loteMinimo}</TableCell>
                  <TableCell>
                    {v.esPrincipal && (
                      <Badge variant="success" className="gap-1">
                        <Star className="h-3 w-3" />
                        Principal
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <form onSubmit={handleAsociar} className="mt-6 space-y-4 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">Asociar proveedor</p>

        {proveedoresQuery.isSuccess && proveedores.length === 0 ? (
          <Alert>
            <AlertDescription>
              No hay proveedores registrados.{' '}
              <Link to={ROUTES.proveedores} className="font-semibold text-primary hover:underline">
                Registra uno primero
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vinculo-proveedor">Proveedor *</Label>
                <Select
                  id="vinculo-proveedor"
                  value={form.proveedorId}
                  onChange={(e) => set('proveedorId', e.target.value)}
                >
                  <option value="">Selecciona…</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vinculo-codigo">Código de proveedor</Label>
                <Input
                  id="vinculo-codigo"
                  value={form.codigoProveedor}
                  onChange={(e) => set('codigoProveedor', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vinculo-costo">Costo de compra (Bs)</Label>
                <Input
                  id="vinculo-costo"
                  type="number"
                  min={0}
                  step="any"
                  value={form.costoCompra}
                  onChange={(e) => set('costoCompra', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vinculo-lead">Lead time (días)</Label>
                <Input
                  id="vinculo-lead"
                  type="number"
                  min={1}
                  step={1}
                  value={form.leadTimeDias}
                  onChange={(e) => set('leadTimeDias', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vinculo-costo-pedido">Costo de pedido S (Bs)</Label>
                <Input
                  id="vinculo-costo-pedido"
                  type="number"
                  min={0}
                  step="any"
                  value={form.costoPedido}
                  onChange={(e) => set('costoPedido', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vinculo-lote">Lote mínimo</Label>
                <Input
                  id="vinculo-lote"
                  type="number"
                  min={1}
                  step="any"
                  value={form.loteMinimo}
                  onChange={(e) => set('loteMinimo', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="vinculo-principal"
                checked={form.esPrincipal}
                onCheckedChange={(v) => set('esPrincipal', v === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="vinculo-principal" className="cursor-pointer">
                  Proveedor principal
                </Label>
                <p className="text-xs text-muted-foreground">
                  Al marcarlo, se desmarca el principal anterior (CB-02).
                </p>
              </div>
            </div>

            <Button type="submit" disabled={asociar.isPending} className="w-full sm:w-auto">
              {asociar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Asociar proveedor
            </Button>
          </>
        )}
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
