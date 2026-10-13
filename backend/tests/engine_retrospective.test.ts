import { describe, it, expect } from 'vitest';
import {
  simularPolitica,
  ejecutarRetrospectiva,
  ParametrosSerieRetrospectiva,
} from '../src/engine/retrospective';

describe('Motor Retrospectivo Contrafactual (Sprint 6 / LIB-7 / HU-29)', () => {
  it('oráculo aritmético: simula ventas, quiebres, pedidos y costos de forma determinística', () => {
    const serie: ParametrosSerieRetrospectiva = {
      demanda: [10, 10, 10, 10, 10],
      inventarioInicial: 0,
      costoUnitario: 10,
      precioVenta: 20, // margen = 10
      costoPedido: 5,
      tasaMantenimientoAnual: 0.2, // H = 2 por unidad/año
      leadTimeDias: 1,
    };

    const res = simularPolitica(serie, { nombre: 'dss', puntoPedido: 0, cantidadPedido: 30 });

    expect(res.dias).toBe(5);
    expect(res.demandaTotal).toBe(50);
    expect(res.unidadesVendidas).toBe(40);
    expect(res.unidadesPerdidas).toBe(10);
    expect(res.numeroPedidos).toBe(2);
    expect(res.costoOrdenar).toBe(10);
    expect(res.costoVentaPerdida).toBe(100);
    expect(res.nivelServicio).toBe(80);
    expect(res.costoTotal).toBeCloseTo(110.27, 2);
  });

  it('calcula el ahorro como la diferencia de costos totales entre ambas políticas', () => {
    const serie: ParametrosSerieRetrospectiva = {
      demanda: [12, 10, 8, 14, 11, 9, 30, 10, 12, 9, 8, 11, 13, 10, 9],
      inventarioInicial: 40,
      costoUnitario: 10,
      precioVenta: 100, // margen alto: el quiebre domina el balance
      costoPedido: 20,
      tasaMantenimientoAnual: 0.2,
      leadTimeDias: 2,
    };

    const resultado = ejecutarRetrospectiva(
      serie,
      { puntoPedido: 30, cantidadPedido: 40 },
      { puntoPedido: 20, cantidadPedido: 40 }
    );

    expect(resultado.ahorro).toBeCloseTo(
      resultado.politicaEmpirica.costoTotal - resultado.politicaDss.costoTotal,
      2
    );
    // Con stock de seguridad (ROP más alto), el DSS atiende igual o mejor la demanda.
    expect(resultado.politicaDss.unidadesPerdidas).toBeLessThanOrEqual(
      resultado.politicaEmpirica.unidadesPerdidas
    );
    expect(resultado.politicaDss.nivelServicio).toBeGreaterThanOrEqual(
      resultado.politicaEmpirica.nivelServicio
    );
  });

  it('demuestra reducción de costos frente a una política empírica sin stock de seguridad', () => {
    const serie: ParametrosSerieRetrospectiva = {
      demanda: [12, 10, 8, 14, 11, 9, 30, 10, 12, 9, 8, 11, 13, 10, 9],
      inventarioInicial: 40,
      costoUnitario: 10,
      precioVenta: 100,
      costoPedido: 20,
      tasaMantenimientoAnual: 0.2,
      leadTimeDias: 2,
    };

    const resultado = ejecutarRetrospectiva(
      serie,
      { puntoPedido: 30, cantidadPedido: 40 },
      { puntoPedido: 20, cantidadPedido: 40 }
    );

    expect(resultado.ahorro).toBeGreaterThan(0);
  });
});
