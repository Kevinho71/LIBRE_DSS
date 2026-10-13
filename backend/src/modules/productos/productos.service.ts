import { productosRepository } from './productos.repository';
import {
  CreateProductoDto,
  UpdateProductoDto,
  ListProductosQueryDto,
  ProductoDto,
  ProductoListItemDto,
  EstadoAlerta,
} from './productos.types';
import { ConflictError, NotFoundError, ForbiddenError } from '../../shared/errors/AppError';
import { extractPagination, buildPaginatedResult, PaginatedResult } from '../../shared/utils/pagination';
import { logger } from '../../shared/utils/logger';
import { CreateProductoSchema, UpdateProductoSchema } from './productos.schema';
import { productos } from '../../db/schema';

const MAX_FREE_SKUS = 15;

function toProductoDto(row: typeof productos.$inferSelect): ProductoDto {
  return {
    id: row.id,
    empresaId: row.empresaId,
    sku: row.sku,
    nombre: row.nombre,
    unidadMedida: row.unidadMedida,
    unidadCompra: row.unidadCompra,
    factorConversion: Number(row.factorConversion),
    costoUnitario: Number(row.costoUnitario),
    precioVenta: Number(row.precioVenta),
    costoPedido: Number(row.costoPedido),
    tasaMantenimientoAnual: Number(row.tasaMantenimientoAnual),
    stockActual: Number(row.stockActual),
    stockMinimoManual: row.stockMinimoManual != null ? Number(row.stockMinimoManual) : null,
    stockMaximoManual: row.stockMaximoManual != null ? Number(row.stockMaximoManual) : null,
    origenDato: row.origenDato,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

function calcularAlerta(
  stockActual: number,
  stockMinimoManual: number | null,
  ropCalculado: number | null
): EstadoAlerta {
  if (stockActual <= 0) return 'sin_stock';
  if (stockMinimoManual != null && stockActual <= stockMinimoManual) return 'stock_minimo';
  if (ropCalculado != null && stockActual <= ropCalculado) return 'rop_alcanzado';
  return 'normal';
}

export const productosService = {
  async crearProducto(empresaId: string, inputDto: CreateProductoDto): Promise<ProductoDto> {
    const dto = CreateProductoSchema.parse(inputDto);

    // 1. Validar límite freemium de 15 SKUs (HU-33)
    const plan = await productosRepository.getEmpresaPlan(empresaId);
    if (plan === 'gratuito') {
      const totalActivos = await productosRepository.countActivos(empresaId);
      if (totalActivos >= MAX_FREE_SKUS) {
        throw new ForbiddenError(
          'LIMITE_SKUS_ALCANZADO',
          `El plan gratuito permite un máximo de ${MAX_FREE_SKUS} productos activos. Actualice su suscripción al plan de pago para registrar más SKUs.`,
          { limite: MAX_FREE_SKUS, actuales: totalActivos }
        );
      }
    }

    // 2. Validar unicidad de SKU en la empresa
    if (dto.sku) {
      const duplicado = await productosRepository.findBySku(empresaId, dto.sku);
      if (duplicado) {
        throw new ConflictError(
          'SKU_DUPLICADO',
          `El SKU '${dto.sku}' ya está registrado en un producto activo de su empresa.`
        );
      }
    }

    // 3. Crear el producto
    const creado = await productosRepository.create(empresaId, dto);
    logger.info('Producto creado exitosamente', { empresaId, productoId: creado.id, sku: creado.sku });

    return toProductoDto(creado);
  },

  async obtenerProducto(empresaId: string, id: string): Promise<ProductoDto> {
    const row = await productosRepository.findById(empresaId, id);
    if (!row) {
      throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', 'El producto solicitado no fue encontrado');
    }

    return toProductoDto(row);
  },

  async actualizarProducto(empresaId: string, id: string, inputDto: UpdateProductoDto): Promise<ProductoDto> {
    const dto = UpdateProductoSchema.parse(inputDto);
    const existing = await productosRepository.findById(empresaId, id);
    if (!existing) {
      throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', 'El producto solicitado no fue encontrado');
    }

    if (dto.sku && dto.sku !== existing.sku) {
      const duplicate = await productosRepository.findBySku(empresaId, dto.sku);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(
          'SKU_DUPLICADO',
          `El SKU '${dto.sku}' ya pertenece a otro producto activo de su catálogo.`
        );
      }
    }

    const updated = await productosRepository.update(empresaId, id, dto);
    if (!updated) {
      throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', 'No se pudo actualizar el producto');
    }

    logger.info('Producto actualizado exitosamente', { empresaId, productoId: id });
    return toProductoDto(updated);
  },

  async desactivarProducto(empresaId: string, id: string): Promise<void> {
    const existing = await productosRepository.findById(empresaId, id);
    if (!existing) {
      throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', 'El producto solicitado no fue encontrado');
    }

    const success = await productosRepository.softDelete(empresaId, id);
    if (!success) {
      throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', 'No se pudo desactivar el producto');
    }

    logger.info('Producto desactivado con borrado lógico', { empresaId, productoId: id });
  },

  async listarProductos(
    empresaId: string,
    query?: ListProductosQueryDto
  ): Promise<PaginatedResult<ProductoListItemDto>> {
    const paginationParams = extractPagination(query as Record<string, string | undefined>);
    const search = query?.buscar;

    const { items, total } = await productosRepository.findList(empresaId, {
      search,
      offset: paginationParams.offset,
      limit: paginationParams.limit,
    });

    const mappedItems: ProductoListItemDto[] = items.map((it) => {
      const baseDto = toProductoDto(it.producto);
      const ropNum = it.ropCalculado != null ? Number(it.ropCalculado) : null;
      const estadoAlerta = calcularAlerta(baseDto.stockActual, baseDto.stockMinimoManual, ropNum);

      return {
        ...baseDto,
        categoriaAbc: (it.categoriaAbc as 'A' | 'B' | 'C') ?? null,
        ropCalculado: ropNum,
        estadoAlerta,
      };
    });

    // Si se solicitó filtrar solo alertas
    const soloAlertas = query?.soloAlertas === 'true' || query?.soloAlertas === '1';
    const finalItems = soloAlertas
      ? mappedItems.filter((i) => i.estadoAlerta !== 'normal')
      : mappedItems;

    return buildPaginatedResult(finalItems, total, paginationParams);
  },
};
