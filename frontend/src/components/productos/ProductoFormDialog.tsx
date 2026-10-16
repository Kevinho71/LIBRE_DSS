import React, { useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActualizarProducto, useCrearProducto } from '@/hooks/useProductos';
import { ApiError } from '@/api/client';
import type { ProductoInputDTO, ProductoListItemDto } from '@libredss/shared';

interface FormState {
  nombre: string;
  sku: string;
  unidadMedida: string;
  unidadCompra: string;
  factorConversion: string;
  costoUnitario: string;
  precioVenta: string;
  costoPedido: string;
  tasaMantenimiento: string;
  stockActual: string;
  stockMinimoManual: string;
  stockMaximoManual: string;
}

const FORM_VACIO: FormState = {
  nombre: '',
  sku: '',
  unidadMedida: 'unidad',
  unidadCompra: '',
  factorConversion: '1',
  costoUnitario: '',
  precioVenta: '',
  costoPedido: '50',
  tasaMantenimiento: '0.2',
  stockActual: '0',
  stockMinimoManual: '',
  stockMaximoManual: '',
};

function desdeProducto(p: ProductoListItemDto): FormState {
  return {
    nombre: p.nombre,
    sku: p.sku ?? '',
    unidadMedida: p.unidadMedida || 'unidad',
    unidadCompra: p.unidadCompra ?? '',
    factorConversion: String(p.factorConversion ?? 1),
    costoUnitario: String(p.costoUnitario ?? ''),
    precioVenta: String(p.precioVenta ?? ''),
    costoPedido: String(p.costoPedido ?? 50),
    tasaMantenimiento: String(p.tasaMantenimientoAnual ?? 0.2),
    stockActual: String(p.stockActual ?? 0),
    stockMinimoManual: p.stockMinimoManual != null ? String(p.stockMinimoManual) : '',
    stockMaximoManual: p.stockMaximoManual != null ? String(p.stockMaximoManual) : '',
  };
}

function numeroOpcional(valor: string): number | undefined {
  const n = Number(valor);
  return valor.trim() !== '' && Number.isFinite(n) ? n : undefined;
}

export interface ProductoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto?: ProductoListItemDto | null;
}

/**
 * Formulario de alta/edición de producto con parámetros logísticos usados por el
 * motor DSS (costo de pedido, tasa de mantenimiento, factor de conversión) (HU-06, HU-07).
 */
export const ProductoFormDialog: React.FC<ProductoFormDialogProps> = ({ open, onOpenChange, producto }) => {
  const esEdicion = Boolean(producto);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);

  const crear = useCrearProducto();
  const actualizar = useActualizarProducto();
  const enviando = crear.isPending || actualizar.isPending;

  useEffect(() => {
    if (open) {
      setForm(producto ? desdeProducto(producto) : FORM_VACIO);
      setError(null);
    }
  }, [open, producto]);

  const set = (campo: keyof FormState, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    const costoUnitario = numeroOpcional(form.costoUnitario);
    const precioVenta = numeroOpcional(form.precioVenta);
    if (!costoUnitario || costoUnitario <= 0) {
      setError('El costo unitario debe ser mayor a 0.');
      return;
    }
    if (!precioVenta || precioVenta <= 0) {
      setError('El precio de venta debe ser mayor a 0.');
      return;
    }
    const factorConversion = numeroOpcional(form.factorConversion) ?? 1;
    if (factorConversion <= 0) {
      setError('El factor de conversión debe ser mayor a 0.');
      return;
    }

    const dto: ProductoInputDTO = {
      nombre: form.nombre.trim(),
      sku: form.sku.trim() !== '' ? form.sku.trim() : null,
      unidadMedida: form.unidadMedida.trim() || 'unidad',
      unidadCompra: form.unidadCompra.trim() !== '' ? form.unidadCompra.trim() : null,
      factorConversion,
      costoUnitario,
      precioVenta,
      costoPedido: numeroOpcional(form.costoPedido) ?? 50,
      tasaMantenimientoAnual: numeroOpcional(form.tasaMantenimiento) ?? 0.2,
      stockActual: numeroOpcional(form.stockActual) ?? 0,
      stockMinimoManual: numeroOpcional(form.stockMinimoManual) ?? null,
      stockMaximoManual: numeroOpcional(form.stockMaximoManual) ?? null,
    };

    try {
      if (producto) {
        await actualizar.mutateAsync({ id: producto.id, dto });
      } else {
        await crear.mutateAsync({ ...dto, origenDato: 'manual' });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el producto.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl" aria-label="Formulario de producto">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {esEdicion ? 'Editar producto' : 'Nuevo producto'}
          </DialogTitle>
          <DialogDescription>
            Los parámetros logísticos alimentan el cálculo de EOQ/ROP del motor DSS.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="prod-nombre">Nombre *</Label>
            <Input id="prod-nombre" value={form.nombre} maxLength={255} onChange={(e) => set('nombre', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-sku">SKU</Label>
            <Input id="prod-sku" value={form.sku} maxLength={100} onChange={(e) => set('sku', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-unidad">Unidad de venta</Label>
            <Input id="prod-unidad" value={form.unidadMedida} onChange={(e) => set('unidadMedida', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-unidad-compra">Unidad de compra (CB-04)</Label>
            <Input
              id="prod-unidad-compra"
              placeholder="p. ej. caja"
              value={form.unidadCompra}
              onChange={(e) => set('unidadCompra', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-factor">Factor de conversión (CB-04)</Label>
            <Input
              id="prod-factor"
              type="number"
              min={0}
              step="any"
              value={form.factorConversion}
              onChange={(e) => set('factorConversion', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-costo">Costo unitario (Bs) *</Label>
            <Input
              id="prod-costo"
              type="number"
              min={0}
              step="any"
              value={form.costoUnitario}
              onChange={(e) => set('costoUnitario', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-precio">Precio de venta (Bs) *</Label>
            <Input
              id="prod-precio"
              type="number"
              min={0}
              step="any"
              value={form.precioVenta}
              onChange={(e) => set('precioVenta', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-costo-pedido">Costo de pedido S (Bs)</Label>
            <Input
              id="prod-costo-pedido"
              type="number"
              min={0}
              step="any"
              value={form.costoPedido}
              onChange={(e) => set('costoPedido', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-tasa">Tasa de mantenimiento i (fracción)</Label>
            <Input
              id="prod-tasa"
              type="number"
              min={0}
              step="any"
              value={form.tasaMantenimiento}
              onChange={(e) => set('tasaMantenimiento', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-stock">Stock actual</Label>
            <Input
              id="prod-stock"
              type="number"
              min={0}
              step="any"
              value={form.stockActual}
              onChange={(e) => set('stockActual', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-stock-min">Stock mínimo manual (arranque en frío)</Label>
            <Input
              id="prod-stock-min"
              type="number"
              min={0}
              step="any"
              placeholder="opcional"
              value={form.stockMinimoManual}
              onChange={(e) => set('stockMinimoManual', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prod-stock-max">Stock máximo manual (arranque en frío)</Label>
            <Input
              id="prod-stock-max"
              type="number"
              min={0}
              step="any"
              placeholder="opcional"
              value={form.stockMaximoManual}
              onChange={(e) => set('stockMaximoManual', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {esEdicion ? 'Guardar cambios' : 'Registrar producto'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
