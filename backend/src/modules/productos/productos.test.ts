import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productosService } from './productos.service';
import { productosRepository } from './productos.repository';
import { ForbiddenError, ConflictError, NotFoundError } from '../../shared/errors/AppError';

describe('Productos Service Unit Tests', () => {
  const empresaId = 'empresa-test-uuid';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('crearProducto & Límite Freemium (HU-06, HU-33)', () => {
    it('debe crear un producto correctamente si el plan gratuito tiene menos de 15 SKUs', async () => {
      vi.spyOn(productosRepository, 'getEmpresaPlan').mockResolvedValue('gratuito');
      vi.spyOn(productosRepository, 'countActivos').mockResolvedValue(5);
      vi.spyOn(productosRepository, 'findBySku').mockResolvedValue(null);
      vi.spyOn(productosRepository, 'create').mockResolvedValue({
        id: 'prod-uuid-1',
        empresaId,
        sku: 'SKU-001',
        nombre: 'Caja de Tornillos 1/2',
        unidadMedida: 'unidad',
        unidadCompra: 'caja',
        factorConversion: '100.00',
        costoUnitario: '0.50',
        precioVenta: '0.80',
        costoPedido: '50.00',
        tasaMantenimientoAnual: '0.2000',
        stockActual: '100',
        stockMinimoManual: '50.00',
        stockMaximoManual: '500.00',
        origenDato: 'manual',
        deletedAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const res = await productosService.crearProducto(empresaId, {
        nombre: 'Caja de Tornillos 1/2',
        sku: 'SKU-001',
        unidadMedida: 'unidad',
        unidadCompra: 'caja',
        factorConversion: 100,
        costoUnitario: 0.50,
        precioVenta: 0.80,
        stockActual: 100,
        stockMinimoManual: 50,
      });

      expect(res.id).toBe('prod-uuid-1');
      expect(res.factorConversion).toBe(100);
      expect(res.costoUnitario).toBe(0.5);
      expect(res.precioVenta).toBe(0.8);
    });

    it('debe rechazar con ForbiddenError si la empresa en plan gratuito ya tiene 15 SKUs (HU-33)', async () => {
      vi.spyOn(productosRepository, 'getEmpresaPlan').mockResolvedValue('gratuito');
      vi.spyOn(productosRepository, 'countActivos').mockResolvedValue(15);

      await expect(
        productosService.crearProducto(empresaId, {
          nombre: 'Producto 16',
          costoUnitario: 10,
          precioVenta: 20,
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('debe permitir crear producto 16+ si la empresa tiene plan de pago', async () => {
      vi.spyOn(productosRepository, 'getEmpresaPlan').mockResolvedValue('pago');
      vi.spyOn(productosRepository, 'findBySku').mockResolvedValue(null);
      vi.spyOn(productosRepository, 'create').mockResolvedValue({
        id: 'prod-uuid-16',
        empresaId,
        sku: 'SKU-016',
        nombre: 'Producto 16 Pago',
        unidadMedida: 'unidad',
        unidadCompra: null,
        factorConversion: '1.00',
        costoUnitario: '10.00',
        precioVenta: '20.00',
        costoPedido: '50.00',
        tasaMantenimientoAnual: '0.2000',
        stockActual: '0',
        stockMinimoManual: null,
        stockMaximoManual: null,
        origenDato: 'manual',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await productosService.crearProducto(empresaId, {
        nombre: 'Producto 16 Pago',
        sku: 'SKU-016',
        costoUnitario: 10,
        precioVenta: 20,
      });

      expect(res.id).toBe('prod-uuid-16');
    });

    it('debe rechazar con ConflictError si el SKU ya existe en la misma empresa', async () => {
      vi.spyOn(productosRepository, 'getEmpresaPlan').mockResolvedValue('gratuito');
      vi.spyOn(productosRepository, 'countActivos').mockResolvedValue(2);
      vi.spyOn(productosRepository, 'findBySku').mockResolvedValue({
        id: 'otro-prod',
        empresaId,
        sku: 'SKU-EXISTE',
        nombre: 'Otro',
        unidadMedida: 'unidad',
        unidadCompra: null,
        factorConversion: '1.00',
        costoUnitario: '1.00',
        precioVenta: '2.00',
        costoPedido: '50.00',
        tasaMantenimientoAnual: '0.2000',
        stockActual: '0',
        stockMinimoManual: null,
        stockMaximoManual: null,
        origenDato: 'manual',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        productosService.crearProducto(empresaId, {
          nombre: 'Nuevo con SKU repetido',
          sku: 'SKU-EXISTE',
          costoUnitario: 10,
          precioVenta: 15,
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('actualizarProducto (HU-07)', () => {
    it('debe actualizar los parámetros y precios de reposición', async () => {
      vi.spyOn(productosRepository, 'findById').mockResolvedValue({
        id: 'prod-1',
        empresaId,
        sku: 'SKU-A',
        nombre: 'Nombre Viejo',
        unidadMedida: 'unidad',
        unidadCompra: null,
        factorConversion: '1.00',
        costoUnitario: '10.00',
        precioVenta: '15.00',
        costoPedido: '50.00',
        tasaMantenimientoAnual: '0.2000',
        stockActual: '20',
        stockMinimoManual: null,
        stockMaximoManual: null,
        origenDato: 'manual',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(productosRepository, 'update').mockResolvedValue({
        id: 'prod-1',
        empresaId,
        sku: 'SKU-A',
        nombre: 'Nombre Nuevo',
        unidadMedida: 'unidad',
        unidadCompra: null,
        factorConversion: '1.00',
        costoUnitario: '12.00', // Incremento de costo de reposición (CB-01)
        precioVenta: '18.00',
        costoPedido: '50.00',
        tasaMantenimientoAnual: '0.2000',
        stockActual: '20',
        stockMinimoManual: null,
        stockMaximoManual: null,
        origenDato: 'manual',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await productosService.actualizarProducto(empresaId, 'prod-1', {
        nombre: 'Nombre Nuevo',
        costoUnitario: 12.00,
        precioVenta: 18.00,
      });

      expect(res.nombre).toBe('Nombre Nuevo');
      expect(res.costoUnitario).toBe(12);
      expect(res.precioVenta).toBe(18);
    });

    it('debe lanzar NotFoundError si se intenta actualizar un producto inexistente', async () => {
      vi.spyOn(productosRepository, 'findById').mockResolvedValue(null);

      await expect(
        productosService.actualizarProducto(empresaId, 'prod-no-existe', { nombre: 'Nombre Valido' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('desactivarProducto (Borrado Lógico / HU-07)', () => {
    it('debe ejecutar borrado lógico marcando deletedAt', async () => {
      vi.spyOn(productosRepository, 'findById').mockResolvedValue({
        id: 'prod-1',
        empresaId,
        sku: 'SKU-1',
        nombre: 'Producto Activo',
        unidadMedida: 'unidad',
        unidadCompra: null,
        factorConversion: '1.00',
        costoUnitario: '5.00',
        precioVenta: '10.00',
        costoPedido: '50.00',
        tasaMantenimientoAnual: '0.2000',
        stockActual: '0',
        stockMinimoManual: null,
        stockMaximoManual: null,
        origenDato: 'manual',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(productosRepository, 'softDelete').mockResolvedValue(true);

      await expect(
        productosService.desactivarProducto(empresaId, 'prod-1')
      ).resolves.toBeUndefined();
    });

    it('debe lanzar NotFoundError si el producto a desactivar no existe', async () => {
      vi.spyOn(productosRepository, 'findById').mockResolvedValue(null);

      await expect(
        productosService.desactivarProducto(empresaId, 'prod-no-existe')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listarProductos & Alertas (HU-09)', () => {
    it('debe calcular correctamente los estados de alerta en el listado', async () => {
      const mockRows = [
        {
          producto: {
            id: 'p-1',
            empresaId,
            sku: 'SKU-NORMAL',
            nombre: 'Prod Normal',
            unidadMedida: 'unidad',
            unidadCompra: null,
            factorConversion: '1.00',
            costoUnitario: '10.00',
            precioVenta: '15.00',
            costoPedido: '50.00',
            tasaMantenimientoAnual: '0.2000',
            stockActual: '100',
            stockMinimoManual: '20.00',
            stockMaximoManual: null,
            origenDato: 'manual',
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          categoriaAbc: 'A',
          ropCalculado: '50.00',
        },
        {
          producto: {
            id: 'p-2',
            empresaId,
            sku: 'SKU-MINIMO',
            nombre: 'Prod Bajo Stock Minimo',
            unidadMedida: 'unidad',
            unidadCompra: null,
            factorConversion: '1.00',
            costoUnitario: '10.00',
            precioVenta: '15.00',
            costoPedido: '50.00',
            tasaMantenimientoAnual: '0.2000',
            stockActual: '15',
            stockMinimoManual: '20.00',
            stockMaximoManual: null,
            origenDato: 'manual',
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          categoriaAbc: 'B',
          ropCalculado: null,
        },
        {
          producto: {
            id: 'p-3',
            empresaId,
            sku: 'SKU-SIN-STOCK',
            nombre: 'Prod Agotado',
            unidadMedida: 'unidad',
            unidadCompra: null,
            factorConversion: '1.00',
            costoUnitario: '10.00',
            precioVenta: '15.00',
            costoPedido: '50.00',
            tasaMantenimientoAnual: '0.2000',
            stockActual: '0',
            stockMinimoManual: '10.00',
            stockMaximoManual: null,
            origenDato: 'manual',
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          categoriaAbc: 'C',
          ropCalculado: '15.00',
        },
      ];

      vi.spyOn(productosRepository, 'findList').mockResolvedValue({
        items: mockRows,
        total: 3,
      });

      const res = await productosService.listarProductos(empresaId, { page: '1', limit: '10' });

      expect(res.data).toHaveLength(3);
      expect(res.data[0].estadoAlerta).toBe('normal');
      expect(res.data[1].estadoAlerta).toBe('stock_minimo');
      expect(res.data[2].estadoAlerta).toBe('sin_stock');
      expect(res.paginacion.total).toBe(3);
    });
  });
});
