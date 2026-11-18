import { z } from 'zod';

// El endpoint GET /dashboard/kpis no recibe body ni query obligatorio.
export const dashboardKpisQuerySchema = z
  .object({})
  .optional()
  .default({});

export const reporteCostosQuerySchema = z.object({
  productoId: z.string().uuid('productoId debe ser un UUID válido').optional(),
  dias: z.coerce
    .number()
    .int()
    .min(7, 'El rango mínimo es de 7 días')
    .max(365, 'El rango máximo es de 365 días')
    .optional()
    .default(30),
});

export type ReporteCostosQuery = z.infer<typeof reporteCostosQuerySchema>;
