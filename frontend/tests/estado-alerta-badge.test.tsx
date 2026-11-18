import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EstadoAlertaBadge, ETIQUETA_ESTADO_ALERTA } from '@/components/productos/EstadoAlertaBadge';
import type { EstadoAlerta } from '@libredss/shared';

describe('EstadoAlertaBadge (HU-09)', () => {
  it('etiqueta cada estado del semáforo de stock', () => {
    expect(ETIQUETA_ESTADO_ALERTA).toEqual({
      normal: 'Normal',
      stock_minimo: 'Stock mínimo',
      rop_alcanzado: 'Bajo ROP',
      sin_stock: 'Sin stock',
    });
  });

  it.each<EstadoAlerta>(['normal', 'stock_minimo', 'rop_alcanzado', 'sin_stock'])(
    'renderiza la etiqueta para "%s"',
    (estado) => {
      render(<EstadoAlertaBadge estado={estado} />);
      expect(screen.getByText(ETIQUETA_ESTADO_ALERTA[estado])).toBeInTheDocument();
    }
  );

  it('no renderiza nada cuando no hay estado', () => {
    const { container } = render(<EstadoAlertaBadge estado={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
