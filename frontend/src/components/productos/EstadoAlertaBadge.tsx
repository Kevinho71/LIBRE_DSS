import React from 'react';
import { AlertTriangle, CheckCircle2, PackageX, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EstadoAlerta } from '@libredss/shared';

const CONFIG: Record<
  EstadoAlerta,
  { variant: 'success' | 'claseB' | 'claseA' | 'destructive'; label: string; Icon: typeof AlertTriangle }
> = {
  normal: { variant: 'success', label: 'Normal', Icon: CheckCircle2 },
  stock_minimo: { variant: 'claseB', label: 'Stock mínimo', Icon: AlertTriangle },
  rop_alcanzado: { variant: 'claseA', label: 'Bajo ROP', Icon: TrendingDown },
  sin_stock: { variant: 'destructive', label: 'Sin stock', Icon: PackageX },
};

export const ETIQUETA_ESTADO_ALERTA: Record<EstadoAlerta, string> = {
  normal: CONFIG.normal.label,
  stock_minimo: CONFIG.stock_minimo.label,
  rop_alcanzado: CONFIG.rop_alcanzado.label,
  sin_stock: CONFIG.sin_stock.label,
};

export interface EstadoAlertaBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  estado: EstadoAlerta | null | undefined;
}

/**
 * Semáforo de stock del catálogo (HU-09): normal, stock mínimo, bajo ROP o sin
 * stock. El color y el icono codifican la urgencia de reposición.
 */
export const EstadoAlertaBadge: React.FC<EstadoAlertaBadgeProps> = ({ estado, className, ...props }) => {
  if (!estado) return null;

  const { variant, label, Icon } = CONFIG[estado];

  return (
    <Badge variant={variant} className={cn('gap-1', className)} title={label} {...props}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};
