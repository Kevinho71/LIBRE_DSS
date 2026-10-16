import { client } from './client';
import type {
  AsociarProductoProveedorDTO,
  CrearProveedorDTO,
  ProductoProveedorDto,
  ProveedorDto,
} from '@libredss/shared';

/** Endpoints de proveedores y su vínculo N:M con productos (HU-08, CB-02). */
export const proveedoresApi = {
  listar: () => client.get<ProveedorDto[]>('/proveedores'),

  crear: (dto: CrearProveedorDTO) => client.post<ProveedorDto>('/proveedores', dto),

  listarDeProducto: (productoId: string) =>
    client.get<ProductoProveedorDto[]>(`/productos/${productoId}/proveedores`),

  asociar: (productoId: string, dto: AsociarProductoProveedorDTO) =>
    client.post<ProductoProveedorDto>(`/productos/${productoId}/proveedores`, dto),
};
