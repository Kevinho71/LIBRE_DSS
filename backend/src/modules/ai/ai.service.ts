import { env } from '../../shared/utils/env';
import { logger } from '../../shared/utils/logger';
import { leerObjetoComoBase64 } from '../../shared/aws/s3';
import { extraerDesdeImagen } from './ai.extractor';
import { aiMatcher } from './ai.matcher';
import { aiRepository } from './ai.repository';
import {
  ConfirmarIngestaDto,
  ExtraerIngestaDto,
  ResultadoConfirmacion,
  ResultadoExtraccion,
  ItemMatcheado,
} from './ai.types';

export const aiService = {
  async extraerIngesta(empresaId: string, dto: ExtraerIngestaDto): Promise<ResultadoExtraccion> {
    const { mimeType, base64 } = await leerObjetoComoBase64(env.AWS_S3_BUCKET, dto.s3Key);
    const extraccion = await extraerDesdeImagen(mimeType, base64);

    const items: ItemMatcheado[] = await Promise.all(
      extraccion.items.map(async (item) => {
        const coincidencias = await aiMatcher.buscarCoincidencias(empresaId, item.descripcion, 1);
        const mejor = coincidencias[0] ?? null;
        return {
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario ?? null,
          productoId: mejor?.productoId ?? null,
          nombreProducto: mejor?.nombre ?? null,
          sku: mejor?.sku ?? null,
          similitud: mejor?.similitud ?? null,
        };
      })
    );

    const ingesta = await aiRepository.createIngesta({
      empresaId,
      s3Key: dto.s3Key,
      estado: 'pendiente',
      fechaEvento: extraccion.fecha ?? null,
      items: { fecha: extraccion.fecha ?? null, items },
      llaveIdempotencia: dto.s3Key,
    });

    logger.info('Ingesta de recibo extraída (pendiente de confirmación)', {
      empresaId,
      ingestaId: ingesta.id,
      totalItems: items.length,
    });

    return {
      ingestaId: ingesta.id,
      estado: 'pendiente',
      fechaSugerida: extraccion.fecha ?? null,
      items,
    };
  },

  async confirmarIngesta(empresaId: string, ingestaId: string, dto: ConfirmarIngestaDto): Promise<ResultadoConfirmacion> {
    const resultado = await aiRepository.confirmar(empresaId, ingestaId, dto.fechaEvento, dto.items);

    logger.info('Ingesta confirmada', {
      empresaId,
      ingestaId,
      transaccionesCreadas: resultado.transaccionesCreadas,
      yaConfirmada: resultado.yaConfirmada,
    });

    return {
      ingestaId: resultado.ingesta.id,
      estado: 'confirmada',
      transaccionesCreadas: resultado.transaccionesCreadas,
      yaConfirmada: resultado.yaConfirmada,
    };
  },
};
