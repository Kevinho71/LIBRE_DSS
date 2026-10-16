import React from 'react';
import { Activity, Hourglass, Snowflake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FaseArranque } from '@libredss/shared';

const CONFIG: Record<
  FaseArranque,
  { variant: 'claseC' | 'claseB' | 'success'; label: string; descripcion: string; Icon: typeof Snowflake }
> = {
  1: {
    variant: 'claseC',
    label: 'Fase 1 · Min/Max',
    descripcion: '< 30 días de historial: política heurística Min/Max manual (HU-38)',
    Icon: Snowflake,
  },
  2: {
    variant: 'claseB',
    label: 'Fase 2 · recopilación',
    descripcion: '30–59 días o < 20 días con venta: recopilación de varianza (HU-39)',
    Icon: Hourglass,
  },
  3: {
    variant: 'success',
    label: 'Fase 3 · activo',
    descripcion: '≥ 60 días y ≥ 20 días con venta: motor cuantitativo EOQ/ROP activo (HU-39)',
    Icon: Activity,
  },
};

export const ETIQUETA_FASE: Record<FaseArranque, string> = {
  1: CONFIG[1].label,
  2: CONFIG[2].label,
  3: CONFIG[3].label,
};

export interface FaseArranqueBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  fase: FaseArranque | null | undefined;
}

/** Fase del ciclo de vida del SKU: Min/Max, recopilación o motor activo (HU-39). */
export const FaseArranqueBadge: React.FC<FaseArranqueBadgeProps> = ({ fase, className, ...props }) => {
  if (!fase) return null;

  const { variant, label, descripcion, Icon } = CONFIG[fase];

  return (
    <Badge variant={variant} className={cn('gap-1', className)} title={descripcion} {...props}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};
