import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const extraerIngestaSchema = z.object({
  s3Key: z.string().min(1, 's3Key es obligatoria').max(512, 's3Key no puede exceder 512 caracteres'),
});

export const confirmarIngestaSchema = z.object({
  fechaEvento: z.string().regex(dateRegex, 'fechaEvento debe tener formato YYYY-MM-DD'),
  items: z
    .array(
      z.object({
        productoId: z.string().uuid('productoId debe ser un UUID válido'),
        cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
        precioVenta: z.number().nonnegative('El precio de venta no puede ser negativo').optional(),
      })
    )
    .min(1, 'Debe confirmar al menos un ítem'),
});
