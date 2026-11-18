import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProveedoresPage } from '@/pages/catalogo/ProveedoresPage';

vi.mock('@/api/proveedores.api', () => ({
  proveedoresApi: {
    listar: vi.fn(),
    crear: vi.fn(),
    listarDeProducto: vi.fn(),
    asociar: vi.fn(),
  },
}));

import { proveedoresApi } from '@/api/proveedores.api';

const mockListar = vi.mocked(proveedoresApi.listar);

function renderProveedores() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProveedoresPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProveedoresPage (HU-08)', () => {
  beforeEach(() => {
    mockListar.mockReset();
  });

  it('lista los proveedores registrados', async () => {
    mockListar.mockResolvedValue([
      { id: 'pr1', empresaId: 'e1', nombre: 'Cementos Bolivia', contacto: 'Juan', telefono: '70000000', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);

    renderProveedores();

    await waitFor(() => expect(screen.getByText('Cementos Bolivia')).toBeInTheDocument());
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('70000000')).toBeInTheDocument();
  });

  it('muestra el estado vacío y abre el formulario de alta', async () => {
    mockListar.mockResolvedValue([]);

    renderProveedores();

    await waitFor(() => expect(screen.getByText(/aún no hay proveedores/i)).toBeInTheDocument());
    screen.getByRole('button', { name: /nuevo proveedor/i }).click();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre \*/i)).toBeInTheDocument();
  });
});
