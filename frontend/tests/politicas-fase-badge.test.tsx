import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PoliticaBadge } from '@/components/dss/PoliticaBadge';
import { FaseArranqueBadge, ETIQUETA_FASE } from '@/components/dss/FaseArranqueBadge';

describe('PoliticaBadge (HU-23)', () => {
  it('muestra el sistema Q para revisión continua', () => {
    render(<PoliticaBadge politica="Q" />);
    expect(screen.getByText('Sistema Q')).toBeInTheDocument();
  });

  it('muestra el sistema P para revisión periódica', () => {
    render(<PoliticaBadge politica="P" />);
    expect(screen.getByText('Sistema P')).toBeInTheDocument();
  });
});

describe('FaseArranqueBadge (HU-39)', () => {
  it('etiqueta cada fase del ciclo de vida del SKU', () => {
    expect(ETIQUETA_FASE).toEqual({
      1: 'Fase 1 · Min/Max',
      2: 'Fase 2 · recopilación',
      3: 'Fase 3 · activo',
    });
  });

  it.each([1, 2, 3] as const)('renderiza la etiqueta de la fase %s', (fase) => {
    render(<FaseArranqueBadge fase={fase} />);
    expect(screen.getByText(ETIQUETA_FASE[fase])).toBeInTheDocument();
  });
});
