import { describe, it, expect } from 'vitest';
import {
  consolidarPedidoProveedor,
  PosicionProductoConsolidacion,
} from '../src/engine/consolidacion';

describe('Motor de Consolidación de Pedidos por Proveedor (LIB-8 / HU-24, HU-25)', () => {
  it('oráculo numérico: 3 productos bajo ROP comparten costo de pedido S=150 generando ahorro de 300', () => {
    const posiciones: PosicionProductoConsolidacion[] = [
      {
        productoId: 'prod-1',
        sku: 'SKU-001',
        nombre: 'Cemento Viacha 50kg',
        categoriaAbc: 'A',
        stockActual: 10,
        enTransito: 0,
        ropCalculado: 25,
        eoqCalculado: 100,
      },
      {
        productoId: 'prod-2',
        sku: 'SKU-002',
        nombre: 'Fierro Corrugado 1/2',
        categoriaAbc: 'A',
        stockActual: 5,
        enTransito: 5, // IP = 10 <= 15
        ropCalculado: 15,
        eoqCalculado: 80,
      },
      {
        productoId: 'prod-3',
        sku: 'SKU-003',
        nombre: 'Yeso San Pedro 25kg',
        categoriaAbc: 'B',
        stockActual: 20,
        enTransito: 0,
        ropCalculado: 30,
        eoqCalculado: 50,
      },
      {
        productoId: 'prod-4',
        sku: 'SKU-004',
        nombre: 'Arena Fina m3',
        categoriaAbc: 'C',
        stockActual: 100,
        enTransito: 0,
        ropCalculado: 20, // No está en alerta
        eoqCalculado: 40,
      },
    ];

    const costoPedido = 150;
    const resultado = consolidarPedidoProveedor(posiciones, costoPedido);

    expect(resultado.totalLineas).toBe(3);
    // Fórmula: (n - 1) * S = (3 - 1) * 150 = 300
    expect(resultado.ahorroEstimado).toBe(300);
    expect(resultado.lineas).toHaveLength(3);
    expect(resultado.lineas.map((l) => l.productoId)).toEqual(['prod-1', 'prod-2', 'prod-3']);

    // Verificar estructura de línea sugerida
    const linea1 = resultado.lineas[0];
    expect(linea1.sku).toBe('SKU-001');
    expect(linea1.categoriaAbc).toBe('A');
    expect(linea1.stockActual).toBe(10);
    expect(linea1.posicionInventario).toBe(10);
    expect(linea1.ropCalculado).toBe(25);
    expect(linea1.eoqSugerido).toBe(100);
  });

  it('si solo 1 producto requiere pedido, no hay consolidación y el ahorro es 0', () => {
    const posiciones: PosicionProductoConsolidacion[] = [
      {
        productoId: 'prod-1',
        sku: 'SKU-001',
        nombre: 'Producto Único',
        categoriaAbc: 'A',
        stockActual: 5,
        enTransito: 0,
        ropCalculado: 20,
        eoqCalculado: 50,
      },
      {
        productoId: 'prod-2',
        sku: 'SKU-002',
        nombre: 'Producto Abastecido',
        categoriaAbc: 'B',
        stockActual: 100,
        enTransito: 0,
        ropCalculado: 20,
        eoqCalculado: 50,
      },
    ];

    const resultado = consolidarPedidoProveedor(posiciones, 100);
    expect(resultado.totalLineas).toBe(1);
    expect(resultado.ahorroEstimado).toBe(0);
  });

  it('si ningún producto está bajo ROP, devuelve lista vacía y ahorro 0', () => {
    const posiciones: PosicionProductoConsolidacion[] = [
      {
        productoId: 'prod-1',
        sku: 'SKU-001',
        nombre: 'Stock Alto 1',
        categoriaAbc: 'A',
        stockActual: 50,
        enTransito: 0,
        ropCalculado: 20,
        eoqCalculado: 50,
      },
      {
        productoId: 'prod-2',
        sku: 'SKU-002',
        nombre: 'Stock Alto 2',
        categoriaAbc: 'B',
        stockActual: 40,
        enTransito: 10,
        ropCalculado: 30,
        eoqCalculado: 40,
      },
    ];

    const resultado = consolidarPedidoProveedor(posiciones, 200);
    expect(resultado.totalLineas).toBe(0);
    expect(resultado.ahorroEstimado).toBe(0);
    expect(resultado.lineas).toHaveLength(0);
  });

  it('excluye productos sin ROP calculado o sin clasificación ABC asignada', () => {
    const posiciones: PosicionProductoConsolidacion[] = [
      {
        productoId: 'prod-sin-rop',
        sku: 'SKU-SIN-ROP',
        nombre: 'Sin ROP',
        categoriaAbc: 'A',
        stockActual: 2,
        enTransito: 0,
        ropCalculado: null,
        eoqCalculado: 50,
      },
      {
        productoId: 'prod-sin-abc',
        sku: 'SKU-SIN-ABC',
        nombre: 'Sin ABC',
        categoriaAbc: null,
        stockActual: 2,
        enTransito: 0,
        ropCalculado: 10,
        eoqCalculado: 50,
      },
    ];

    const resultado = consolidarPedidoProveedor(posiciones, 100);
    expect(resultado.totalLineas).toBe(0);
    expect(resultado.ahorroEstimado).toBe(0);
  });

  it('considera stock en tránsito al evaluar la posición de inventario (IP = stock + enTransito)', () => {
    const posiciones: PosicionProductoConsolidacion[] = [
      {
        productoId: 'prod-transito',
        sku: 'SKU-TR',
        nombre: 'Con pedido en camino',
        categoriaAbc: 'A',
        stockActual: 5,
        enTransito: 20, // IP = 25 > ROP = 20 -> no debe reordenar
        ropCalculado: 20,
        eoqCalculado: 50,
      },
    ];

    const resultado = consolidarPedidoProveedor(posiciones, 100);
    expect(resultado.totalLineas).toBe(0);
  });
});
