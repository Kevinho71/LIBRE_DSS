import { z } from 'zod';

export const recalcularAbcSchema = z
  .object({
    // Parámetros opcionales reservados para futura parametrización del recálculo.
  })
  .optional()
  .default({});
