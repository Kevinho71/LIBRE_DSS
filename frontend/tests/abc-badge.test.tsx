import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClaseAbcBadge } from '@/components/abc/ClaseAbcBadge';

describe('ClaseAbcBadge (HU-17)', () => {
  it.each([
    ['A', /clase a — alta criticidad \(rojo\)/i],
    ['B', /clase b — criticidad media \(amarillo\)/i],
    ['C', /clase c — baja criticidad \(gris\)/i],
  ] as const)('muestra la clase %s con su etiqueta accesible', (categoria, etiqueta) => {
    render(<ClaseAbcBadge categoria={categoria} />);
    expect(screen.getByLabelText(etiqueta)).toHaveTextContent(categoria);
  });

  it('aplica la variante de color de la clase A (rojo)', () => {
    render(<ClaseAbcBadge categoria="A" />);
    expect(screen.getByLabelText(/alta criticidad/i)).toHaveClass('bg-red-100');
  });

  it('muestra un guion cuando el producto no está clasificado', () => {
    render(<ClaseAbcBadge categoria={null} />);
    expect(screen.getByTitle('Sin clasificar')).toHaveTextContent('—');
  });
});
