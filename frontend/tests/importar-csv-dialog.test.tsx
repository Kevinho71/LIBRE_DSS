import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ImportarCsvDialog } from '@/components/productos/ImportarCsvDialog';
import { ApiError } from '@/api/client';

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

import { productosApi } from '@/api/productos.api';

const mockImportar = vi.mocked(productosApi.importarCsv);

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ImportarCsvDialog open onOpenChange={() => {}} />
    </QueryClientProvider>
  );
}

describe('ImportarCsvDialog (HU-10)', () => {
  beforeEach(() => {
    mockImportar.mockReset();
  });

  it('importa el CSV pegado y muestra el resumen con aviso freemium y omitidos', async () => {
    mockImportar.mockResolvedValue({
      importados: 2,
      omitidos: 1,
      avisoFreemium: 'El plan gratuito permite 15 SKUs.',
      omitidosDetalle: [{ fila: 3, sku: 'CEM-30', motivo: 'LIMITE_SKUS' }],
    });

    renderDialog();

    const textarea = screen.getByLabelText(/contenido csv/i);
    fireEvent.change(textarea, { target: { value: 'nombre,sku\nCemento,CEM-1' } });

    screen.getByRole('button', { name: /importar/i }).click();

    await waitFor(() => expect(screen.getByText(/2 producto\(s\) importado\(s\)/i)).toBeInTheDocument());
    expect(screen.getByText(/el plan gratuito permite 15 skus/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('CEM-30')).toBeInTheDocument());
    expect(screen.getByText('Límite freemium')).toBeInTheDocument();
  });

  it('muestra las filas inválidas cuando el backend rechaza el archivo', async () => {
    mockImportar.mockRejectedValue(
      new ApiError(422, 'CSV_FILAS_INVALIDAS', 'Se encontraron filas con datos inválidos.', [
        { fila: 2, mensaje: 'precioVenta: el precio de venta debe ser mayor a 0' },
      ] as unknown as Record<string, string[]>)
    );

    renderDialog();

    const textarea = screen.getByLabelText(/contenido csv/i);
    fireEvent.change(textarea, { target: { value: 'nombre,costo_unitario\nCemento,0' } });

    screen.getByRole('button', { name: /importar/i }).click();

    await waitFor(() => expect(screen.getByText(/no se importó ningún producto/i)).toBeInTheDocument());
    expect(screen.getByText(/fila 2: precioVenta/i)).toBeInTheDocument();
  });
});
