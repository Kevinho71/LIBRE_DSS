import { describe, it, expect, afterAll } from 'vitest';
import { db, withTenant } from '../src/db/client';
import { empresas, productos } from '../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Tenant Isolation Suite (PostgreSQL RLS)', () => {
  let empresaAId: string;
  let empresaBId: string;
  let productoAId: string;

  it('debe crear dos empresas de prueba en Neon', async () => {
    const [empA] = await db
      .insert(empresas)
      .values({
        nombre: 'Empresa Test A RLS',
        nit: '10001001',
        plan: 'gratuito',
      })
      .returning();

    const [empB] = await db
      .insert(empresas)
      .values({
        nombre: 'Empresa Test B RLS',
        nit: '20002002',
        plan: 'pago',
      })
      .returning();

    expect(empA).toBeDefined();
    expect(empB).toBeDefined();
    empresaAId = empA.id;
    empresaBId = empB.id;
  });

  it('debe permitir insertar y leer producto dentro del tenant de Empresa A', async () => {
    const nuevoProducto = await withTenant(empresaAId, async (tx) => {
      const [prod] = await tx
        .insert(productos)
        .values({
          empresaId: empresaAId,
          sku: 'SKU-TEST-A1',
          nombre: 'Producto Confidencial Empresa A',
          costoUnitario: '100.00',
          precioVenta: '150.00',
          stockActual: '20',
        })
        .returning();
      return prod;
    });

    expect(nuevoProducto).toBeDefined();
    expect(nuevoProducto.sku).toBe('SKU-TEST-A1');
    productoAId = nuevoProducto.id;

    // Consultar bajo el contexto de Empresa A
    const productosA = await withTenant(empresaAId, async (tx) => {
      return tx.select().from(productos).where(eq(productos.id, productoAId));
    });

    expect(productosA).toHaveLength(1);
    expect(productosA[0].nombre).toBe('Producto Confidencial Empresa A');
  });

  it('debe aislar y ocultar el producto cuando se consulta desde el tenant de Empresa B (RLS activo)', async () => {
    // Consultar bajo el contexto de Empresa B
    const productosDesdeB = await withTenant(empresaBId, async (tx) => {
      return tx.select().from(productos).where(eq(productos.id, productoAId));
    });

    // RLS en PostgreSQL debe retornar 0 resultados aunque el producto exista en la base de datos
    expect(productosDesdeB).toHaveLength(0);
  });

  afterAll(async () => {
    // Limpieza de datos de prueba
    if (empresaAId) {
      await db.delete(empresas).where(eq(empresas.id, empresaAId));
    }
    if (empresaBId) {
      await db.delete(empresas).where(eq(empresas.id, empresaBId));
    }
  });
});
