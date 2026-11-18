import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VentaPage } from '@/pages/transacciones/VentaPage';
import type { ProductoBusqueda } from '@/api/productos.api';

vi.mock('@/api/productos.api', () => ({
  productosApi: { buscar: vi.fn() },
}));
vi.mock('@/offline/registrarVenta', () => ({ registrarVenta: vi.fn() }));
vi.mock('@/offline/useSalesSync', () => ({
  useSalesSync: () => ({ refrescarPendientes: vi.fn().mockResolvedValue(undefined) }),
}));

import { productosApi } from '@/api/productos.api';
import { registrarVenta } from '@/offline/registrarVenta';

const mockBuscar = vi.mocked(productosApi.buscar);
const mockRegistrar = vi.mocked(registrarVenta);

const CUADERNO: ProductoBusqueda = {
  id: 'p1',
  sku: null,
  nombre: 'Cuaderno cuadriculado',
  precioVenta: 10,
  costoUnitario: 6,
  stockActual: 50,
  unidadMedida: 'unidad',
  factorConversion: 1,
  unidadCompra: null,
};

function renderPagina() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <VentaPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function buscarYTocar() {
  fireEvent.change(screen.getByLabelText(/buscar producto/i), { target: { value: 'cua' } });
  const lista = await screen.findByRole('listbox', undefined, { timeout: 3000 });
  fireEvent.click(await within(lista).findByText('Cuaderno cuadriculado'));
}

describe('VentaPage: flujo ágil en celular', () => {
  beforeEach(() => {
    mockBuscar.mockReset();
    mockRegistrar.mockReset();
    mockBuscar.mockResolvedValue({ items: [CUADERNO], total: 1 });
  });

  it('un toque sobre el resultado agrega 1 unidad y +/- ajustan la cantidad y el total', async () => {
    renderPagina();
    await buscarYTocar();

    expect(screen.getByLabelText(/cantidad de cuaderno cuadriculado/i)).toHaveValue(1);
    expect(screen.getByText(/detalle de la nota \(1\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /más cuaderno cuadriculado/i }));
    fireEvent.click(screen.getByRole('button', { name: /más cuaderno cuadriculado/i }));
    expect(screen.getByLabelText(/cantidad de cuaderno cuadriculado/i)).toHaveValue(3);
    expect(screen.getAllByText(/30/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /menos cuaderno cuadriculado/i }));
    expect(screen.getByLabelText(/cantidad de cuaderno cuadriculado/i)).toHaveValue(2);
  });

  it('no permite superar el stock disponible', async () => {
    mockBuscar.mockResolvedValue({ items: [{ ...CUADERNO, stockActual: 1 }], total: 1 });
    renderPagina();
    await buscarYTocar();

    fireEvent.click(screen.getByRole('button', { name: /más cuaderno cuadriculado/i }));
    expect(await screen.findByText(/stock insuficiente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cantidad de cuaderno cuadriculado/i)).toHaveValue(1);
  });

  it('registra la nota con un toque y vacía el carrito', async () => {
    mockRegistrar.mockResolvedValue({
      via: 'online',
      notaId: 'abcdef123456',
      resultado: { totalItems: 1, alertas: [] },
    } as never);
    renderPagina();
    await buscarYTocar();

    fireEvent.click(screen.getByRole('button', { name: /registrar venta/i }));

    await waitFor(() => expect(mockRegistrar).toHaveBeenCalledTimes(1));
    expect(mockRegistrar.mock.calls[0][0]).toMatchObject({
      estadoPago: 'contado',
      items: [{ productoId: 'p1', cantidad: 1, precioVenta: 10 }],
    });
    expect(await screen.findByText(/venta registrada/i)).toBeInTheDocument();
    expect(screen.getByText(/detalle de la nota \(0\)/i)).toBeInTheDocument();
  });
});
