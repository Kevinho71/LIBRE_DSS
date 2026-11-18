import { productosRepository } from './productos.repository';
import {
  CreateProductoDto,
  UpdateProductoDto,
  ListProductosQueryDto,
  ProductoDto,
  ProductoListItemDto,
  EstadoAlerta,
  ImportarCsvDto,
  ResultadoImportacionCsv,
  OmitidoCsv,
} from './productos.types';
import { ConflictError, NotFoundError, ForbiddenError, ValidationError } from '../../shared/errors/AppError';
import { extractPagination, buildPaginatedResult, PaginatedResult } from '../../shared/utils/pagination';
import { logger } from '../../shared/utils/logger';
import { CreateProductoSchema, UpdateProductoSchema, FilaCsvProductoSchema } from './productos.schema';
import { productos } from '../../db/schema';
import Papa from 'papaparse';

const MAX_FREE_SKUS = 15;

interface FilaCsvCruda {
  fila: number;
  datos: Record<string, unknown>;
}

function normalizarHeader(h: string): string {
  if (h == null) return '';
  const clean = h
    .trim()
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[\s-]+/g, '_');

  const mapa: Record<string, string> = {
    nombre: 'nombre',
    sku: 'sku',
    unidad_medida: 'unidadMedida',
    unidadmedida: 'unidadMedida',
    unidad_compra: 'unidadCompra',
    unidadcompra: 'unidadCompra',
    factor_conversion: 'factorConversion',
    factorconversion: 'factorConversion',
    costo_unitario: 'costoUnitario',
    costounitario: 'costoUnitario',
    precio_venta: 'precioVenta',
    precioventa: 'precioVenta',
    costo_pedido: 'costoPedido',
    costopedido: 'costoPedido',
    tasa_mantenimiento_anual: 'tasaMantenimientoAnual',
    tasamantenimientoanual: 'tasaMantenimientoAnual',
    tasa_mantenimiento: 'tasaMantenimientoAnual',
    stock_actual: 'stockActual',
    stockactual: 'stockActual',
    stock_minimo_manual: 'stockMinimoManual',
    stock_minimo: 'stockMinimoManual',
    stock_maximo_manual: 'stockMaximoManual',
    stock_maximo: 'stockMaximoManual',
  };

  return mapa[clean] ?? h.trim();
}

function parsearCsv(contenido: string): FilaCsvCruda[] {
  const resultado = Papa.parse<Record<string, unknown>>(contenido, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => normalizarHeader(h),
  });

  if (resultado.errors.length > 0 && resultado.data.length === 0) {
    throw new ValidationError(
      'CSV_INVALIDO',
      'El archivo CSV no pudo parsearse correctamente',
      resultado.errors.map((e) => ({ fila: e.row, mensaje: e.message }))
    );
  }

  return resultado.data.map((fila, idx) => ({ fila: idx + 2, datos: fila as Record<string, unknown> }));
}

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

  async buscarRapido(empresaId: string, query: string, limit = 10) {
    return productosRepository.buscarRapido(empresaId, query, limit);
  },

  async importarCsv(empresaId: string, inputDto: ImportarCsvDto): Promise<ResultadoImportacionCsv> {
    const filasCrudas = parsearCsv(inputDto.contenido);
    if (filasCrudas.length === 0) {
      throw new ValidationError('CSV_VACIO', 'El archivo CSV no contiene filas de datos');
    }

    // 1. Validación Zod fila por fila (all-or-nothing sobre errores de formato).
    const errores: Array<{ fila: number; mensaje: string }> = [];
    const validas: Array<{ fila: number; datos: ReturnType<typeof FilaCsvProductoSchema.parse> }> = [];

    for (const fila of filasCrudas) {
      const resultado = FilaCsvProductoSchema.safeParse(fila.datos);
      if (!resultado.success) {
        const detalle = resultado.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        errores.push({ fila: fila.fila, mensaje: detalle });
        continue;
      }
      validas.push({ fila: fila.fila, datos: resultado.data });
    }

    if (errores.length > 0) {
      throw new ValidationError(
        'CSV_FILAS_INVALIDAS',
        `Se encontraron ${errores.length} fila(s) con datos inválidos. No se importó ningún producto.`,
        errores
      );
    }

    // 2. Deduplicación de SKUs: dentro del CSV y contra el catálogo activo.
    const omitidos: OmitidoCsv[] = [];
    const skusEnArchivo = validas
      .map((f) => f.datos.sku)
      .filter((s): s is string => s != null && s.trim() !== '')
      .map((s) => s.trim());

    const skusEnBd = await productosRepository.findBySkus(empresaId, skusEnArchivo);
    const skusBdSet = new Set(skusEnBd.map((s) => s.trim()));

    const skusVistos = new Set<string>();
    const unicas = validas.filter((f) => {
      const sku = f.datos.sku?.trim() ?? null;
      if (sku == null) return true;

      if (skusVistos.has(sku)) {
        omitidos.push({ fila: f.fila, sku, motivo: 'SKU_DUPLICADO' });
        return false;
      }
      if (skusBdSet.has(sku)) {
        omitidos.push({ fila: f.fila, sku, motivo: 'SKU_DUPLICADO' });
        return false;
      }
      skusVistos.add(sku);
      return true;
    });

    // 3. Límite freemium: truncar al cupo disponible con aviso.
    const plan = await productosRepository.getEmpresaPlan(empresaId);
    let aImportar = unicas;
    let avisoFreemium: string | null = null;

    if (plan === 'gratuito') {
      const actuales = await productosRepository.countActivos(empresaId);
      const cupo = Math.max(0, MAX_FREE_SKUS - actuales);
      if (unicas.length > cupo) {
        const excedentes = unicas.slice(cupo);
        for (const f of excedentes) {
          omitidos.push({ fila: f.fila, sku: f.datos.sku?.trim() ?? null, motivo: 'LIMITE_SKUS' });
        }
        aImportar = unicas.slice(0, cupo);
        avisoFreemium = `El plan gratuito permite ${MAX_FREE_SKUS} SKUs. Se importaron ${aImportar.length} y se omitieron ${excedentes.length} por exceder el límite.`;
      }
    }

    // 4. Inserción atómica.
    const importados = await productosRepository.bulkInsert(
      empresaId,
      aImportar.map((f) => f.datos)
    );

    logger.info('Importación CSV de catálogo completada', {
      empresaId,
      importados,
      omitidos: omitidos.length,
      avisoFreemium,
    });

    return {
      importados,
      omitidos: omitidos.length,
      avisoFreemium,
      omitidosDetalle: omitidos,
    };
  },
};
