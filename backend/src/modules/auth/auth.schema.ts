import { z } from 'zod';

export const RegisterSchema = z.object({
  nombreEmpresa: z.string().min(2, 'El nombre de la empresa debe tener al menos 2 caracteres').max(255),
  nit: z.string().max(50).optional().nullable(),
  plan: z.enum(['gratuito', 'pago']).default('gratuito'),
  nombreUsuario: z.string().min(2, 'El nombre de usuario debe tener al menos 2 caracteres').max(150),
  email: z.string().email('El correo electrónico no es válido').max(255).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  aceptaTerminos: z.boolean().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
