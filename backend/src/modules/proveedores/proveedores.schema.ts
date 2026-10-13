import { z } from 'zod';

export const CreateProveedorSchema = z.object({
  nombre: z.string().min(2, 'El nombre del proveedor debe tener al menos 2 caracteres').max(255),
  contacto: z.string().max(255).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
});

export const AsociarProductoProveedorSchema = z.object({
  proveedorId: z.string().uuid('El ID del proveedor debe ser un UUID válido'),
  codigoProveedor: z.string().max(100).optional().nullable(),
  costoCompra: z.number().positive('El costo de compra debe ser mayor a 0').optional().nullable(),
  leadTimeDias: z.number().int('El lead time debe ser un número entero').min(1, 'El lead time debe ser al menos 1 día').default(3),
  costoPedido: z.number().positive('El costo de pedido debe ser mayor a 0').default(50.00),
  loteMinimo: z.number().positive('El lote mínimo debe ser mayor a 0').default(1),
  esPrincipal: z.boolean().default(true),
});

export type CreateProveedorInput = z.input<typeof CreateProveedorSchema>;
export type CreateProveedorOutput = z.output<typeof CreateProveedorSchema>;

export type AsociarProductoProveedorInput = z.input<typeof AsociarProductoProveedorSchema>;
export type AsociarProductoProveedorOutput = z.output<typeof AsociarProductoProveedorSchema>;
