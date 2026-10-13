import { z } from 'zod';

export const CreateProductoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  sku: z.string().max(100).optional().nullable(),
  unidadMedida: z.string().max(50).default('unidad'),
  unidadCompra: z.string().max(50).optional().nullable(),
  factorConversion: z.number().positive('El factor de conversión debe ser mayor a 0').default(1.00),
  costoUnitario: z.number().positive('El costo unitario debe ser mayor a 0'),
  precioVenta: z.number().positive('El precio de venta debe ser mayor a 0'),
  costoPedido: z.number().positive('El costo de pedido debe ser mayor a 0').default(50.00),
  tasaMantenimientoAnual: z.number().positive('La tasa de mantenimiento debe ser mayor a 0').default(0.2000),
  stockActual: z.number().min(0, 'El stock actual no puede ser negativo').default(0),
  stockMinimoManual: z.number().positive('El stock mínimo manual debe ser positivo').optional().nullable(),
  stockMaximoManual: z.number().positive('El stock máximo manual debe ser positivo').optional().nullable(),
  origenDato: z.enum(['manual', 'csv', 'ocr']).default('manual'),
});

export const UpdateProductoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255).optional(),
  sku: z.string().max(100).optional().nullable(),
  unidadMedida: z.string().max(50).optional(),
  unidadCompra: z.string().max(50).optional().nullable(),
  factorConversion: z.number().positive('El factor de conversión debe ser mayor a 0').optional(),
  costoUnitario: z.number().positive('El costo unitario debe ser mayor a 0').optional(),
  precioVenta: z.number().positive('El precio de venta debe ser mayor a 0').optional(),
  costoPedido: z.number().positive('El costo de pedido debe ser mayor a 0').optional(),
  tasaMantenimientoAnual: z.number().positive('La tasa de mantenimiento debe ser mayor a 0').optional(),
  stockActual: z.number().min(0, 'El stock actual no puede ser negativo').optional(),
  stockMinimoManual: z.number().positive('El stock mínimo manual debe ser positivo').optional().nullable(),
  stockMaximoManual: z.number().positive('El stock máximo manual debe ser positivo').optional().nullable(),
  origenDato: z.enum(['manual', 'csv', 'ocr']).optional(),
});

export const ListProductosQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  buscar: z.string().optional(),
  soloAlertas: z.string().optional(),
});

// Esquema por fila del CSV de catálogo. Los valores llegan como strings desde el
// parser, por lo que los campos numéricos se coercen con z.coerce.number().
export const FilaCsvProductoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  sku: z.preprocess((v) => (v === '' ? null : v), z.string().max(100).optional().nullable()),
  unidadMedida: z.preprocess((v) => (v === '' || v == null ? 'unidad' : v), z.string().max(50).default('unidad')),
  unidadCompra: z.preprocess((v) => (v === '' ? null : v), z.string().max(50).optional().nullable()),
  factorConversion: z.preprocess(
    (v) => (v === '' || v == null ? 1.0 : v),
    z.coerce.number().positive('El factor de conversión debe ser mayor a 0').default(1.0)
  ),
  costoUnitario: z.coerce.number().positive('El costo unitario debe ser mayor a 0'),
  precioVenta: z.coerce.number().positive('El precio de venta debe ser mayor a 0'),
  costoPedido: z.preprocess(
    (v) => (v === '' || v == null ? 50.0 : v),
    z.coerce.number().positive('El costo de pedido debe ser mayor a 0').default(50.0)
  ),
  tasaMantenimientoAnual: z.preprocess(
    (v) => (v === '' || v == null ? 0.2 : v),
    z.coerce.number().positive('La tasa de mantenimiento debe ser mayor a 0').default(0.2)
  ),
  stockActual: z.preprocess(
    (v) => (v === '' || v == null ? 0 : v),
    z.coerce.number().min(0, 'El stock actual no puede ser negativo').default(0)
  ),
  stockMinimoManual: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z.coerce.number().positive('El stock mínimo manual debe ser positivo').optional().nullable()
  ),
  stockMaximoManual: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z.coerce.number().positive('El stock máximo manual debe ser positivo').optional().nullable()
  ),
});

export const ImportarCsvSchema = z.object({
  contenido: z.string().min(1, 'El contenido del CSV no puede estar vacío'),
});

export type CreateProductoInput = z.input<typeof CreateProductoSchema>;
export type CreateProductoOutput = z.output<typeof CreateProductoSchema>;
export type UpdateProductoInput = z.input<typeof UpdateProductoSchema>;
export type UpdateProductoOutput = z.output<typeof UpdateProductoSchema>;
export type ListProductosQueryInput = z.input<typeof ListProductosQuerySchema>;
export type ListProductosQueryOutput = z.output<typeof ListProductosQuerySchema>;
export type FilaCsvProducto = z.output<typeof FilaCsvProductoSchema>;
export type ImportarCsvInput = z.input<typeof ImportarCsvSchema>;
export type ImportarCsvOutput = z.output<typeof ImportarCsvSchema>;
