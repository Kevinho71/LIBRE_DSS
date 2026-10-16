import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { dssService } from './dss.service';
import { dssRepository } from './dss.repository';
import { FilaLogistica, FilaPosicionInventario } from './dss.repository';
import { clock } from '../../shared/utils/clock';

describe('DSS Service — EOQ/ROP y Alertas (Sprint 4 / LIB-5)', () => {
  const empresaId = crypto.randomUUID();

  beforeEach(() => {
    vi.restoreAllMocks();
    // Tope de capital por defecto (15.000 Bs) salvo que la prueba lo sobreescriba.
    vi.spyOn(dssRepository, 'obtenerTopeCapitalPedido').mockResolvedValue(15000);
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

    it('desactiva el tope de capital cuando la empresa lo tiene en 0 (PACHIPLAC)', async () => {
      const fila: FilaLogistica = {
        productoId: 'p1',
        categoriaAbc: 'A',
        demandaPromedioDiaria: 6000 / 365,
        demandaAnual: 6000,
        costoUnitario: 65,
        costoPedido: 50,
        tasaMantenimientoAnual: 0.2,
        leadTimeDias: 3,
        loteMinimo: 1,
        costoPedidoProveedor: 150,
      };

      vi.spyOn(dssRepository, 'obtenerTopeCapitalPedido').mockResolvedValue(0);
      vi.spyOn(dssRepository, 'obtenerParametrosLogisticos').mockResolvedValue([fila]);
      const actualizar = vi.spyOn(dssRepository, 'actualizarEoqRop').mockResolvedValue(undefined);

      await dssService.recalcularEoqRop(empresaId);

      const filasPersistidas = actualizar.mock.calls[0][2];
      // Sin tope de capital: EOQ recomendado = round(372.10) = 372 (no acotado a 230).
      expect(filasPersistidas[0].eoq).toBe(372);
    });
  });

  describe('Configuración DSS — tope de capital por empresa (§4.3)', () => {
    it('lee el tope de capital configurado para la empresa', async () => {
      vi.spyOn(dssRepository, 'obtenerTopeCapitalPedido').mockResolvedValue(0);

      const res = await dssService.obtenerConfiguracion(empresaId);

      expect(res.topeCapitalPedido).toBe(0);
    });

    it('actualiza el tope de capital de la empresa y lo retorna', async () => {
      const actualizar = vi
        .spyOn(dssRepository, 'actualizarTopeCapitalPedido')
        .mockResolvedValue(50000);

      const res = await dssService.actualizarConfiguracion(empresaId, { topeCapitalPedido: 50000 });

      expect(res.topeCapitalPedido).toBe(50000);
      expect(actualizar).toHaveBeenCalledWith(empresaId, 50000);
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

  describe('Reloj inyectable (Plan de Simulación §4.1)', () => {
    afterEach(() => {
      clock.clear();
    });

    it('fija y limpia la fecha simulada del reloj', async () => {
      const fijado = await dssService.fijarRelojSimulado('2026-05-15');
      expect(fijado.simulado).toBe(true);
      expect(fijado.fechaSimulada).toBe('2026-05-15');

      const limpiado = await dssService.fijarRelojSimulado(null);
      expect(limpiado.simulado).toBe(false);
      expect(limpiado.fechaSimulada).toBeNull();
    });
  });
});
