import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PoliticaRevision } from '@libredss/shared';

const CONFIG: Record<
  PoliticaRevision,
  { variant: 'freemium' | 'secondary'; label: string; descripcion: string }
> = {
  Q: { variant: 'freemium', label: 'Sistema Q', descripcion: 'Revisión continua — clases A y B (HU-23)' },
  P: { variant: 'secondary', label: 'Sistema P', descripcion: 'Revisión periódica — clase C (HU-23)' },
};

export const DESCRIPCION_POLITICA: Record<PoliticaRevision, string> = {
  Q: CONFIG.Q.descripcion,
  P: CONFIG.P.descripcion,
};

export interface PoliticaBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  politica: PoliticaRevision | null | undefined;
}

/** Política de inventario asignada: continua (Q) o periódica (P) (HU-23). */
export const PoliticaBadge: React.FC<PoliticaBadgeProps> = ({ politica, className, ...props }) => {
  if (!politica) return null;

  const { variant, label, descripcion } = CONFIG[politica];

  return (
    <Badge variant={variant} className={cn(className)} title={descripcion} {...props}>
      {label}
    </Badge>
  );
};
