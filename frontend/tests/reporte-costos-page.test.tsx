import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReporteCostosPage } from '@/pages/reportes/ReporteCostosPage';

vi.mock('@/api/dashboard.api', () => ({
  dashboardApi: {
    obtenerKpis: vi.fn(),
    obtenerReporteCostos: vi.fn(),
  },
}));

// recharts no se renderiza de forma fiable en jsdom; se sustituye el gráfico por un stub.
vi.mock('@/components/reportes/ComparativoCostosChart', () => ({
  ComparativoCostosChart: () => <div data-testid="chart-comparativo" />,
}));

import { dashboardApi } from '@/api/dashboard.api';

const mockReporte = vi.mocked(dashboardApi.obtenerReporteCostos);

const comparativo = (nombre: string, costoTotal: number) => ({
  nombre,
  costoOrdenar: 100,
  costoMantener: 200,
  costoVentaPerdida: 50,
  costoTotal,
  nivelServicio: 95,
  numeroPedidos: 4,
});

function renderReporte() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReporteCostosPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ReporteCostosPage (HU-27)', () => {
  beforeEach(() => {
    mockReporte.mockReset();
  });

  it('muestra el comparativo, la conclusión y el detalle por producto', async () => {
    mockReporte.mockResolvedValue({
      fechaGeneracion: '2026-02-01T10:00:00.000Z',
      diasAnalizados: 30,
      totalProductos: 1,
      politicaEmpirica: comparativo('empirica', 350),
      politicaDss: comparativo('dss', 300),
      ahorroTotal: 50,
      ahorroPorcentual: 14.29,
      conclusion: 'La política DSS reduce los costos totales frente a la política empírica tradicional.',
      productos: [
        {
          productoId: 'p1',
          sku: 'CEM-30',
          nombre: 'Cemento IP-30',
          dias: 30,
          demandaTotal: 240,
          politicaEmpirica: comparativo('empirica', 350),
          politicaDss: comparativo('dss', 300),
          ahorro: 50,
          ahorroPorcentual: 14.29,
        },
      ],
    });

    renderReporte();

    expect(await screen.findByText('Ahorro total')).toBeInTheDocument();
    expect(screen.getByText('Conclusión')).toBeInTheDocument();
    expect(screen.getByText(/la política dss reduce los costos/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Cemento IP-30')).toBeInTheDocument());
    expect(await screen.findByTestId('chart-comparativo')).toBeInTheDocument();
  });

  it('avisa cuando no hay productos con parámetros vigentes', async () => {
    mockReporte.mockResolvedValue({
      fechaGeneracion: '2026-02-01T10:00:00.000Z',
      diasAnalizados: 30,
      totalProductos: 0,
      politicaEmpirica: comparativo('empirica', 0),
      politicaDss: comparativo('dss', 0),
      ahorroTotal: 0,
      ahorroPorcentual: 0,
      conclusion: 'No se encontraron productos con parámetros vigentes para analizar.',
      productos: [],
    });

    renderReporte();

    await waitFor(() =>
      expect(screen.getByText(/no hay productos con parámetros de inventario vigentes/i)).toBeInTheDocument()
    );
  });
});
