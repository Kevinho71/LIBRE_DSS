import { db } from '../../db/client';
import { transacciones, productos, ordenesCompra } from '../../db/schema';
import { and, eq, gte, lte, sql, desc, isNull, inArray } from 'drizzle-orm';
import {
  RegistrarVentaDto,
  RegistrarVentaBatchDto,
  RegistrarIngresoDto,
  RegistrarAjusteDto,
  RegistrarDevolucionDto,
  FiltroTransaccionesDto,
  TransaccionItemResponse,
  EstadoPago,
} from './transacciones.types';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import crypto from 'crypto';

export const transaccionesRepository = {
  async findByIdempotencia(
    empresaId: string,
    llaveIdempotencia: string
  ): Promise<typeof transacciones.$inferSelect[]> {
    return db
      .select()
      .from(transacciones)
      .where(and(
        eq(transacciones.empresaId, empresaId),
        eq(transacciones.llaveIdempotencia, llaveIdempotencia)
      ));
  },

  async findById(
    empresaId: string,
    id: string
  ): Promise<typeof transacciones.$inferSelect | null> {
    const rows = await db
      .select()
      .from(transacciones)
      .where(and(
        eq(transacciones.empresaId, empresaId),
        eq(transacciones.id, id)
      ))
      .limit(1);

    return rows[0] ?? null;
  },

  async findByNotaId(
    empresaId: string,
    notaId: string
  ): Promise<TransaccionItemResponse[]> {
    const rows = await db
      .select({
        transaccion: transacciones,
        producto: {
          id: productos.id,
          sku: productos.sku,
          nombre: productos.nombre,
          unidadMedida: productos.unidadMedida,
        },
      })
      .from(transacciones)
      .innerJoin(productos, eq(transacciones.productoId, productos.id))
      .where(and(
        eq(transacciones.empresaId, empresaId),
        eq(transacciones.notaId, notaId)
      ))
      .orderBy(desc(transacciones.fechaRegistro));

    return rows.map(r => ({
      id: r.transaccion.id,
      empresaId: r.transaccion.empresaId,
      notaId: r.transaccion.notaId,
      productoId: r.transaccion.productoId,
      tipo: r.transaccion.tipo,
      cantidad: Number(r.transaccion.cantidad),
      costoUnitarioHistorico: Number(r.transaccion.costoUnitarioHistorico),
      precioVentaHistorico: r.transaccion.precioVentaHistorico ? Number(r.transaccion.precioVentaHistorico) : null,
      motivo: r.transaccion.motivo,
      estadoPago: r.transaccion.estadoPago,
      llaveIdempotencia: r.transaccion.llaveIdempotencia,
      fechaEvento: r.transaccion.fechaEvento,
      fechaRegistro: r.transaccion.fechaRegistro,
      producto: r.producto,
    }));
  },

  async registrarVenta(
    empresaId: string,
    data: RegistrarVentaDto
  ): Promise<{ transaccion: typeof transacciones.$inferSelect; nuevoStock: number }> {
    return db.transaction(async (tx) => {
      // 1. Obtener producto y verificar existencia
      const [prod] = await tx
        .select()
        .from(productos)
        .where(and(
          eq(productos.empresaId, empresaId),
          eq(productos.id, data.productoId),
          isNull(productos.deletedAt)
        ))
        .limit(1);

      if (!prod) {
        throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', `El producto con ID '${data.productoId}' no existe`);
      }

      const stockActualNum = Number(prod.stockActual);
      if (stockActualNum < data.cantidad) {
        throw new BadRequestError(
          'STOCK_INSUFICIENTE',
          `Stock insuficiente para '${prod.nombre}'. Disponible: ${stockActualNum}, Solicitado: ${data.cantidad}`,
          { disponible: stockActualNum, solicitado: data.cantidad, productoId: prod.id }
        );
      }

      const nuevoStock = Number((stockActualNum - data.cantidad).toFixed(2));
      const fechaEvento = data.fechaEvento || new Date().toISOString().slice(0, 10);
      const precioVentaHistorico = data.precioVenta !== undefined ? data.precioVenta : Number(prod.precioVenta);
      const costoUnitarioHistorico = data.costoUnitario !== undefined ? data.costoUnitario : Number(prod.costoUnitario);

      // 2. Descontar stock
      await tx
        .update(productos)
        .set({
          stockActual: String(nuevoStock),
          updatedAt: new Date(),
        })
        .where(eq(productos.id, prod.id));

      // 3. Insertar transacción
      const [trx] = await tx
        .insert(transacciones)
        .values({
          empresaId,
          productoId: prod.id,
          tipo: 'venta',
          cantidad: String(data.cantidad),
          costoUnitarioHistorico: String(costoUnitarioHistorico),
          precioVentaHistorico: String(precioVentaHistorico),
          motivo: data.motivo ?? null,
          estadoPago: data.estadoPago ?? 'contado',
          llaveIdempotencia: data.llaveIdempotencia ?? null,
          fechaEvento,
        })
        .returning();

      return { transaccion: trx, nuevoStock };
    });
  },

  async registrarVentaBatch(
    empresaId: string,
    data: RegistrarVentaBatchDto
  ): Promise<{ notaId: string; transacciones: typeof transacciones.$inferSelect[] }> {
    return db.transaction(async (tx) => {
      const notaId = data.notaId || crypto.randomUUID();
      const fechaEvento = data.fechaEvento || new Date().toISOString().slice(0, 10);
      const productoIds = data.items.map(i => i.productoId);

      // 1. Obtener todos los productos involucrados
      const prods = await tx
        .select()
        .from(productos)
        .where(and(
          eq(productos.empresaId, empresaId),
          inArray(productos.id, productoIds),
          isNull(productos.deletedAt)
        ));

      const prodMap = new Map(prods.map(p => [p.id, p]));

      // 2. Validar que todos existan y tengan stock suficiente
      for (const item of data.items) {
        const prod = prodMap.get(item.productoId);
        if (!prod) {
          throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', `El producto '${item.productoId}' no existe o está inactivo`);
        }
        const stockActual = Number(prod.stockActual);
        if (stockActual < item.cantidad) {
          throw new BadRequestError(
            'STOCK_INSUFICIENTE',
            `Stock insuficiente para '${prod.nombre}'. Disponible: ${stockActual}, Solicitado: ${item.cantidad}`,
            { productoId: prod.id, disponible: stockActual, solicitado: item.cantidad }
          );
        }
      }

      // 3. Descontar stock e insertar transacciones
      const creadas: typeof transacciones.$inferSelect[] = [];

      for (const item of data.items) {
        const prod = prodMap.get(item.productoId)!;
        const stockActual = Number(prod.stockActual);
        const nuevoStock = Number((stockActual - item.cantidad).toFixed(2));
        const precioVentaHistorico = item.precioVenta !== undefined ? item.precioVenta : Number(prod.precioVenta);
        const costoUnitarioHistorico = Number(prod.costoUnitario);

        // Descontar
        await tx
          .update(productos)
          .set({
            stockActual: String(nuevoStock),
            updatedAt: new Date(),
          })
          .where(eq(productos.id, prod.id));

        // Insertar movimiento
        const [trx] = await tx
          .insert(transacciones)
          .values({
            empresaId,
            notaId,
            productoId: prod.id,
            tipo: 'venta',
            cantidad: String(item.cantidad),
            costoUnitarioHistorico: String(costoUnitarioHistorico),
            precioVentaHistorico: String(precioVentaHistorico),
            motivo: data.motivo ?? null,
            estadoPago: data.estadoPago ?? 'contado',
            llaveIdempotencia: data.llaveIdempotencia ? `${data.llaveIdempotencia}_${item.productoId}` : null,
            fechaEvento,
          })
          .returning();

        creadas.push(trx);
      }

      return { notaId, transacciones: creadas };
    });
  },

  async registrarIngreso(
    empresaId: string,
    data: RegistrarIngresoDto
  ): Promise<{ transaccion: typeof transacciones.$inferSelect; nuevoStock: number }> {
    return db.transaction(async (tx) => {
      const [prod] = await tx
        .select()
        .from(productos)
        .where(and(
          eq(productos.empresaId, empresaId),
          eq(productos.id, data.productoId),
          isNull(productos.deletedAt)
        ))
        .limit(1);

      if (!prod) {
        throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', `El producto con ID '${data.productoId}' no existe`);
      }

      // CB-04: Conversión de unidad de compra a unidad mínima de venta
      const factorConversion = Number(prod.factorConversion || 1);
      const cantidadEfectiva = data.esUnidadCompra ? Number((data.cantidad * factorConversion).toFixed(2)) : data.cantidad;
      const stockActualNum = Number(prod.stockActual);
      const nuevoStock = Number((stockActualNum + cantidadEfectiva).toFixed(2));
      const fechaEvento = data.fechaEvento || new Date().toISOString().slice(0, 10);

      const costoHistorico = data.costoUnitarioIngreso !== undefined
        ? data.costoUnitarioIngreso
        : Number(prod.costoUnitario);

      // Actualizar producto
      const updateData: Record<string, unknown> = {
        stockActual: String(nuevoStock),
        updatedAt: new Date(),
      };

      if (data.actualizarCostoReposicion && data.costoUnitarioIngreso !== undefined) {
        updateData.costoUnitario = String(data.costoUnitarioIngreso);
      }

      await tx
        .update(productos)
        .set(updateData)
        .where(eq(productos.id, prod.id));

      // Si viene ordenCompraId, marcarla como recibido
      if (data.ordenCompraId) {
        await tx
          .update(ordenesCompra)
          .set({ estado: 'recibido' })
          .where(and(
            eq(ordenesCompra.empresaId, empresaId),
            eq(ordenesCompra.id, data.ordenCompraId)
          ));
      }

      const [trx] = await tx
        .insert(transacciones)
        .values({
          empresaId,
          productoId: prod.id,
          tipo: 'ingreso',
          cantidad: String(cantidadEfectiva),
          costoUnitarioHistorico: String(costoHistorico),
          motivo: data.motivo ?? (data.esUnidadCompra ? `Ingreso mayorista: ${data.cantidad} ${prod.unidadCompra || 'cajas'} x ${factorConversion}` : null),
          estadoPago: 'contado',
          llaveIdempotencia: data.llaveIdempotencia ?? null,
          fechaEvento,
        })
        .returning();

      return { transaccion: trx, nuevoStock };
    });
  },

  async registrarAjuste(
    empresaId: string,
    data: RegistrarAjusteDto
  ): Promise<{ transaccion: typeof transacciones.$inferSelect; nuevoStock: number }> {
    return db.transaction(async (tx) => {
      const [prod] = await tx
        .select()
        .from(productos)
        .where(and(
          eq(productos.empresaId, empresaId),
          eq(productos.id, data.productoId),
          isNull(productos.deletedAt)
        ))
        .limit(1);

      if (!prod) {
        throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', `El producto con ID '${data.productoId}' no existe`);
      }

      const stockActual = Number(prod.stockActual);
      let tipo: 'ajuste' | 'merma' = 'merma';
      let cantidadMovimiento = 0;
      let nuevoStock = stockActual;

      if (data.conteoFisico !== undefined) {
        // CB-06: Ajuste por conteo físico / arqueo
        const diferencia = Number((data.conteoFisico - stockActual).toFixed(2));
        if (diferencia === 0) {
          throw new BadRequestError('SIN_DIFERENCIA', 'El conteo físico coincide exactamente con el stock actual');
        }

        if (diferencia < 0) {
          tipo = 'merma';
          cantidadMovimiento = Math.abs(diferencia);
        } else {
          tipo = 'ajuste';
          cantidadMovimiento = diferencia;
        }
        nuevoStock = data.conteoFisico;
      } else if (data.cantidad !== undefined) {
        // Merma directa especificada
        tipo = 'merma';
        cantidadMovimiento = data.cantidad;
        nuevoStock = Number((stockActual - data.cantidad).toFixed(2));
      }

      // Actualizar stock
      await tx
        .update(productos)
        .set({
          stockActual: String(nuevoStock),
          updatedAt: new Date(),
        })
        .where(eq(productos.id, prod.id));

      const fechaEvento = data.fechaEvento || new Date().toISOString().slice(0, 10);
      const [trx] = await tx
        .insert(transacciones)
        .values({
          empresaId,
          productoId: prod.id,
          tipo,
          cantidad: String(cantidadMovimiento),
          costoUnitarioHistorico: prod.costoUnitario,
          motivo: data.motivo,
          estadoPago: 'contado',
          llaveIdempotencia: data.llaveIdempotencia ?? null,
          fechaEvento,
        })
        .returning();

      return { transaccion: trx, nuevoStock };
    });
  },

  async registrarDevolucion(
    empresaId: string,
    data: RegistrarDevolucionDto
  ): Promise<{ transaccion: typeof transacciones.$inferSelect; nuevoStock: number }> {
    return db.transaction(async (tx) => {
      const [prod] = await tx
        .select()
        .from(productos)
        .where(and(
          eq(productos.empresaId, empresaId),
          eq(productos.id, data.productoId),
          isNull(productos.deletedAt)
        ))
        .limit(1);

      if (!prod) {
        throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', `El producto con ID '${data.productoId}' no existe`);
      }

      const stockActual = Number(prod.stockActual);
      let nuevoStock = stockActual;

      if (data.tipo === 'devolucion_cliente') {
        // CB-05: Cliente devuelve mercadería -> suma stock sin inflar compras
        nuevoStock = Number((stockActual + data.cantidad).toFixed(2));
      } else {
        // CB-05: Devolución a proveedor -> resta stock defectuoso
        if (stockActual < data.cantidad) {
          throw new BadRequestError('STOCK_INSUFICIENTE', `Stock insuficiente para devolver al proveedor. Disponible: ${stockActual}`);
        }
        nuevoStock = Number((stockActual - data.cantidad).toFixed(2));
      }

      await tx
        .update(productos)
        .set({
          stockActual: String(nuevoStock),
          updatedAt: new Date(),
        })
        .where(eq(productos.id, prod.id));

      const fechaEvento = data.fechaEvento || new Date().toISOString().slice(0, 10);
      const [trx] = await tx
        .insert(transacciones)
        .values({
          empresaId,
          productoId: prod.id,
          notaId: data.notaId ?? null,
          tipo: data.tipo,
          cantidad: String(data.cantidad),
          costoUnitarioHistorico: prod.costoUnitario,
          motivo: data.motivo ?? null,
          estadoPago: 'contado',
          llaveIdempotencia: data.llaveIdempotencia ?? null,
          fechaEvento,
        })
        .returning();

      return { transaccion: trx, nuevoStock };
    });
  },

  async actualizarEstadoPago(
    empresaId: string,
    id: string,
    estadoPago: EstadoPago
  ): Promise<typeof transacciones.$inferSelect | null> {
    const [updated] = await db
      .update(transacciones)
      .set({ estadoPago })
      .where(and(
        eq(transacciones.empresaId, empresaId),
        eq(transacciones.id, id)
      ))
      .returning();

    return updated ?? null;
  },

  async actualizarEstadoPagoPorNota(
    empresaId: string,
    notaId: string,
    estadoPago: EstadoPago
  ): Promise<typeof transacciones.$inferSelect[]> {
    return db
      .update(transacciones)
      .set({ estadoPago })
      .where(and(
        eq(transacciones.empresaId, empresaId),
        eq(transacciones.notaId, notaId)
      ))
      .returning();
  },

  async findList(
    empresaId: string,
    options: FiltroTransaccionesDto
  ): Promise<{ items: TransaccionItemResponse[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(transacciones.empresaId, empresaId)];

    if (options.productoId) {
      conditions.push(eq(transacciones.productoId, options.productoId));
    }
    if (options.tipo) {
      conditions.push(eq(transacciones.tipo, options.tipo));
    }
    if (options.desde) {
      conditions.push(gte(transacciones.fechaEvento, options.desde));
    }
    if (options.hasta) {
      conditions.push(lte(transacciones.fechaEvento, options.hasta));
    }
    if (options.notaId) {
      conditions.push(eq(transacciones.notaId, options.notaId));
    }
    if (options.estadoPago) {
      conditions.push(eq(transacciones.estadoPago, options.estadoPago));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transacciones)
      .where(whereClause);

    const total = totalRow?.count ?? 0;

    const rows = await db
      .select({
        transaccion: transacciones,
        producto: {
          id: productos.id,
          sku: productos.sku,
          nombre: productos.nombre,
          unidadMedida: productos.unidadMedida,
        },
      })
      .from(transacciones)
      .innerJoin(productos, eq(transacciones.productoId, productos.id))
      .where(whereClause)
      .orderBy(desc(transacciones.fechaRegistro))
      .limit(limit)
      .offset(offset);

    const items: TransaccionItemResponse[] = rows.map(r => ({
      id: r.transaccion.id,
      empresaId: r.transaccion.empresaId,
      notaId: r.transaccion.notaId,
      productoId: r.transaccion.productoId,
      tipo: r.transaccion.tipo,
      cantidad: Number(r.transaccion.cantidad),
      costoUnitarioHistorico: Number(r.transaccion.costoUnitarioHistorico),
      precioVentaHistorico: r.transaccion.precioVentaHistorico ? Number(r.transaccion.precioVentaHistorico) : null,
      motivo: r.transaccion.motivo,
      estadoPago: r.transaccion.estadoPago,
      llaveIdempotencia: r.transaccion.llaveIdempotencia,
      fechaEvento: r.transaccion.fechaEvento,
      fechaRegistro: r.transaccion.fechaRegistro,
      producto: r.producto,
    }));

    return { items, total };
  },
};
