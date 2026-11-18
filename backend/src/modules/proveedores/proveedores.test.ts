import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proveedoresService } from './proveedores.service';
import { proveedoresRepository } from './proveedores.repository';
import { productosRepository } from '../productos/productos.repository';
import { NotFoundError } from '../../shared/errors/AppError';

describe('Proveedores Service Unit Tests', () => {
  const empresaId = '11111111-1111-4111-8111-111111111111';
  const productoId = '22222222-2222-4222-8222-222222222222';
  const proveedorId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('crearProveedor & listarProveedores (HU-08)', () => {
    it('debe registrar un proveedor correctamente', async () => {
      vi.spyOn(proveedoresRepository, 'create').mockResolvedValue({
        id: proveedorId,
        empresaId,
        nombre: 'Maderas del Oriente SRL',
        contacto: 'Carlos Paz',
        telefono: '70012345',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const res = await proveedoresService.crearProveedor(empresaId, {
        nombre: 'Maderas del Oriente SRL',
        contacto: 'Carlos Paz',
        telefono: '70012345',
      });

      expect(res.id).toBe(proveedorId);
      expect(res.nombre).toBe('Maderas del Oriente SRL');
    });

    it('debe listar los proveedores de la empresa', async () => {
      vi.spyOn(proveedoresRepository, 'findAll').mockResolvedValue([
        {
          id: proveedorId,
          empresaId,
          nombre: 'Maderas del Oriente SRL',
          contacto: 'Carlos Paz',
          telefono: '70012345',
          createdAt: new Date(),
        },
      ]);

      const res = await proveedoresService.listarProveedores(empresaId);
      expect(res).toHaveLength(1);
      expect(res[0].nombre).toBe('Maderas del Oriente SRL');
    });
  });

  describe('asociarAProducto (CB-02 / Caso Venesta 4mm)', () => {
    it('debe asociar proveedor a producto y desmarcar anteriores como principales', async () => {
      vi.spyOn(productosRepository, 'findById').mockResolvedValue({
        id: productoId,
        empresaId,
        sku: 'VEN-4MM',
        nombre: 'Venesta 4mm',
        unidadMedida: 'plancha',
        unidadCompra: null,
        factorConversion: '1.00',
        costoUnitario: '45.00',
        precioVenta: '65.00',
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

      vi.spyOn(proveedoresRepository, 'findById').mockResolvedValue({
        id: proveedorId,
        empresaId,
        nombre: 'Distribuidora Forestal',
        contacto: null,
        telefono: null,
        createdAt: new Date(),
      });

      const desmarcarSpy = vi.spyOn(proveedoresRepository, 'desmarcarPrincipalAnteriores').mockResolvedValue();

      vi.spyOn(proveedoresRepository, 'asociarProducto').mockResolvedValue({
        id: 'vinculo-1',
        empresaId,
        productoId,
        proveedorId,
        codigoProveedor: 'COD-FOR-01',
        costoCompra: '42.00',
        leadTimeDias: 3,
        costoPedido: '50.00',
        loteMinimo: '10.00',
        esPrincipal: true,
      });

      const vinculo = await proveedoresService.asociarAProducto(empresaId, productoId, {
        proveedorId,
        codigoProveedor: 'COD-FOR-01',
        costoCompra: 42.00,
        leadTimeDias: 3,
        costoPedido: 50.00,
        loteMinimo: 10,
        esPrincipal: true,
      });

      expect(desmarcarSpy).toHaveBeenCalledWith(empresaId, productoId);
      expect(vinculo.codigoProveedor).toBe('COD-FOR-01');
      expect(vinculo.costoCompra).toBe(42.00);
      expect(vinculo.esPrincipal).toBe(true);
      expect(vinculo.proveedorNombre).toBe('Distribuidora Forestal');
    });

    it('debe lanzar NotFoundError si el producto no existe en la empresa', async () => {
      vi.spyOn(productosRepository, 'findById').mockResolvedValue(null);

      await expect(
        proveedoresService.asociarAProducto(empresaId, 'prod-no-existe', {
          proveedorId,
          esPrincipal: true,
          leadTimeDias: 3,
          costoPedido: 50,
          loteMinimo: 1,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('debe lanzar NotFoundError si el proveedor no existe en la empresa', async () => {
      vi.spyOn(productosRepository, 'findById').mockResolvedValue({
        id: productoId,
        empresaId,
        sku: 'VEN-4MM',
        nombre: 'Venesta 4mm',
        unidadMedida: 'plancha',
        unidadCompra: null,
        factorConversion: '1.00',
        costoUnitario: '45.00',
        precioVenta: '65.00',
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

      vi.spyOn(proveedoresRepository, 'findById').mockResolvedValue(null);

      await expect(
        proveedoresService.asociarAProducto(empresaId, productoId, {
          proveedorId: '44444444-4444-4444-8444-444444444444',
          esPrincipal: true,
          leadTimeDias: 3,
          costoPedido: 50,
          loteMinimo: 1,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
