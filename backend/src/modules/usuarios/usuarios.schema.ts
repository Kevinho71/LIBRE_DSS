import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  email: z
    .string()
    .email('El correo electrónico no es válido')
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  rol: z.enum(['administrador', 'operador']).default('operador'),
});

export const actualizarRolSchema = z.object({
  rol: z.enum(['administrador', 'operador']),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarRolInput = z.infer<typeof actualizarRolSchema>;
