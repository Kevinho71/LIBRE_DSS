import { describe, it, expect } from 'vitest';
import {
  generarExplicacionBase,
  ContextoExplicacion,
} from '../src/engine/explicador';

describe('Motor Explicador Determinístico (LIB-8 / HU-34)', () => {
  it('genera texto explicativo base en español para producto bajo punto de reorden', () => {
    const ctx: ContextoExplicacion = {
      nombre: 'Cemento Viacha 50kg',
      sku: 'SKU-001',
      categoriaAbc: 'A',
      stockActual: 10,
      ropCalculado: 25,
      eoqCalculado: 100,
      demandaPromedioDiaria: 4.5,
    };

    const texto = generarExplicacionBase(ctx);

    expect(texto).toContain('El producto Cemento Viacha 50kg (SKU-001) de clase A');
    expect(texto).toContain('stock actual de 10 unidades');
    expect(texto).toContain('por debajo de su punto de reorden de 25 unidades');
    expect(texto).toContain('demanda diaria promedio de 4.50 unidades');
    expect(texto).toContain('Se recomienda pedir 100 unidades');
    expect(texto.endsWith('.')).toBe(true);
  });

  it('indica "por encima" si el stock supera el punto de reorden', () => {
    const ctx: ContextoExplicacion = {
      nombre: 'Tornillo Yeso 1/2',
      sku: null,
      categoriaAbc: 'C',
      stockActual: 50,
      ropCalculado: 30,
      eoqCalculado: 100,
      demandaPromedioDiaria: 2.0,
    };

    const texto = generarExplicacionBase(ctx);

    expect(texto).toContain('El producto Tornillo Yeso 1/2 de clase C');
    expect(texto).toContain('por encima de su punto de reorden de 30 unidades');
  });

  it('devuelve mensaje informativo claro si el producto no tiene parámetros calculados', () => {
    const ctx: ContextoExplicacion = {
      nombre: 'Ladrillo 6 Huecos',
      sku: 'LAD-06',
      categoriaAbc: null,
      stockActual: 0,
      ropCalculado: null,
      eoqCalculado: null,
      demandaPromedioDiaria: null,
    };

    const texto = generarExplicacionBase(ctx);

    expect(texto).toBe(
      'El producto Ladrillo 6 Huecos (LAD-06) no cuenta aún con parámetros de reabastecimiento calculados.'
    );
  });
});
