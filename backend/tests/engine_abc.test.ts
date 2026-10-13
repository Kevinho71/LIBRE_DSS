import { describe, it, expect } from 'vitest';
import { clasificarAbc, CategoriaAbc } from '../src/engine/abcService';

describe('Motor ABC — Clasificación por valor de consumo anual (oráculo sintético)', () => {
  it('debe asignar clases A/B/C según umbrales 80/95 sobre 10 SKUs', () => {
    const items = [
      { productoId: 'p1', demandaAnual: 30, costoUnitario: 1 },
      { productoId: 'p2', demandaAnual: 28, costoUnitario: 1 },
      { productoId: 'p3', demandaAnual: 22, costoUnitario: 1 },
      { productoId: 'p4', demandaAnual: 10, costoUnitario: 1 },
      { productoId: 'p5', demandaAnual: 5, costoUnitario: 1 },
      { productoId: 'p6', demandaAnual: 1, costoUnitario: 1 },
      { productoId: 'p7', demandaAnual: 1, costoUnitario: 1 },
      { productoId: 'p8', demandaAnual: 1, costoUnitario: 1 },
      { productoId: 'p9', demandaAnual: 1, costoUnitario: 1 },
      { productoId: 'p10', demandaAnual: 1, costoUnitario: 1 },
    ];

    const resultado = clasificarAbc(items);
    const clase = (id: string): CategoriaAbc => resultado.find((r) => r.productoId === id)!.categoria;

    // A acumula hasta 80%: p1(30) + p2(28) + p3(22) = 80
    expect(clase('p1')).toBe('A');
    expect(clase('p2')).toBe('A');
    expect(clase('p3')).toBe('A');

    // B acumula de 80 a 95%: p4(10) + p5(5) = 15
    expect(clase('p4')).toBe('B');
    expect(clase('p5')).toBe('B');

    // C resto (95 a 100%): p6..p10
    expect(clase('p6')).toBe('C');
    expect(clase('p10')).toBe('C');

    expect(resultado.filter((r) => r.categoria === 'A')).toHaveLength(3);
    expect(resultado.filter((r) => r.categoria === 'B')).toHaveLength(2);
    expect(resultado.filter((r) => r.categoria === 'C')).toHaveLength(5);
  });

  it('debe ordenar desc por valor y acumular porcentaje correctamente', () => {
    const items = [
      { productoId: 'a', demandaAnual: 20, costoUnitario: 10 }, // V = 200
      { productoId: 'b', demandaAnual: 10, costoUnitario: 10 }, // V = 100
    ];
    const r = clasificarAbc(items);

    expect(r[0].productoId).toBe('a');
    expect(r[0].porcentajeValor).toBeCloseTo(66.67, 1);
    expect(r[0].porcentajeAcumulado).toBeCloseTo(66.67, 1);
    expect(r[1].productoId).toBe('b');
    expect(r[1].porcentajeAcumulado).toBeCloseTo(100, 1);
  });

  it('debe devolver lista vacía cuando no hay ítems', () => {
    expect(clasificarAbc([])).toEqual([]);
  });

  it('un único producto se clasifica como A con 100% acumulado', () => {
    const r = clasificarAbc([{ productoId: 'x', demandaAnual: 5, costoUnitario: 2 }]);
    expect(r[0].categoria).toBe('A');
    expect(r[0].porcentajeAcumulado).toBeCloseTo(100, 1);
  });

  it('productos sin demanda (valor 0) se clasifican como C', () => {
    const r = clasificarAbc([
      { productoId: 'top', demandaAnual: 100, costoUnitario: 1 },
      { productoId: 'sin-demanda', demandaAnual: 0, costoUnitario: 5 },
    ]);
    expect(r.find((x) => x.productoId === 'sin-demanda')!.categoria).toBe('C');
  });
});
