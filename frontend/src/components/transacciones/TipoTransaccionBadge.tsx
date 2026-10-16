import React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { labelTipoTransaccion } from '@/lib/format';
import type { TipoTransaccion } from '@libredss/shared';

const VARIANTE_POR_TIPO: Record<string, NonNullable<BadgeProps['variant']>> = {
  venta: 'default',
  ingreso: 'success',
  merma: 'claseA',
  ajuste: 'claseB',
  venta_perdida: 'destructive',
  devolucion_cliente: 'claseC',
  devolucion_proveedor: 'outline',
};

export const TipoTransaccionBadge: React.FC<{ tipo: TipoTransaccion | string; className?: string }> = ({
  tipo,
  className,
}) => (
  <Badge variant={VARIANTE_POR_TIPO[tipo] ?? 'outline'} className={className}>
    {labelTipoTransaccion(tipo)}
  </Badge>
);
