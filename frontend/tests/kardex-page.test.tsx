import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { KardexPage } from '@/pages/transacciones/KardexPage';

vi.mock('@/api/transacciones.api', () => ({
  transaccionesApi: {
    listar: vi.fn(),
    obtenerPorNota: vi.fn(),
    actualizarPago: vi.fn(),
    actualizarPagoPorNota: vi.fn(),
    registrarVentaBatch: vi.fn(),
    registrarIngreso: vi.fn(),
    registrarAjuste: vi.fn(),
    registrarDevolucion: vi.fn(),
  },
}));

import { transaccionesApi } from '@/api/transacciones.api';

const mockListar = vi.mocked(transaccionesApi.listar);

function renderKardex() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <KardexPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('KardexPage (HU-14)', () => {
  beforeEach(() => {
    mockListar.mockReset();
  });

  it('renderiza los movimientos devueltos por la API', async () => {
    mockListar.mockResolvedValue({
      data: [
        {
          id: 't1',
          empresaId: 'e1',
          notaId: null,
          productoId: 'p1',
          tipo: 'venta',
          cantidad: 3,
          costoUnitarioHistorico: 5,
          precioVentaHistorico: 8,
          motivo: null,
          estadoPago: 'contado',
          llaveIdempotencia: null,
          fechaEvento: '2026-02-01',
          fechaRegistro: '2026-02-01T10:00:00.000Z',
          producto: { id: 'p1', sku: 'SKU-9', nombre: 'Melamina 4mm', unidadMedida: 'unidad' },
        },
      ],
      paginacion: { total: 1, pagina: 1, limite: 20, totalPaginas: 1 },
    });

    renderKardex();

    await waitFor(() => expect(screen.getByText('Melamina 4mm')).toBeInTheDocument());
    // "Venta" aparece tanto como etiqueta de la transacción como en el filtro de tipo.
    expect(screen.getAllByText('Venta').length).toBeGreaterThan(0);
    expect(screen.getByText(/1 registro\(s\)/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /nueva venta/i })).toBeInTheDocument();
  });

  it('muestra un mensaje vacío cuando no hay movimientos', async () => {
    mockListar.mockResolvedValue({
      data: [],
      paginacion: { total: 0, pagina: 1, limite: 20, totalPaginas: 1 },
    });

    renderKardex();

    await waitFor(() =>
      expect(screen.getByText(/no hay movimientos para los filtros seleccionados/i)).toBeInTheDocument()
    );
  });
});
