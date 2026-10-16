import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AlertasPage } from '@/pages/alertas/AlertasPage';

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
    obtenerAlertas: vi.fn(),
    recalcularEoqRop: vi.fn(),
    explicarAlerta: vi.fn(),
  },
}));

import { dssApi } from '@/api/dss.api';

const mockAlertas = vi.mocked(dssApi.obtenerAlertas);
const mockRecalcular = vi.mocked(dssApi.recalcularEoqRop);
const mockExplicar = vi.mocked(dssApi.explicarAlerta);

function renderAlertas() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AlertasPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AlertasPage (HU-21, HU-22)', () => {
  beforeEach(() => {
    mockAlertas.mockReset();
    mockRecalcular.mockReset();
    mockExplicar.mockReset();
  });

  it('lista las alertas priorizadas con estado, dÃ©ficit y cantidad sugerida (EOQ)', async () => {
    mockAlertas.mockResolvedValue({
      totalAlertas: 2,
      porCriticidad: [
        { categoria: 'A', cantidad: 1 },
        { categoria: 'B', cantidad: 1 },
      ],
      alertas: [
        {
          productoId: 'p1',
          sku: 'SKU-1',
          nombre: 'Cemento IP-30',
          categoriaAbc: 'A',
          stockActual: 5,
          enTransito: 0,
          posicionInventario: 5,
          ropCalculado: 70.01,
          stockSeguridad: 20.7,
          eoqSugerido: 372.1,
          deficit: 65.01,
        },
        {
          productoId: 'p2',
          sku: null,
          nombre: 'Arena fina',
          categoriaAbc: 'B',
          stockActual: 0,
          enTransito: 0,
          posicionInventario: 0,
          ropCalculado: 40,
          stockSeguridad: 12,
          eoqSugerido: 150,
          deficit: 40,
        },
      ],
    });

    renderAlertas();

    await waitFor(() => expect(screen.getByText('Cemento IP-30')).toBeInTheDocument());
    expect(screen.getByText('Arena fina')).toBeInTheDocument();
    expect(screen.getByText('372.10')).toBeInTheDocument();
    expect(screen.getByText('65.01')).toBeInTheDocument();
    expect(screen.getByText('Reabastecer')).toBeInTheDocument();
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recalcular eoq/i })).toBeInTheDocument();
  });

  it('muestra el aviso cuando no hay alertas de reabastecimiento', async () => {
    mockAlertas.mockResolvedValue({ totalAlertas: 0, porCriticidad: [], alertas: [] });

    renderAlertas();

    await waitFor(() =>
      expect(screen.getByText(/no hay alertas de reabastecimiento/i)).toBeInTheDocument()
    );
  });

  it('dispara el recÃ¡lculo de EOQ/ROP al pulsar el botÃ³n de administrador', async () => {
    mockAlertas.mockResolvedValue({ totalAlertas: 0, porCriticidad: [], alertas: [] });
    mockRecalcular.mockResolvedValue({
      jobId: 'job-1',
      productosProcesados: 3,
      productosConParametrosCuantitativos: 3,
      fechaCalculo: '2026-02-01T10:00:00.000Z',
    });

    renderAlertas();

    const boton = await screen.findByRole('button', { name: /recalcular eoq/i });
    boton.click();

    await waitFor(() => expect(mockRecalcular).toHaveBeenCalledTimes(1));
  });

  it('muestra la explicación en lenguaje natural de una alerta (HU-34)', async () => {
    mockAlertas.mockResolvedValue({
      totalAlertas: 1,
      porCriticidad: [{ categoria: 'A', cantidad: 1 }],
      alertas: [
        {
          productoId: 'p1',
          sku: 'SKU-1',
          nombre: 'Cemento IP-30',
          categoriaAbc: 'A',
          stockActual: 5,
          enTransito: 0,
          posicionInventario: 5,
          ropCalculado: 70.01,
          stockSeguridad: 20.7,
          eoqSugerido: 372.1,
          deficit: 65.01,
        },
      ],
    });
    mockExplicar.mockResolvedValue({
      productoId: 'p1',
      sku: 'SKU-1',
      nombre: 'Cemento IP-30',
      explicacion: 'Repón el cemento porque su posición de inventario cayó bajo el punto de reorden.',
      fuente: 'plantilla',
    });

    renderAlertas();

    const boton = await screen.findByRole('button', { name: /explicar alerta de cemento ip-30/i });
    boton.click();

    expect(await screen.findByText(/cayó bajo el punto de reorden/i)).toBeInTheDocument();
    expect(mockExplicar).toHaveBeenCalledWith('p1');
  });
});

