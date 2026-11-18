import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CategoriaAbc } from '@libredss/shared';

const VARIANTE_POR_CLASE: Record<CategoriaAbc, 'claseA' | 'claseB' | 'claseC'> = {
  A: 'claseA',
  B: 'claseB',
  C: 'claseC',
};

const DESCRIPCION_POR_CLASE: Record<CategoriaAbc, string> = {
  A: 'Clase A — alta criticidad (rojo)',
  B: 'Clase B — criticidad media (amarillo)',
  C: 'Clase C — baja criticidad (gris)',
};

export interface ClaseAbcBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  categoria: CategoriaAbc | null | undefined;
}

/**
 * Indicador visual de la clase ABC (HU-17). El color codifica la criticidad:
 * A rojo, B amarillo, C gris. Reutilizable en el catálogo y en el reporte ABC.
 */
export const ClaseAbcBadge: React.FC<ClaseAbcBadgeProps> = ({ categoria, className, ...props }) => {
  if (!categoria) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)} title="Sin clasificar" {...props}>
        —
      </Badge>
    );
  }

  return (
    <Badge
      variant={VARIANTE_POR_CLASE[categoria]}
      className={cn('min-w-7 justify-center', className)}
      title={DESCRIPCION_POR_CLASE[categoria]}
      aria-label={DESCRIPCION_POR_CLASE[categoria]}
      {...props}
    >
      {categoria}
    </Badge>
  );
};
