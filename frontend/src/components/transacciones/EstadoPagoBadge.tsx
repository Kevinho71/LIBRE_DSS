import React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { labelEstadoPago } from '@/lib/format';
import type { EstadoPagoTransaccion } from '@libredss/shared';

const VARIANTE_POR_ESTADO: Record<string, NonNullable<BadgeProps['variant']>> = {
  contado: 'secondary',
  credito_pendiente: 'claseB',
  credito_pagado: 'success',
};

export const EstadoPagoBadge: React.FC<{ estado: EstadoPagoTransaccion | string; className?: string }> = ({
  estado,
  className,
}) => (
  <Badge variant={VARIANTE_POR_ESTADO[estado] ?? 'outline'} className={className}>
    {labelEstadoPago(estado)}
  </Badge>
);
