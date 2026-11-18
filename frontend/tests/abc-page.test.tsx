import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AbcPage } from '@/pages/abc/AbcPage';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nombre: 'Admin', email: 'admin@test.com', rol: 'administrador', createdAt: '' },
    empresa: null,
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/api/dss.api', () => ({
  dssApi: {
    obtenerResumenAbc: vi.fn(),
    obtenerPareto: vi.fn(),
    recalcularAbc: vi.fn(),
  },
}));

// El gráfico de recharts no se renderiza de forma fiable en jsdom; se sustituye por un stub.
vi.mock('@/components/abc/ParetoChart', () => ({
  ParetoChart: ({ filas }: { filas: unknown[] }) => <div data-testid="pareto-chart">{filas.length} filas</div>,
}));

import { dssApi } from '@/api/dss.api';

const mockResumen = vi.mocked(dssApi.obtenerResumenAbc);
const mockPareto = vi.mocked(dssApi.obtenerPareto);

function renderAbc() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AbcPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AbcPage (HU-18)', () => {
  beforeEach(() => {
    mockResumen.mockReset();
    mockPareto.mockReset();
  });

  it('renderiza la distribución por clase y la curva de Pareto', async () => {
    mockResumen.mockResolvedValue({
      jobId: 'job-1',
      totalProductos: 3,
      valorConsumoTotal: 10000,
      fechaCalculo: '2026-02-01T10:00:00.000Z',
      clases: [
        { categoria: 'A', cantidadProductos: 1, valorConsumo: 8000, porcentajeValor: 80 },
        { categoria: 'B', cantidadProductos: 1, valorConsumo: 1500, porcentajeValor: 15 },
        { categoria: 'C', cantidadProductos: 1, valorConsumo: 500, porcentajeValor: 5 },
      ],
    });
    mockPareto.mockResolvedValue({
      jobId: 'job-1',
      totalProductos: 2,
      valorConsumoTotal: 9500,
      fechaCalculo: '2026-02-01T10:00:00.000Z',
      filas: [
        {
          productoId: 'p1',
          sku: 'SKU-A',
          nombre: 'Cemento IP-30',
          categoria: 'A',
          valorConsumoAnual: 8000,
          porcentajeValor: 84.21,
          porcentajeAcumulado: 84.21,
        },
        {
          productoId: 'p2',
          sku: 'SKU-B',
          nombre: 'Arena fina',
          categoria: 'B',
          valorConsumoAnual: 1500,
          porcentajeValor: 15.79,
          porcentajeAcumulado: 100,
        },
      ],
    });

    renderAbc();

    await waitFor(() => expect(screen.getByText('Cemento IP-30')).toBeInTheDocument());
    expect(screen.getByText('Arena fina')).toBeInTheDocument();
    expect(screen.getAllByText('84.21%').length).toBeGreaterThan(0);
    expect(screen.getByText('100.00%')).toBeInTheDocument();
    expect(await screen.findByTestId('pareto-chart')).toHaveTextContent('2 filas');
    expect(screen.getByRole('button', { name: /recalcular clasificación/i })).toBeInTheDocument();
  });

  it('muestra el aviso cuando aún no hay productos clasificados', async () => {
    mockResumen.mockResolvedValue({
      jobId: null,
      totalProductos: 0,
      valorConsumoTotal: 0,
      fechaCalculo: null,
      clases: [],
    });
    mockPareto.mockResolvedValue({
      jobId: null,
      totalProductos: 0,
      valorConsumoTotal: 0,
      fechaCalculo: null,
      filas: [],
    });

    renderAbc();

    await waitFor(() =>
      expect(screen.getByText(/aún no hay productos clasificados/i)).toBeInTheDocument()
    );
  });
});
