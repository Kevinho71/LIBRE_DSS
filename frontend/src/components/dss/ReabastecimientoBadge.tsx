import React from 'react';
import { AlertTriangle, CheckCircle2, PackageX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SeveridadReabastecimiento = 'critico' | 'reabastecer' | 'ok';

/**
 * Evalúa la severidad de reabastecimiento comparando la posición de inventario
 * (stock + en tránsito) contra el punto de reorden (HU-21, HU-22). Es una función
 * pura para poder reutilizarse en el catálogo, el panel de alertas y los tests.
 */
export function evaluarSeveridadReabastecimiento(
  posicionInventario: number,
  ropCalculado: number
): SeveridadReabastecimiento {
  if (posicionInventario <= 0) return 'critico';
  if (posicionInventario < ropCalculado) return 'reabastecer';
  return 'ok';
}

const CONFIG: Record<
  SeveridadReabastecimiento,
  { variant: 'destructive' | 'claseB' | 'success'; label: string; Icon: typeof AlertTriangle }
> = {
  critico: { variant: 'destructive', label: 'Sin stock', Icon: PackageX },
  reabastecer: { variant: 'claseB', label: 'Reabastecer', Icon: AlertTriangle },
  ok: { variant: 'success', label: 'Stock OK', Icon: CheckCircle2 },
};

export interface ReabastecimientoBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  posicionInventario: number;
  ropCalculado: number;
}

/**
 * Badge de reabastecimiento reutilizable en listados (HU-22). Indica si un
 * producto está sin stock, por debajo del ROP o con cobertura suficiente.
 */
export const ReabastecimientoBadge: React.FC<ReabastecimientoBadgeProps> = ({
  posicionInventario,
  ropCalculado,
  className,
  ...props
}) => {
  const severidad = evaluarSeveridadReabastecimiento(posicionInventario, ropCalculado);
  const { variant, label, Icon } = CONFIG[severidad];

  return (
    <Badge variant={variant} className={cn('gap-1', className)} title={`${label} · ROP ${ropCalculado}`} {...props}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};
