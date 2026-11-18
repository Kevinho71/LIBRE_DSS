import React, { useEffect, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface NuevoProductoValores {
  nombre: string;
  precioVenta: string;
  costo: string;
  /** Stock disponible ANTES de registrar la venta del recibo. */
  stock: string;
}

export interface NuevoProductoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Valores con los que se abre (lo leído por la IA o lo ya cargado antes). */
  inicial: NuevoProductoValores;
  /** Cantidad del ítem en el recibo: el stock debe alcanzar para venderla. */
  cantidad: number;
  onGuardar: (valores: NuevoProductoValores) => void;
}

/** Bottom sheet para dar de alta un producto que la IA no encontró en el catálogo. */
export const NuevoProductoSheet: React.FC<NuevoProductoSheetProps> = ({
  open,
  onOpenChange,
  inicial,
  cantidad,
  onGuardar,
}) => {
  const [valores, setValores] = useState<NuevoProductoValores>(inicial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValores(inicial);
      setError(null);
    }
    // Solo al abrir: no pisar lo que el usuario escribe si el padre se vuelve a renderizar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (campo: keyof NuevoProductoValores, valor: string) => setValores((v) => ({ ...v, [campo]: valor }));

  const guardar = (event: React.FormEvent) => {
    event.preventDefault();
    const precio = Number(valores.precioVenta);
    const costo = Number(valores.costo);
    const stock = Number(valores.stock);
    if (valores.nombre.trim().length < 2) return setError('El nombre debe tener al menos 2 caracteres.');
    if (valores.precioVenta.trim() === '' || !Number.isFinite(precio) || precio <= 0)
      return setError('Confirma el precio de venta (mayor a 0).');
    if (valores.costo.trim() === '' || !Number.isFinite(costo) || costo <= 0)
      return setError('Indica el costo de compra (mayor a 0).');
    if (valores.stock.trim() === '' || !Number.isFinite(stock) || stock < 0)
      return setError('Indica el stock disponible (0 o más).');
    if (stock < cantidad)
      return setError(`El stock (${stock}) no alcanza para vender ${cantidad}. Indica el stock antes de esta venta.`);
    onGuardar({ ...valores, nombre: valores.nombre.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} variant="bottom" aria-label="Agregar producto nuevo">
      <form onSubmit={guardar}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Producto nuevo
          </DialogTitle>
          <DialogDescription>
            Se crea en el catálogo cuando confirmes la ingesta completa.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nuevo-nombre">Nombre *</Label>
            <Input
              id="nuevo-nombre"
              value={valores.nombre}
              maxLength={255}
              autoComplete="off"
              onChange={(e) => set('nombre', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nuevo-precio">Precio de venta (Bs) *</Label>
            <Input
              id="nuevo-precio"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={valores.precioVenta}
              onChange={(e) => set('precioVenta', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nuevo-costo">Costo de compra (Bs) *</Label>
            <Input
              id="nuevo-costo"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={valores.costo}
              onChange={(e) => set('costo', e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nuevo-stock">Stock disponible antes de esta venta *</Label>
            <Input
              id="nuevo-stock"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={valores.stock}
              onChange={(e) => set('stock', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit">Guardar producto</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
