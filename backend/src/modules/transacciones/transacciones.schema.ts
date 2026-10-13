import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const registrarVentaSchema = z.object({
  productoId: z.string().uuid('productoId debe ser un UUID válido'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precioVenta: z.number().nonnegative('El precio de venta no puede ser negativo').optional(),
  costoUnitario: z.number().nonnegative('El costo unitario no puede ser negativo').optional(),
  estadoPago: z.enum(['contado', 'credito_pendiente']).default('contado'),
  fechaEvento: z.string().regex(dateRegex, 'fechaEvento debe tener formato YYYY-MM-DD').optional(),
  llaveIdempotencia: z.string().max(64, 'llaveIdempotencia no puede exceder 64 caracteres').optional(),
  motivo: z.string().max(255).optional(),
});

export const itemVentaBatchSchema = z.object({
  productoId: z.string().uuid('productoId debe ser un UUID válido'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precioVenta: z.number().nonnegative('El precio de venta no puede ser negativo').optional(),
});

export const registrarVentaBatchSchema = z.object({
  notaId: z.string().uuid('notaId debe ser un UUID válido').optional(),
  items: z.array(itemVentaBatchSchema).min(1, 'Debe incluir al menos un producto en la venta por lote'),
  estadoPago: z.enum(['contado', 'credito_pendiente']).default('contado'),
  fechaEvento: z.string().regex(dateRegex, 'fechaEvento debe tener formato YYYY-MM-DD').optional(),
  llaveIdempotencia: z.string().max(64).optional(),
  motivo: z.string().max(255).optional(),
});

export const registrarIngresoSchema = z.object({
  productoId: z.string().uuid('productoId debe ser un UUID válido'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  esUnidadCompra: z.boolean().default(false),
  costoUnitarioIngreso: z.number().nonnegative().optional(),
  actualizarCostoReposicion: z.boolean().default(false),
  ordenCompraId: z.string().uuid().optional(),
  fechaEvento: z.string().regex(dateRegex, 'fechaEvento debe tener formato YYYY-MM-DD').optional(),
  llaveIdempotencia: z.string().max(64).optional(),
  motivo: z.string().max(255).optional(),
});

export const registrarAjusteSchema = z.object({
  productoId: z.string().uuid('productoId debe ser un UUID válido'),
  conteoFisico: z.number().nonnegative('El conteo físico no puede ser negativo').optional(),
  cantidad: z.number().positive('La cantidad de merma debe ser positiva').optional(),
  motivo: z.string().min(3, 'El motivo del ajuste/merma es obligatorio y debe tener al menos 3 caracteres').max(255),
  fechaEvento: z.string().regex(dateRegex, 'fechaEvento debe tener formato YYYY-MM-DD').optional(),
  llaveIdempotencia: z.string().max(64).optional(),
}).refine(data => data.conteoFisico !== undefined || data.cantidad !== undefined, {
  message: 'Debe especificar el conteoFisico o la cantidad de merma',
  path: ['conteoFisico'],
});

export const registrarDevolucionSchema = z.object({
  productoId: z.string().uuid('productoId debe ser un UUID válido'),
  tipo: z.enum(['devolucion_cliente', 'devolucion_proveedor']),
  cantidad: z.number().positive('La cantidad a devolver debe ser mayor a 0'),
  notaId: z.string().uuid('notaId debe ser un UUID válido').optional(),
  motivo: z.string().max(255).optional(),
  fechaEvento: z.string().regex(dateRegex, 'fechaEvento debe tener formato YYYY-MM-DD').optional(),
  llaveIdempotencia: z.string().max(64).optional(),
});

export const actualizarEstadoPagoSchema = z.object({
  estadoPago: z.enum(['contado', 'credito_pendiente', 'credito_pagado']),
});

export const filtroTransaccionesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productoId: z.string().uuid().optional(),
  tipo: z.enum(['venta', 'ingreso', 'merma', 'ajuste', 'venta_perdida', 'devolucion_cliente', 'devolucion_proveedor']).optional(),
  desde: z.string().regex(dateRegex).optional(),
  hasta: z.string().regex(dateRegex).optional(),
  notaId: z.string().uuid().optional(),
  estadoPago: z.enum(['contado', 'credito_pendiente', 'credito_pagado']).optional(),
});
