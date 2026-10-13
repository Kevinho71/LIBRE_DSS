import { CreateProveedorInput, AsociarProductoProveedorInput } from './proveedores.schema';

export type CreateProveedorDto = CreateProveedorInput;
export type AsociarProductoProveedorDto = AsociarProductoProveedorInput;

export interface ProveedorDto {
  id: string;
  empresaId: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  createdAt: string;
}

export interface ProductoProveedorDto {
  id: string;
  empresaId: string;
  productoId: string;
  proveedorId: string;
  codigoProveedor: string | null;
  costoCompra: number | null;
  leadTimeDias: number;
  costoPedido: number;
  loteMinimo: number;
  esPrincipal: boolean;
  proveedorNombre?: string;
}
