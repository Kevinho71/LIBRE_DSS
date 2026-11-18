import React, { useEffect, useState } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActualizarMinMax } from '@/hooks/useSistemas';
import { ApiError } from '@/api/client';
import type { ItemSistema } from '@libredss/shared';

function numeroOpcional(valor: string): number | null {
  const n = Number(valor);
  return valor.trim() !== '' && Number.isFinite(n) ? n : null;
}

export interface ParametrosMinMaxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemSistema | null;
}

/**
 * Formulario de umbrales Min/Max manuales para productos en arranque en frío
 * (HU-38). Mientras el motor cuantitativo no está habilitado, la reposición se
 * gobierna por estos umbrales heurísticos.
 */
export const ParametrosMinMaxDialog: React.FC<ParametrosMinMaxDialogProps> = ({ open, onOpenChange, item }) => {
  const [minimo, setMinimo] = useState('');
  const [maximo, setMaximo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const actualizar = useActualizarMinMax();

  useEffect(() => {
    if (open && item) {
      setMinimo(item.stockMinimoManual != null ? String(item.stockMinimoManual) : '');
      setMaximo(item.stockMaximoManual != null ? String(item.stockMaximoManual) : '');
      setError(null);
    }
  }, [open, item]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!item) return;

    const stockMinimoManual = numeroOpcional(minimo);
    const stockMaximoManual = numeroOpcional(maximo);

    if (stockMinimoManual != null && stockMinimoManual <= 0) {
      setError('El stock mínimo debe ser mayor a 0.');
      return;
    }
    if (stockMaximoManual != null && stockMaximoManual <= 0) {
      setError('El stock máximo debe ser mayor a 0.');
      return;
    }
    if (stockMinimoManual != null && stockMaximoManual != null && stockMinimoManual >= stockMaximoManual) {
      setError('El stock mínimo debe ser menor que el stock máximo.');
      return;
    }

    try {
      await actualizar.mutateAsync({
        id: item.productoId,
        dto: { stockMinimoManual, stockMaximoManual },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron guardar los umbrales.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} aria-label="Parámetros Min/Max del producto">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Umbrales Min/Max manuales
          </DialogTitle>
          <DialogDescription>
            {item ? `${item.nombre}${item.sku ? ` · SKU ${item.sku}` : ''} — arranque en frío (HU-38)` : ''}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="minmax-minimo">Stock mínimo manual</Label>
            <Input
              id="minmax-minimo"
              type="number"
              min={0}
              step="any"
              placeholder="opcional"
              value={minimo}
              onChange={(e) => setMinimo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="minmax-maximo">Stock máximo manual</Label>
            <Input
              id="minmax-maximo"
              type="number"
              min={0}
              step="any"
              placeholder="opcional"
              value={maximo}
              onChange={(e) => setMaximo(e.target.value)}
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Se alerta cuando el stock cae al mínimo o supera el máximo. Deja ambos vacíos para desactivar la política heurística.
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={actualizar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={actualizar.isPending}>
            {actualizar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar umbrales
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
