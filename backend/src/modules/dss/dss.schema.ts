import { z } from 'zod';

export const recalcularAbcSchema = z
  .object({
    // Parámetros opcionales reservados para futura parametrización del recálculo.
  })
  .optional()
  .default({});

export const retrospectivaSchema = z.object({
  serieDemanda: z.array(z.number().nonnegative('La demanda no puede ser negativa')).min(1, 'Debe incluir al menos un día de demanda'),
  inventarioInicial: z.number().nonnegative('El inventario inicial no puede ser negativo').default(0),
  costoUnitario: z.number().positive('El costo unitario debe ser mayor a 0'),
  precioVenta: z.number().positive('El precio de venta debe ser mayor a 0'),
  costoPedido: z.number().positive('El costo de pedido debe ser mayor a 0'),
  tasaMantenimientoAnual: z.number().positive('La tasa de mantenimiento debe ser mayor a 0').default(0.2),
  leadTimeDias: z.number().int().positive('El lead time debe ser un entero positivo').default(3),
  categoriaAbc: z.enum(['A', 'B', 'C']).default('A'),
});

export const explicarAlertaSchema = z.object({
  productoId: z.string().uuid('productoId debe ser un UUID válido'),
});

export const relojSimuladoSchema = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha debe tener formato YYYY-MM-DD')
    .nullable(),
});

export const configuracionDssSchema = z.object({
  topeCapitalPedido: z.number().nonnegative('El tope de capital por pedido no puede ser negativo'),
});

export type RetrospectivaInput = z.infer<typeof retrospectivaSchema>;
export type ExplicarAlertaInput = z.infer<typeof explicarAlertaSchema>;
export type RelojSimuladoInput = z.infer<typeof relojSimuladoSchema>;
export type ConfiguracionDssInput = z.infer<typeof configuracionDssSchema>;
