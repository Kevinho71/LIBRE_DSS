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

export type CreateProductoInput = z.input<typeof CreateProductoSchema>;
export type CreateProductoOutput = z.output<typeof CreateProductoSchema>;
export type UpdateProductoInput = z.input<typeof UpdateProductoSchema>;
export type UpdateProductoOutput = z.output<typeof UpdateProductoSchema>;
export type ListProductosQueryInput = z.input<typeof ListProductosQuerySchema>;
export type ListProductosQueryOutput = z.output<typeof ListProductosQuerySchema>;
