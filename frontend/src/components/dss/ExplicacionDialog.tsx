import React, { useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useExplicarAlerta } from '@/hooks/useAlertas';
import { ApiError } from '@/api/client';
import type { AlertaReabastecimiento } from '@libredss/shared';

export interface ExplicacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerta: AlertaReabastecimiento | null;
}

/**
 * Explicación en lenguaje natural de una alerta de reabastecimiento (HU-34).
 * El backend usa primero una plantilla determinística y, si hay cuota, la
 * enriquece con el modelo lite; la fuente se indica en la respuesta.
 */
export const ExplicacionDialog: React.FC<ExplicacionDialogProps> = ({ open, onOpenChange, alerta }) => {
  const explicar = useExplicarAlerta();

  useEffect(() => {
    if (open && alerta) {
      explicar.mutate(alerta.productoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, alerta?.productoId]);

  const resultado = explicar.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} aria-label="Explicación de la alerta">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Explicación de la recomendación
        </DialogTitle>
        <DialogDescription>
          {alerta ? `${alerta.nombre}${alerta.sku ? ` · SKU ${alerta.sku}` : ''}` : ''}
        </DialogDescription>
      </DialogHeader>

      {explicar.isPending ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Generando explicación…
        </div>
      ) : explicar.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {explicar.error instanceof ApiError
              ? explicar.error.message
              : 'No se pudo generar la explicación de la alerta.'}
          </AlertDescription>
        </Alert>
      ) : resultado ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground">{resultado.explicacion}</p>
          <Badge variant={resultado.fuente === 'gemini' ? 'default' : 'outline'}>
            {resultado.fuente === 'gemini' ? 'Generado con IA' : 'Plantilla determinística'}
          </Badge>
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
