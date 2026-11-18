import React from 'react';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReceiptReviewPage } from '@/pages/ingesta/ReceiptReviewPage';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nombre: 'Operador', email: 'op@test.com', rol: 'operador', createdAt: '' },
    empresa: null,
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/api/ingesta.api', () => ({
  ingestaApi: { extraer: vi.fn(), confirmar: vi.fn() },
}));

vi.mock('@/api/storage.api', () => ({
  storageApi: { solicitarPresignedUrl: vi.fn(), subirArchivo: vi.fn() },
  getBaseUrl: () => 'http://localhost:3001',
}));

vi.mock('@/api/productos.api', () => ({
  productosApi: { crear: vi.fn(), buscar: vi.fn() },
}));

vi.mock('@/lib/imageCompression', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/imageCompression')>();
  return {
    ...actual,
    comprimirImagen: vi.fn().mockResolvedValue({
      blob: new Blob(['comprimido'], { type: 'image/jpeg' }),
      filename: 'recibo.jpg',
      contentType: 'image/jpeg',
      width: 10,
      height: 10,
      originalBytes: 20,
      comprimidoBytes: 10,
    }),
  };
});

import { ingestaApi } from '@/api/ingesta.api';
import { storageApi } from '@/api/storage.api';
import { productosApi } from '@/api/productos.api';

const mockCrearProducto = vi.mocked(productosApi.crear);
const mockBuscar = vi.mocked(productosApi.buscar);
const mockExtraer = vi.mocked(ingestaApi.extraer);
const mockConfirmar = vi.mocked(ingestaApi.confirmar);
const mockPresigned = vi.mocked(storageApi.solicitarPresignedUrl);
const mockSubir = vi.mocked(storageApi.subirArchivo);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptReviewPage />
    </QueryClientProvider>
  );
}

function adjuntarRecibo() {
  const archivo = new File(['recibo'], 'recibo.jpg', { type: 'image/jpeg' });
  const input = screen.getByLabelText('Adjuntar imagen del recibo');
  fireEvent.change(input, { target: { files: [archivo] } });
}

describe('ReceiptReviewPage (HU-37)', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:recibo');
    URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    mockExtraer.mockReset();
    mockConfirmar.mockReset();
    mockPresigned.mockReset();
    mockSubir.mockReset();
    mockCrearProducto.mockReset();
    mockBuscar.mockReset();
    mockBuscar.mockResolvedValue({ items: [], total: 0 });

    mockPresigned.mockResolvedValue({ uploadUrl: 'https://s3/upload', key: 'recibos/e1/r.jpg', expiresInSeconds: 300 });
    mockSubir.mockResolvedValue(undefined);
    mockExtraer.mockResolvedValue({
      ingestaId: 'ing-1',
      estado: 'pendiente',
      fechaSugerida: null,
      items: [
        {
          descripcion: 'tornillo drywall',
          cantidad: 3,
          precioUnitario: 8,
          productoId: 'p1',
          nombreProducto: 'Tornillo Drywall',
          sku: 'SKU-1',
          similitud: 0.78,
        },
      ],
    });
    mockConfirmar.mockResolvedValue({
      ingestaId: 'ing-1',
      estado: 'confirmada',
      transaccionesCreadas: 1,
      yaConfirmada: false,
    });
  });

  it('analiza el recibo, exige la fecha y solo persiste al confirmar', async () => {
    renderPage();
    adjuntarRecibo();

    // La extracción humana aparece y todavía no se persiste nada.
    await waitFor(() => expect(screen.getByText(/revisión de la extracción/i)).toBeInTheDocument(), { timeout: 3000 });
    expect(mockExtraer).toHaveBeenCalledWith({ s3Key: 'recibos/e1/r.jpg' });
    expect(mockConfirmar).not.toHaveBeenCalled();
    expect(screen.getByText('Tornillo Drywall')).toBeInTheDocument();

    // Sin fecha, la confirmación se bloquea y no se llama a la API.
    fireEvent.click(screen.getByRole('button', { name: /confirmar y guardar ingesta/i }));
    await waitFor(() =>
      expect(screen.getByText(/debes indicar la fecha del recibo antes de guardar/i)).toBeInTheDocument()
    );
    expect(mockConfirmar).not.toHaveBeenCalled();

    // Con la fecha confirmada, se persiste la ingesta con los ítems revisados.
    fireEvent.change(screen.getByLabelText(/fecha del recibo/i), { target: { value: '2026-02-01' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar y guardar ingesta/i }));

    await waitFor(() =>
      expect(mockConfirmar).toHaveBeenCalledWith('ing-1', {
        fechaEvento: '2026-02-01',
        items: [{ productoId: 'p1', cantidad: 3, precioVenta: 8 }],
      })
    );
    await waitFor(() => expect(screen.getByText(/ingesta confirmada/i)).toBeInTheDocument());
  });

  it('permite descartar la extracción sin confirmar', async () => {
    renderPage();
    adjuntarRecibo();

    await waitFor(() => expect(screen.getByText(/revisión de la extracción/i)).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));

    await waitFor(() => expect(screen.queryByText(/revisión de la extracción/i)).not.toBeInTheDocument());
    expect(mockConfirmar).not.toHaveBeenCalled();
  });

  it('permite agregar al catálogo un ítem sin coincidencia con costo y stock, y lo vende', async () => {
    mockExtraer.mockResolvedValue({
      ingestaId: 'ing-2',
      estado: 'pendiente',
      fechaSugerida: '2026-02-01',
      items: [
        { descripcion: 'cinta masking', cantidad: 2, precioUnitario: 5, productoId: null, nombreProducto: null, sku: null, similitud: null },
      ],
    });
    mockCrearProducto.mockResolvedValue({
      id: 'p-nuevo', sku: null, nombre: 'cinta masking', precioVenta: 5, costoUnitario: 3, stockActual: 10,
      unidadMedida: 'unidad', factorConversion: 1, unidadCompra: null,
    } as never);

    renderPage();
    adjuntarRecibo();
    await waitFor(() => expect(screen.getByText(/revisión de la extracción/i)).toBeInTheDocument(), { timeout: 3000 });

    // Sin producto ni alta, no se puede confirmar.
    fireEvent.click(screen.getByRole('button', { name: /confirmar y guardar ingesta/i }));
    await waitFor(() => expect(screen.getByText(/agrégalo como nuevo/i)).toBeInTheDocument());
    expect(mockCrearProducto).not.toHaveBeenCalled();

    // El alta se hace en un bottom sheet; el nombre y el precio llegan precargados desde la IA.
    fireEvent.click(screen.getByRole('button', { name: /agregarlo como producto nuevo/i }));
    expect(screen.getByLabelText(/^nombre/i)).toHaveValue('cinta masking');
    fireEvent.change(screen.getByLabelText(/costo de compra/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/stock disponible/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar producto/i }));

    // La tarjeta queda con el producto nuevo vinculado y nada se creó todavía.
    await waitFor(() => expect(screen.queryByLabelText(/stock disponible/i)).not.toBeInTheDocument());
    expect(mockCrearProducto).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /confirmar y guardar ingesta/i }));

    await waitFor(() =>
      expect(mockCrearProducto).toHaveBeenCalledWith({
        nombre: 'cinta masking',
        costoUnitario: 3,
        precioVenta: 5,
        stockActual: 10,
        origenDato: 'manual',
      })
    );
    await waitFor(() =>
      expect(mockConfirmar).toHaveBeenCalledWith('ing-2', {
        fechaEvento: '2026-02-01',
        items: [{ productoId: 'p-nuevo', cantidad: 2, precioVenta: 5 }],
      })
    );
  });

  it('muestra el total en vivo, la foto original y colapsa el ítem resuelto', async () => {
    renderPage();
    adjuntarRecibo();
    await waitFor(() => expect(screen.getByText(/revisión de la extracción/i)).toBeInTheDocument(), { timeout: 3000 });

    // 3 x 8 = 24 en la barra fija; el ítem coincidente llega colapsado (sin campos de edición).
    expect(screen.getByText(/total del recibo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/24/).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/cantidad/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /ver foto original/i })[0]!);
    await waitFor(() => expect(screen.getByAltText(/foto original del recibo/i)).toBeInTheDocument());
  });

  it('sugiere productos parecidos y los asigna con un toque', async () => {
    mockExtraer.mockResolvedValue({
      ingestaId: 'ing-3',
      estado: 'pendiente',
      fechaSugerida: '2026-02-01',
      items: [
        { descripcion: 'Hilos de 600 yardas', cantidad: 1, precioUnitario: 4, productoId: null, nombreProducto: null, sku: null, similitud: null },
      ],
    });
    mockBuscar.mockResolvedValue({
      items: [
        { id: 'p-hilo', sku: null, nombre: 'Hilo 500y', precioVenta: 4, costoUnitario: 2, stockActual: 9, unidadMedida: 'unidad', factorConversion: 1, unidadCompra: null },
      ],
      total: 1,
    });

    renderPage();
    adjuntarRecibo();
    await waitFor(() => expect(screen.getByText(/revisión de la extracción/i)).toBeInTheDocument(), { timeout: 3000 });

    const sugerencia = await screen.findByRole('button', { name: 'Hilo 500y' }, { timeout: 3000 });
    fireEvent.click(sugerencia);

    // Al resolverse, la tarjeta se colapsa mostrando el producto vinculado.
    await waitFor(() => expect(screen.queryByText(/la ia leyó/i)).not.toBeInTheDocument());
    expect(screen.getByText('Hilo 500y')).toBeInTheDocument();
  });
});
