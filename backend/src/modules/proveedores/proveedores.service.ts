import { proveedoresRepository } from './proveedores.repository';
import { productosRepository } from '../productos/productos.repository';
import {
  CreateProveedorDto,
  ProveedorDto,
  AsociarProductoProveedorDto,
  ProductoProveedorDto,
} from './proveedores.types';
import { NotFoundError } from '../../shared/errors/AppError';
import { logger } from '../../shared/utils/logger';
import { proveedores, productoProveedores } from '../../db/schema';

import { CreateProveedorSchema, AsociarProductoProveedorSchema } from './proveedores.schema';

function toProveedorDto(row: typeof proveedores.$inferSelect): ProveedorDto {
  return {
    id: row.id,
    empresaId: row.empresaId,
    nombre: row.nombre,
    contacto: row.contacto,
    telefono: row.telefono,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

function toProductoProveedorDto(
  row: typeof productoProveedores.$inferSelect,
  proveedorNombre?: string
): ProductoProveedorDto {
  return {
    id: row.id,
    empresaId: row.empresaId,
    productoId: row.productoId,
    proveedorId: row.proveedorId,
    codigoProveedor: row.codigoProveedor,
    costoCompra: row.costoCompra != null ? Number(row.costoCompra) : null,
    leadTimeDias: Number(row.leadTimeDias),
    costoPedido: Number(row.costoPedido),
    loteMinimo: Number(row.loteMinimo),
    esPrincipal: Boolean(row.esPrincipal),
    proveedorNombre,
  };
}

export const proveedoresService = {
  async crearProveedor(empresaId: string, inputDto: CreateProveedorDto): Promise<ProveedorDto> {
    const dto = CreateProveedorSchema.parse(inputDto);
    const row = await proveedoresRepository.create(empresaId, dto);
    logger.info('Proveedor registrado exitosamente', { empresaId, proveedorId: row.id, nombre: row.nombre });
    return toProveedorDto(row);
  },

  async listarProveedores(empresaId: string): Promise<ProveedorDto[]> {
    const rows = await proveedoresRepository.findAll(empresaId);
    return rows.map(toProveedorDto);
  },

  async asociarAProducto(
    empresaId: string,
    productoId: string,
    inputDto: AsociarProductoProveedorDto
  ): Promise<ProductoProveedorDto> {
    const dto = AsociarProductoProveedorSchema.parse(inputDto);
    // 1. Validar que el producto pertenezca a la empresa
    const producto = await productosRepository.findById(empresaId, productoId);
    if (!producto) {
      throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', 'El producto especificado no fue encontrado en su catálogo');
    }

    // 2. Validar que el proveedor pertenezca a la empresa
    const proveedor = await proveedoresRepository.findById(empresaId, dto.proveedorId);
    if (!proveedor) {
      throw new NotFoundError('PROVEEDOR_NO_ENCONTRADO', 'El proveedor especificado no fue encontrado');
    }

    // 3. Si se marca como principal, desmarcar vínculos previos (CB-02)
    if (dto.esPrincipal) {
      await proveedoresRepository.desmarcarPrincipalAnteriores(empresaId, productoId);
    }

    // 4. Crear o actualizar vínculo
    const vinculo = await proveedoresRepository.asociarProducto(empresaId, productoId, dto);
    logger.info('Proveedor asociado a producto exitosamente (CB-02)', {
      empresaId,
      productoId,
      proveedorId: dto.proveedorId,
      esPrincipal: dto.esPrincipal,
    });

    return toProductoProveedorDto(vinculo, proveedor.nombre);
  },

  async listarProveedoresDeProducto(empresaId: string, productoId: string): Promise<ProductoProveedorDto[]> {
    const producto = await productosRepository.findById(empresaId, productoId);
    if (!producto) {
      throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', 'El producto especificado no fue encontrado');
    }

    const rows = await proveedoresRepository.findProveedoresByProducto(empresaId, productoId);
    return rows.map((r) => toProductoProveedorDto(r.vinculo, r.proveedorNombre));
  },
};
