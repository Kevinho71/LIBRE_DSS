import { z } from 'zod';

// El endpoint GET /dashboard/kpis no recibe body ni query obligatorio.
export const dashboardKpisQuerySchema = z
  .object({})
  .optional()
  .default({});
