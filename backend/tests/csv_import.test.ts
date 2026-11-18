import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productosService } from '../src/modules/productos/productos.service';
import { productosRepository } from '../src/modules/productos/productos.repository';
import { ValidationError } from '../src/shared/errors/AppError';

describe('Importador CSV de Catálogo (LIB-19 / HU-10)', () => {
  const empresaId = 'empresa-test-uuid';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('importa exitosamente un CSV válido mapeando columnas a productos', async () => {
    const csvContent = `sku,nombre,costo_unitario,precio_venta,stock_actual
SKU-A,Cemento Viacha,50.00,65.00,100
SKU-B,"Fierro Corrugado 1/2, 12m",45.50,58.00,50`;

    vi.spyOn(productosRepository, 'findBySkus').mockResolvedValue([]);
    vi.spyOn(productosRepository, 'getEmpresaPlan').mockResolvedValue('gratuito');
    vi.spyOn(productosRepository, 'countActivos').mockResolvedValue(5); // cupo = 10
    const bulkSpy = vi.spyOn(productosRepository, 'bulkInsert').mockResolvedValue(2);

    const resultado = await productosService.importarCsv(empresaId, { contenido: csvContent });

    expect(resultado.importados).toBe(2);
    expect(resultado.omitidos).toBe(0);
    expect(resultado.avisoFreemium).toBeNull();
    expect(bulkSpy).toHaveBeenCalledOnce();
    expect(bulkSpy).toHaveBeenCalledWith(
      empresaId,
      expect.arrayContaining([
        expect.objectContaining({
          sku: 'SKU-A',
          nombre: 'Cemento Viacha',
          costoUnitario: 50,
          precioVenta: 65,
          stockActual: 100,
        }),
        expect.objectContaining({
          sku: 'SKU-B',
          nombre: 'Fierro Corrugado 1/2, 12m',
          costoUnitario: 45.5,
          precioVenta: 58,
          stockActual: 50,
        }),
      ])
    );
  });

  it('rechaza con ValidationError si el archivo CSV está vacío', async () => {
    await expect(
      productosService.importarCsv(empresaId, { contenido: '' })
    ).rejects.toThrow(ValidationError);
  });

  it('rechaza con ValidationError (all-or-nothing) si alguna fila contiene datos inválidos', async () => {
    const csvContent = `sku,nombre,costo_unitario,precio_venta,stock_actual
SKU-01,Producto Válido,10.00,15.00,20
SKU-02,,10.00,15.00,20
SKU-03,Precio Negativo,-5.00,10.00,5`;

    await expect(
      productosService.importarCsv(empresaId, { contenido: csvContent })
    ).rejects.toThrow(ValidationError);
  });

  it('omite SKUs duplicados en el mismo archivo y contra la base de datos', async () => {
    const csvContent = `sku,nombre,costo_unitario,precio_venta,stock_actual
SKU-DUP,Producto Primero,10.00,15.00,10
SKU-DUP,Producto Repetido en CSV,10.00,15.00,10
SKU-EN-BD,Producto Ya en BD,20.00,30.00,10
SKU-NUEVO,Producto Nuevo,30.00,45.00,10`;

    vi.spyOn(productosRepository, 'findBySkus').mockResolvedValue(['SKU-EN-BD']);
    vi.spyOn(productosRepository, 'getEmpresaPlan').mockResolvedValue('pago');
    const bulkSpy = vi.spyOn(productosRepository, 'bulkInsert').mockResolvedValue(2);

    const resultado = await productosService.importarCsv(empresaId, { contenido: csvContent });

    expect(resultado.importados).toBe(2);
    expect(resultado.omitidos).toBe(2); // 1 duplicado en CSV + 1 ya existente en BD
    expect(resultado.omitidosDetalle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sku: 'SKU-DUP', motivo: 'SKU_DUPLICADO' }),
        expect.objectContaining({ sku: 'SKU-EN-BD', motivo: 'SKU_DUPLICADO' }),
      ])
    );
    expect(bulkSpy).toHaveBeenCalledWith(
      empresaId,
      expect.arrayContaining([
        expect.objectContaining({ sku: 'SKU-DUP', nombre: 'Producto Primero' }),
        expect.objectContaining({ sku: 'SKU-NUEVO', nombre: 'Producto Nuevo' }),
      ])
    );
  });

  it('trunca al cupo freemium disponible y emite aviso de filas omitidas si excede 15 SKUs', async () => {
    // 5 filas válidas en CSV
    const lineas = [
      'sku,nombre,costo_unitario,precio_venta,stock_actual',
      'SKU-1,Prod 1,10,20,5',
      'SKU-2,Prod 2,10,20,5',
      'SKU-3,Prod 3,10,20,5',
      'SKU-4,Prod 4,10,20,5',
      'SKU-5,Prod 5,10,20,5',
    ].join('\n');

    vi.spyOn(productosRepository, 'findBySkus').mockResolvedValue([]);
    vi.spyOn(productosRepository, 'getEmpresaPlan').mockResolvedValue('gratuito');
    // Ya tiene 12 activos en catálogo gratuito, solo quedan 3 disponibles (15 - 12 = 3)
    vi.spyOn(productosRepository, 'countActivos').mockResolvedValue(12);
    const bulkSpy = vi.spyOn(productosRepository, 'bulkInsert').mockResolvedValue(3);

    const resultado = await productosService.importarCsv(empresaId, { contenido: lineas });

    expect(resultado.importados).toBe(3);
    expect(resultado.omitidos).toBe(2);
    expect(resultado.avisoFreemium).toContain('El plan gratuito permite 15 SKUs');
    expect(resultado.avisoFreemium).toContain('Se importaron 3 y se omitieron 2');
    expect(resultado.omitidosDetalle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sku: 'SKU-4', motivo: 'LIMITE_SKUS' }),
        expect.objectContaining({ sku: 'SKU-5', motivo: 'LIMITE_SKUS' }),
      ])
    );
    expect(bulkSpy).toHaveBeenCalledWith(
      empresaId,
      expect.arrayContaining([
        expect.objectContaining({ sku: 'SKU-1' }),
        expect.objectContaining({ sku: 'SKU-2' }),
        expect.objectContaining({ sku: 'SKU-3' }),
      ])
    );
  });
});
