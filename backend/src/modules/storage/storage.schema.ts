import { z } from 'zod';

export const presignedUrlSchema = z.object({
  filename: z.string().min(1, 'El nombre del archivo es obligatorio').max(255),
  contentType: z.string().regex(/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/, 'Tipo de contenido no soportado. Se admiten imágenes JPEG, PNG, WEBP o PDF'),
});
