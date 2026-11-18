import React from 'react';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventarioIaPage } from '@/pages/ingesta/InventarioIaPage';
import { IaPage } from '@/pages/ingesta/IaPage';

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
      filename: 'inventario.jpg',
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

const mockExtraer = vi.mocked(ingestaApi.extraer);
const mockConfirmar = vi.mocked(ingestaApi.confirmar);
const mockPresigned = vi.mocked(storageApi.solicitarPresignedUrl);
const mockSubir = vi.mocked(storageApi.subirArchivo);
const mockCrear = vi.mocked(productosApi.crear);

function renderInventario() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InventarioIaPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function adjuntar() {
  const archivo = new File(['inv'], 'inventario.jpg', { type: 'image/jpeg' });
  fireEvent.change(screen.getByLabelText('Adjuntar imagen del inventario'), { target: { files: [archivo] } });
}

describe('Escaneo de inventario con IA (independiente de ventas)', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:inventario');
    URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    [mockExtraer, mockConfirmar, mockPresigned, mockSubir, mockCrear].forEach((m) => m.mockReset());
    mockPresigned.mockResolvedValue({ uploadUrl: 'https://s3/upload', key: 'recibos/e1/inv.jpg', expiresInSeconds: 300 });
    mockSubir.mockResolvedValue(undefined);
    mockExtraer.mockResolvedValue({
      ingestaId: 'ing-inv',
      estado: 'pendiente',
      fechaSugerida: null,
      items: [
        { descripcion: 'Pegamento 100g', cantidad: 12, precioUnitario: 6, costoUnitario: null, productoId: null, nombreProducto: null, sku: null, similitud: null },
        { descripcion: 'Cinta masking', cantidad: 4, precioUnitario: 5, costoUnitario: 3, productoId: null, nombreProducto: null, sku: null, similitud: null },
        { descripcion: 'Tornillo Drywall', cantidad: 5, precioUnitario: 8, costoUnitario: null, productoId: 'p1', nombreProducto: 'Tornillo Drywall', sku: 'SKU-1', similitud: 0.9 },
      ],
    });
    mockCrear.mockImplementation(async (dto) => ({
      id: `id-${dto.nombre}`, sku: null, nombre: dto.nombre, precioVenta: dto.precioVenta, costoUnitario: dto.costoUnitario,
      stockActual: dto.stockActual ?? 0, unidadMedida: 'unidad', factorConversion: 1, unidadCompra: null,
    }) as never);
  });

  it('pide la lectura en modo inventario, omite lo que ya existe y nunca crea una venta', async () => {
    renderInventario();
    adjuntar();
    await waitFor(() => expect(screen.getByText(/revisión del inventario/i)).toBeInTheDocument(), { timeout: 3000 });

    expect(mockExtraer).toHaveBeenCalledWith({ s3Key: 'recibos/e1/inv.jpg', modo: 'inventario' });
    expect(screen.getByText(/2 por registrar · 1 ya existen/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/fecha del recibo/i)).not.toBeInTheDocument();

    // El pegamento no trae costo: se bloquea hasta completarlo.
    fireEvent.click(screen.getByRole('button', { name: /guardar productos del inventario/i }));
    await waitFor(() => expect(screen.getByText(/indica el costo de compra/i)).toBeInTheDocument());
    expect(mockCrear).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/costo de compra/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar productos del inventario/i }));

    await waitFor(() => expect(mockCrear).toHaveBeenCalledTimes(2));
    expect(mockCrear).toHaveBeenCalledWith({
      nombre: 'Pegamento 100g', costoUnitario: 3, precioVenta: 6, stockActual: 12, origenDato: 'ocr',
    });
    expect(mockCrear).toHaveBeenCalledWith({
      nombre: 'Cinta masking', costoUnitario: 3, precioVenta: 5, stockActual: 4, origenDato: 'ocr',
    });
    await waitFor(() => expect(screen.getByText(/inventario registrado/i)).toBeInTheDocument());
    expect(screen.getByText(/2 producto\(s\) nuevo\(s\)/i)).toBeInTheDocument();
    expect(mockConfirmar).not.toHaveBeenCalled();
  });

  it('permite registrar como nuevo un producto marcado por error como existente', async () => {
    renderInventario();
    adjuntar();
    await waitFor(() => expect(screen.getByText(/revisión del inventario/i)).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /producto 3/i }));
    fireEvent.click(screen.getByRole('button', { name: /no es ese: registrarlo como nuevo/i }));
    await waitFor(() => expect(screen.getByText(/3 por registrar · 0 ya existen/i)).toBeInTheDocument());
  });
});

describe('Menú de IA', () => {
  it('ofrece dos operaciones separadas: vender e inventario', () => {
    render(
      <MemoryRouter>
        <IaPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /vender con ia/i })).toHaveAttribute('href', '/ingesta/venta');
    expect(screen.getByRole('link', { name: /escanear inventario/i })).toHaveAttribute('href', '/ingesta/inventario');
  });
});
