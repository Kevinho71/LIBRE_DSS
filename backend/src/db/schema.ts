import { pgTable, uuid, varchar, numeric, integer, timestamp, date, boolean, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';

// 1. EMPRESA (Inquilino / Tenant)
export const empresas = pgTable('empresa', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  nit: varchar('nit', { length: 50 }),
  plan: varchar('plan', { length: 20 }).default('gratuito').notNull(), // 'gratuito' (máx 15 SKUs) | 'pago'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. USUARIO
export const usuarios = pgTable('usuario', {
  id: uuid('id').defaultRandom().primaryKey(),
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 150 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  rol: varchar('rol', { length: 50 }).default('operador').notNull(), // 'administrador' | 'operador'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. PRODUCTO
export const productos = pgTable('producto', {
  id: uuid('id').defaultRandom().primaryKey(),
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  sku: varchar('sku', { length: 100 }),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  unidadMedida: varchar('unidad_medida', { length: 50 }).default('unidad').notNull(),
  unidadCompra: varchar('unidad_compra', { length: 50 }),
  factorConversion: numeric('factor_conversion', { precision: 10, scale: 2 }).default('1.00').notNull(),
  costoUnitario: numeric('costo_unitario', { precision: 12, scale: 2 }).notNull(),
  precioVenta: numeric('precio_venta', { precision: 12, scale: 2 }).notNull(),
  costoPedido: numeric('costo_pedido', { precision: 12, scale: 2 }).default('50.00').notNull(), // S
  tasaMantenimientoAnual: numeric('tasa_mantenimiento_anual', { precision: 5, scale: 4 }).default('0.2000').notNull(), // i (20%)
  stockActual: numeric('stock_actual', { precision: 12, scale: 2 }).default('0').notNull(),
  stockMinimoManual: numeric('stock_minimo_manual', { precision: 12, scale: 2 }),
  stockMaximoManual: numeric('stock_maximo_manual', { precision: 12, scale: 2 }),
  origenDato: varchar('origen_dato', { length: 50 }).default('manual').notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. PROVEEDOR
export const proveedores = pgTable('proveedor', {
  id: uuid('id').defaultRandom().primaryKey(),
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  contacto: varchar('contacto', { length: 255 }),
  telefono: varchar('telefono', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. PRODUCTO_PROVEEDOR (Relación N:M)
export const productoProveedores = pgTable('producto_proveedor', {
  id: uuid('id').defaultRandom().primaryKey(),
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  productoId: uuid('producto_id').references(() => productos.id, { onDelete: 'cascade' }).notNull(),
  proveedorId: uuid('proveedor_id').references(() => proveedores.id, { onDelete: 'cascade' }).notNull(),
  codigoProveedor: varchar('codigo_proveedor', { length: 100 }),
  costoCompra: numeric('costo_compra', { precision: 12, scale: 2 }),
  leadTimeDias: integer('lead_time_dias').default(3).notNull(), // L
  costoPedido: numeric('costo_pedido', { precision: 12, scale: 2 }).default('50.00').notNull(),
  loteMinimo: numeric('lote_minimo', { precision: 12, scale: 2 }).default('1').notNull(),
  esPrincipal: boolean('es_principal').default(true).notNull(),
});

// 6. TRANSACCION (Inmutable)
export const transacciones = pgTable('transaccion', {
  id: uuid('id').defaultRandom().primaryKey(),
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  notaId: uuid('nota_id'),
  productoId: uuid('producto_id').references(() => productos.id, { onDelete: 'cascade' }).notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(), // 'venta' | 'ingreso' | 'merma' | 'ajuste' | 'venta_perdida' | 'devolucion_cliente' | 'devolucion_proveedor'
  cantidad: numeric('cantidad', { precision: 12, scale: 2 }).notNull(),
  costoUnitarioHistorico: numeric('costo_unitario_historico', { precision: 12, scale: 2 }).notNull(),
  precioVentaHistorico: numeric('precio_venta_historico', { precision: 12, scale: 2 }),
  motivo: varchar('motivo', { length: 255 }),
  estadoPago: varchar('estado_pago', { length: 30 }).default('contado').notNull(), // 'contado' | 'credito_pendiente' | 'credito_pagado'
  llaveIdempotencia: varchar('llave_idempotencia', { length: 64 }),
  fechaEvento: date('fecha_evento').notNull(),
  fechaRegistro: timestamp('fecha_registro').defaultNow().notNull(),
}, (t) => ({
  idempIdx: uniqueIndex('transaccion_idemp_idx').on(t.empresaId, t.llaveIdempotencia),
}));

// 7. ORDEN_COMPRA (Pedidos en Tránsito)
export const ordenesCompra = pgTable('orden_compra', {
  id: uuid('id').defaultRandom().primaryKey(),
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  productoId: uuid('producto_id').references(() => productos.id, { onDelete: 'cascade' }).notNull(),
  proveedorId: uuid('proveedor_id').references(() => proveedores.id).notNull(),
  cantidadPedida: numeric('cantidad_pedida', { precision: 12, scale: 2 }).notNull(),
  estado: varchar('estado', { length: 50 }).default('en_transito').notNull(), // 'en_transito' | 'recibido' | 'cancelado'
  fechaEmision: date('fecha_emision').notNull(),
  fechaEntregaEstimada: date('fecha_entrega_estimada'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. PARAMETROS_CALCULO (Persistencia del Motor DSS)
export const parametrosCalculo = pgTable('parametros_calculo', {
  id: uuid('id').defaultRandom().primaryKey(),
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  productoId: uuid('producto_id').references(() => productos.id, { onDelete: 'cascade' }).notNull(),
  categoriaAbc: varchar('categoria_abc', { length: 1 }), // 'A' | 'B' | 'C'
  politica: varchar('politica', { length: 1 }).default('Q').notNull(), // 'Q' | 'P'
  demandaPromedioDiaria: numeric('demanda_promedio_diaria', { precision: 10, scale: 4 }), // d
  desviacionEstandarDiaria: numeric('desviacion_estandar_diaria', { precision: 10, scale: 4 }), // sigma_d
  diasHistorial: integer('dias_historial').default(0).notNull(),
  diasConVenta: integer('dias_con_venta').default(0).notNull(),
  faseArranque: integer('fase_arranque').default(1).notNull(), // 1: Min/Max | 2: Recopilación | 3: Algoritmo Activo
  eoqCalculado: numeric('eoq_calculado', { precision: 12, scale: 2 }),
  ropCalculado: numeric('rop_calculado', { precision: 12, scale: 2 }),
  stockSeguridadCalculado: numeric('stock_seguridad_calculado', { precision: 12, scale: 2 }),
  intervaloRevisionDias: integer('intervalo_revision_dias'),
  nivelObjetivoT: numeric('nivel_objetivo_t', { precision: 12, scale: 2 }),
  demandaAnual: numeric('demanda_anual', { precision: 14, scale: 2 }), // D (unidades/año)
  valorConsumoAnual: numeric('valor_consumo_anual', { precision: 14, scale: 2 }), // V = D * C
  porcentajeValor: numeric('porcentaje_valor', { precision: 6, scale: 2 }), // % individual sobre V total
  porcentajeAcumulado: numeric('porcentaje_acumulado', { precision: 6, scale: 2 }), // % acumulado (curva de Pareto)
  jobId: uuid('job_id'), // Correlación con la ejecución del job nocturno o manual
  esVigente: boolean('es_vigente').default(true).notNull(),
  fechaCalculo: timestamp('fecha_calculo').defaultNow().notNull(),
});

// 9. INGESTA (Estado de extracción IA para flujo Human-in-the-Loop)
export const ingestas = pgTable('ingesta', {
  id: uuid('id').defaultRandom().primaryKey(),
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  s3Key: varchar('s3_key', { length: 512 }).notNull(),
  estado: varchar('estado', { length: 20 }).default('pendiente').notNull(), // 'pendiente' | 'confirmada' | 'descartada'
  fechaEvento: date('fecha_evento'),
  items: jsonb('items'),
  llaveIdempotencia: varchar('llave_idempotencia', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  ingestaIdempIdx: uniqueIndex('ingesta_idemp_idx').on(t.empresaId, t.llaveIdempotencia),
}));
