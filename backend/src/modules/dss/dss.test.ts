import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { dssService } from './dss.service';
import { dssRepository } from './dss.repository';
import { FilaLogistica, FilaPosicionInventario } from './dss.repository';

describe('DSS Service — EOQ/ROP y Alertas (Sprint 4 / LIB-5)', () => {
  const empresaId = crypto.randomUUID();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('recalcularEoqRop (HU-19, HU-20)', () => {
    it('calcula EOQ, ROP y SS con el proveedor principal y los persiste', async () => {
      const fila: FilaLogistica = {
        productoId: 'p1',
        categoriaAbc: 'A',
        demandaPromedioDiaria: 6000 / 365,
        demandaAnual: 6000,
        costoUnitario: 65,
        costoPedido: 50, // se ignora a favor del proveedor principal
        tasaMantenimientoAnual: 0.2,
        leadTimeDias: 3,
        loteMinimo: 1,
        costoPedidoProveedor: 150,
      };

      vi.spyOn(dssRepository, 'obtenerParametrosLogisticos').mockResolvedValue([fila]);
      const actualizar = vi.spyOn(dssRepository, 'actualizarEoqRop').mockResolvedValue(undefined);

      const res = await dssService.recalcularEoqRop(empresaId);

      expect(res.productosProcesados).toBe(1);
      expect(res.productosConParametrosCuantitativos).toBe(1);
      expect(actualizar).toHaveBeenCalledTimes(1);

      const filasPersistidas = actualizar.mock.calls[0][2];
      expect(filasPersistidas).toEqual([
        { productoId: 'p1', eoq: 230, rop: 70.01, ss: 20.7 },
      ]);
    });

    it('no emite ROP para productos sin demanda diaria', async () => {
      const fila: FilaLogistica = {
        productoId: 'p2',
        categoriaAbc: 'C',
        demandaPromedioDiaria: 0,
        demandaAnual: 0,
        costoUnitario: 10,
        costoPedido: 50,
        tasaMantenimientoAnual: 0.2,
        leadTimeDias: 3,
        loteMinimo: 1,
        costoPedidoProveedor: null,
      };

      vi.spyOn(dssRepository, 'obtenerParametrosLogisticos').mockResolvedValue([fila]);
      const actualizar = vi.spyOn(dssRepository, 'actualizarEoqRop').mockResolvedValue(undefined);

      const res = await dssService.recalcularEoqRop(empresaId);

      expect(res.productosConParametrosCuantitativos).toBe(0);
      const filasPersistidas = actualizar.mock.calls[0][2];
      expect(filasPersistidas).toEqual([{ productoId: 'p2', eoq: 0, rop: null, ss: null }]);
    });
  });

  describe('obtenerAlertas (HU-22 / LIB-36)', () => {
    it('filtra por IP <= ROP y prioriza por criticidad ABC', async () => {
      const posiciones: FilaPosicionInventario[] = [
        { productoId: 'a', categoriaAbc: 'A', ropCalculado: 100, eoqCalculado: 230, stockSeguridadCalculado: 20, stockActual: 50, enTransito: 0, sku: 'A1', nombre: 'Clase A' },
        { productoId: 'b', categoriaAbc: 'B', ropCalculado: 80, eoqCalculado: 100, stockSeguridadCalculado: 10, stockActual: 200, enTransito: 0, sku: 'B1', nombre: 'Clase B' },
        { productoId: 'c', categoriaAbc: 'C', ropCalculado: 50, eoqCalculado: 50, stockSeguridadCalculado: 5, stockActual: 40, enTransito: 5, sku: 'C1', nombre: 'Clase C' },
        { productoId: 'd', categoriaAbc: 'C', ropCalculado: null, eoqCalculado: 0, stockSeguridadCalculado: null, stockActual: 0, enTransito: 0, sku: null, nombre: 'Sin ROP' },
      ];

      vi.spyOn(dssRepository, 'obtenerPosiciones').mockResolvedValue(posiciones);

      const panel = await dssService.obtenerAlertas(empresaId);

      expect(panel.totalAlertas).toBe(2);
      expect(panel.alertas.map((a) => a.productoId)).toEqual(['a', 'c']);
      expect(panel.alertas[0].categoriaAbc).toBe('A');
      expect(panel.alertas[0].posicionInventario).toBe(50);
      expect(panel.alertas[0].deficit).toBe(50);
      expect(panel.alertas[1].categoriaAbc).toBe('C');
      expect(panel.alertas[1].posicionInventario).toBe(45);
      expect(panel.porCriticidad).toEqual([
        { categoria: 'A', cantidad: 1 },
        { categoria: 'C', cantidad: 1 },
      ]);
    });

    it('devuelve panel vacío cuando no hay posiciones en alerta', async () => {
      vi.spyOn(dssRepository, 'obtenerPosiciones').mockResolvedValue([]);

      const panel = await dssService.obtenerAlertas(empresaId);

      expect(panel.totalAlertas).toBe(0);
      expect(panel.alertas).toEqual([]);
      expect(panel.porCriticidad).toEqual([]);
    });
  });

  describe('evaluarPosicionInventario (HU-21 / LIB-35)', () => {
    it('devuelve null cuando el producto no tiene parámetros vigentes', async () => {
      vi.spyOn(dssRepository, 'obtenerPosiciones').mockResolvedValue([]);

      const res = await dssService.evaluarPosicionInventario(empresaId, 'no-existe');
      expect(res).toBeNull();
    });

    it('devuelve null cuando el producto está por encima del ROP', async () => {
      vi.spyOn(dssRepository, 'obtenerPosiciones').mockResolvedValue([
        {
          productoId: 'p1',
          categoriaAbc: 'A',
          ropCalculado: 50,
          eoqCalculado: 100,
          stockSeguridadCalculado: 10,
          stockActual: 80,
          enTransito: 0,
          sku: null,
          nombre: 'Con stock',
        },
      ]);

      const res = await dssService.evaluarPosicionInventario(empresaId, 'p1');
      expect(res).toBeNull();
    });
  });
});
