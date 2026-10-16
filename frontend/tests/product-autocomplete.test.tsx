import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductAutocomplete } from '@/components/transacciones/ProductAutocomplete';
import type { ProductoBusqueda } from '@/api/productos.api';

vi.mock('@/api/productos.api', () => ({
  productosApi: { buscar: vi.fn() },
}));

import { productosApi } from '@/api/productos.api';

const mockBuscar = vi.mocked(productosApi.buscar);

const TORNILLO: ProductoBusqueda = {
  id: 'p1',
  sku: 'SKU-1',
  nombre: 'Tornillo Drywall',
  precioVenta: 2.5,
  costoUnitario: 1,
  stockActual: 100,
  unidadMedida: 'unidad',
  factorConversion: 1,
  unidadCompra: null,
};

function renderConQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ProductAutocomplete (HU-15)', () => {
  beforeEach(() => {
    mockBuscar.mockReset();
  });

  it('busca por texto y permite seleccionar un resultado', async () => {
    mockBuscar.mockResolvedValue({ items: [TORNILLO], total: 1 });
    const onChange = vi.fn();

    renderConQuery(<ProductAutocomplete value={null} onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tor' } });

    await waitFor(() => expect(screen.getByText('Tornillo Drywall')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByText('Tornillo Drywall'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('no busca con menos de 2 caracteres', async () => {
    renderConQuery(<ProductAutocomplete value={null} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 't' } });
    await new Promise((r) => setTimeout(r, 400));
    expect(mockBuscar).not.toHaveBeenCalled();
  });

  it('muestra el producto seleccionado y permite cambiarlo', () => {
    const onChange = vi.fn();
    renderConQuery(<ProductAutocomplete value={TORNILLO} onChange={onChange} />);

    expect(screen.getByText('Tornillo Drywall')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cambiar producto/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
