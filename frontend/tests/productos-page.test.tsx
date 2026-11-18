import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProductosPage } from '@/pages/catalogo/ProductosPage';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nombre: 'Admin', email: 'admin@test.com', rol: 'administrador', createdAt: '' },
    empresa: { id: 'e1', nombre: 'Ferretería Pachiplac', nit: null, plan: 'gratuito', createdAt: '' },
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/api/productos.api', () => ({
  productosApi: {
    listar: vi.fn(),
    buscar: vi.fn(),
    obtener: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    desactivar: vi.fn(),
    importarCsv: vi.fn(),
  },
}));

vi.mock('@/api/proveedores.api', () => ({
  proveedoresApi: {
    listar: vi.fn().mockResolvedValue([]),
    crear: vi.fn(),
    listarDeProducto: vi.fn().mockResolvedValue([]),
    asociar: vi.fn(),
  },
}));

import { productosApi } from '@/api/productos.api';
import type { ProductoListItemDto } from '@libredss/shared';

const mockListar = vi.mocked(productosApi.listar);

function productoBase(overrides: Partial<ProductoListItemDto> = {}): ProductoListItemDto {
  return {
    id: 'p1',
    empresaId: 'e1',
    sku: 'SKU-1',
    nombre: 'Cemento IP-30',
    unidadMedida: 'bolsa',
    unidadCompra: 'pallet',
    factorConversion: 40,
    costoUnitario: 38.5,
    precioVenta: 45,
    costoPedido: 50,
    tasaMantenimientoAnual: 0.2,
    stockActual: 0,
    stockMinimoManual: null,
    stockMaximoManual: null,
    origenDato: 'manual',
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    categoriaAbc: 'A',
    ropCalculado: 70.01,
    estadoAlerta: 'sin_stock',
    ...overrides,
  };
}

function renderProductos() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProductosPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProductosPage (HU-06 a HU-10)', () => {
  beforeEach(() => {
    mockListar.mockReset();
  });

  it('lista los productos con semáforo ABC, estado de alerta y cupo freemium', async () => {
    mockListar.mockResolvedValue({
      data: [
        productoBase({}),
        productoBase({
          id: 'p2',
          sku: 'SKU-2',
          nombre: 'Arena fina',
          categoriaAbc: 'C',
          ropCalculado: null,
          estadoAlerta: 'normal',
          stockActual: 300,
        }),
      ],
      paginacion: { total: 2, pagina: 1, limite: 15, totalPaginas: 1 },
    });

    renderProductos();

    await waitFor(() => expect(screen.getByText('Cemento IP-30')).toBeInTheDocument());
    expect(screen.getByText('Arena fina')).toBeInTheDocument();
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText(/2 de 15 SKUs usados/i)).toBeInTheDocument();
  });

  it('muestra el aviso de límite alcanzado al llegar a 15 SKUs en plan gratuito', async () => {
    mockListar.mockResolvedValue({
      data: [productoBase({})],
      paginacion: { total: 15, pagina: 1, limite: 15, totalPaginas: 1 },
    });

    renderProductos();

    await waitFor(() => expect(screen.getByText(/límite alcanzado/i)).toBeInTheDocument());
  });

  it('abre el formulario de alta al pulsar "Nuevo producto"', async () => {
    mockListar.mockResolvedValue({
      data: [],
      paginacion: { total: 0, pagina: 1, limite: 15, totalPaginas: 1 },
    });

    renderProductos();

    await waitFor(() => expect(screen.getByText(/no hay productos/i)).toBeInTheDocument());
    screen.getByRole('button', { name: /nuevo producto/i }).click();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre \*/i)).toBeInTheDocument();
  });
});
