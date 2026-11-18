import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ReabastecimientoBadge,
  evaluarSeveridadReabastecimiento,
} from '@/components/dss/ReabastecimientoBadge';

describe('evaluarSeveridadReabastecimiento (HU-21)', () => {
  it('marca crítico cuando no hay posición de inventario', () => {
    expect(evaluarSeveridadReabastecimiento(0, 70)).toBe('critico');
    expect(evaluarSeveridadReabastecimiento(-3, 70)).toBe('critico');
  });

  it('marca reabastecer cuando la posición está bajo el ROP', () => {
    expect(evaluarSeveridadReabastecimiento(5, 70.01)).toBe('reabastecer');
  });

  it('marca ok cuando la posición cubre el ROP', () => {
    expect(evaluarSeveridadReabastecimiento(70.01, 70.01)).toBe('ok');
    expect(evaluarSeveridadReabastecimiento(120, 70)).toBe('ok');
  });
});

describe('ReabastecimientoBadge (HU-22)', () => {
  it('renderiza la etiqueta de reposición cuando el stock está bajo el ROP', () => {
    render(<ReabastecimientoBadge posicionInventario={5} ropCalculado={70} />);
    expect(screen.getByText('Reabastecer')).toBeInTheDocument();
  });

  it('renderiza "Sin stock" cuando la posición de inventario es cero', () => {
    render(<ReabastecimientoBadge posicionInventario={0} ropCalculado={70} />);
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
  });

  it('renderiza "Stock OK" cuando hay cobertura suficiente', () => {
    render(<ReabastecimientoBadge posicionInventario={100} ropCalculado={70} />);
    expect(screen.getByText('Stock OK')).toBeInTheDocument();
  });
});
