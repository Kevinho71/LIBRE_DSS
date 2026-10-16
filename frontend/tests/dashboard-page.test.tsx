import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nombre: 'Kevin', email: 'kevin@test.com', rol: 'administrador', createdAt: '' },
    empresa: { id: 'e1', nombre: 'Pachiplac', nit: '123', plan: 'gratuito', createdAt: '' },
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/api/dashboard.api', () => ({
  dashboardApi: {
    obtenerKpis: vi.fn(),
    obtenerReporteCostos: vi.fn(),
  },
}));

vi.mock('@/api/dss.api', () => ({
  dssApi: {
    obtenerAlertas: vi.fn().mockResolvedValue({ totalAlertas: 0, porCriticidad: [], alertas: [] }),
  },
}));

// recharts no se renderiza de forma fiable en jsdom; se sustituyen los gráficos por stubs.
vi.mock('@/components/dashboard/DashboardCharts', () => ({
  default: () => (
    <>
      <div data-testid="chart-valor" />
      <div data-testid="chart-cobertura" />
    </>
  ),
}));

import { dashboardApi } from '@/api/dashboard.api';

const mockKpis = vi.mocked(dashboardApi.obtenerKpis);

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage (HU-26)', () => {
  beforeEach(() => {
    mockKpis.mockReset();
  });

  it('muestra los KPIs ejecutivos y los gráficos del inventario', async () => {
    mockKpis.mockResolvedValue({
      fecha: '2026-02-01T10:00:00.000Z',
      plan: 'gratuito',
      limiteSku: 15,
      productosActivos: 8,
      valorInventario: 12500,
      skusEnAlerta: 2,
      mermasMes: { cantidad: 4, valorEstimado: 320 },
      ahorroEstimadoProyectado: 1500,
    });

    renderDashboard();

    expect(await screen.findByText('Productos activos')).toBeInTheDocument();
    expect(screen.getByText('Valor de inventario')).toBeInTheDocument();
    expect(screen.getByText('SKUs en alerta')).toBeInTheDocument();
    expect(screen.getByText('Ahorro estimado')).toBeInTheDocument();
    expect(screen.getByText('Mermas del mes')).toBeInTheDocument();
    expect(screen.getByText('de 15 SKUs del plan gratuito')).toBeInTheDocument();
    expect(await screen.findByTestId('chart-valor')).toBeInTheDocument();
    expect(await screen.findByTestId('chart-cobertura')).toBeInTheDocument();
  });
});
