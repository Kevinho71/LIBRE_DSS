import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SistemasPage } from '@/pages/dss/SistemasPage';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nombre: 'Admin', email: 'admin@test.com', rol: 'administrador', createdAt: '' },
    empresa: { id: 'e1', nombre: 'Ferretería', nit: null, plan: 'gratuito', createdAt: '' },
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
    obtenerSistemas: vi.fn(),
    obtenerAlertasMinMax: vi.fn(),
    recalcularSistemas: vi.fn(),
  },
}));

vi.mock('@/api/productos.api', () => ({
  productosApi: {
    listar: vi.fn(),
    buscar: vi.fn(),
    obtener: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    actualizarParametros: vi.fn(),
    desactivar: vi.fn(),
    importarCsv: vi.fn(),
  },
}));

import { dssApi } from '@/api/dss.api';

const mockSistemas = vi.mocked(dssApi.obtenerSistemas);
const mockAlertas = vi.mocked(dssApi.obtenerAlertasMinMax);

function renderSistemas() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SistemasPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SistemasPage (HU-23, HU-38, HU-39)', () => {
  beforeEach(() => {
    mockSistemas.mockReset();
    mockAlertas.mockReset();
  });

  it('muestra la política P/Q, la fase de arranque y las alertas Min/Max', async () => {
    mockSistemas.mockResolvedValue({
      totalProductos: 2,
      items: [
        {
          productoId: 'p1',
          sku: 'SKU-1',
          nombre: 'Cemento IP-30',
          categoriaAbc: 'A',
          politica: 'Q',
          faseArranque: 3,
          cuantitativoHabilitado: true,
          diasHistorial: 90,
          diasConVenta: 30,
          eoqCalculado: 372.1,
          ropCalculado: 70.01,
          stockSeguridadCalculado: 20.7,
          intervaloRevisionDias: null,
          nivelObjetivoT: null,
          stockMinimoManual: null,
          stockMaximoManual: null,
        },
        {
          productoId: 'p2',
          sku: 'SKU-2',
          nombre: 'Arena fina',
          categoriaAbc: 'C',
          politica: 'P',
          faseArranque: 1,
          cuantitativoHabilitado: false,
          diasHistorial: 10,
          diasConVenta: 2,
          eoqCalculado: null,
          ropCalculado: null,
          stockSeguridadCalculado: null,
          intervaloRevisionDias: null,
          nivelObjetivoT: null,
          stockMinimoManual: 20,
          stockMaximoManual: 200,
        },
      ],
    });

    mockAlertas.mockResolvedValue({
      totalAlertas: 1,
      alertas: [
        {
          productoId: 'p2',
          sku: 'SKU-2',
          nombre: 'Arena fina',
          faseArranque: 1,
          tipo: 'bajo_minimo',
          stockActual: 15,
          stockMinimoManual: 20,
          stockMaximoManual: 200,
          cantidadSugerida: 185,
        },
      ],
    });

    renderSistemas();

    await waitFor(() => expect(screen.getByText('Cemento IP-30')).toBeInTheDocument());
    expect(screen.getByText('Sistema Q')).toBeInTheDocument();
    expect(screen.getByText('Sistema P')).toBeInTheDocument();
    expect(screen.getByText('Fase 3 · activo')).toBeInTheDocument();
    expect(screen.getByText('Heurístico (Min/Max manual)')).toBeInTheDocument();
    expect(screen.getByText('Bajo mínimo')).toBeInTheDocument();
    expect(screen.getByText('185')).toBeInTheDocument();
  });

  it('abre el formulario de umbrales Min/Max de un producto en arranque en frío', async () => {
    mockSistemas.mockResolvedValue({
      totalProductos: 1,
      items: [
        {
          productoId: 'p2',
          sku: 'SKU-2',
          nombre: 'Arena fina',
          categoriaAbc: 'C',
          politica: 'P',
          faseArranque: 1,
          cuantitativoHabilitado: false,
          diasHistorial: 10,
          diasConVenta: 2,
          eoqCalculado: null,
          ropCalculado: null,
          stockSeguridadCalculado: null,
          intervaloRevisionDias: null,
          nivelObjetivoT: null,
          stockMinimoManual: 20,
          stockMaximoManual: 200,
        },
      ],
    });
    mockAlertas.mockResolvedValue({ totalAlertas: 0, alertas: [] });

    renderSistemas();

    const boton = await screen.findByRole('button', { name: /editar umbrales min\/max de arena fina/i });
    boton.click();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/umbrales min\/max manuales/i)).toBeInTheDocument();
  });
});
