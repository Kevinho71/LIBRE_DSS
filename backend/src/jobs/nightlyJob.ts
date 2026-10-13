import crypto from 'crypto';
import { dssRepository } from '../modules/dss/dss.repository';
import { dssService } from '../modules/dss/dss.service';
import { logger } from '../shared/utils/logger';

/**
 * Job nocturno de reclasificación ABC y recálculo de EOQ/ROP (EventBridge 3:00 AM).
 * Recorre todas las empresas del tenant y recalcula la clasificación ABC de cada una,
 * seguida de los parámetros cuantitativos de reabastecimiento (EOQ, ROP y stock de seguridad).
 */
export async function handler(_event?: unknown, _context?: unknown) {
  const jobId = crypto.randomUUID();
  const empresaIds = await dssRepository.listarEmpresas();

  const resultados: Array<{
    empresaId: string;
    ok: boolean;
    totalProductos?: number;
    productosEoqRop?: number;
    productosSistemas?: number;
  }> = [];

  for (const empresaId of empresaIds) {
    try {
      const abc = await dssService.recalcularAbc(empresaId, jobId);
      const eoqRop = await dssService.recalcularEoqRop(empresaId, jobId);
      const sistemas = await dssService.recalcularSistemas(empresaId, jobId);
      resultados.push({
        empresaId,
        ok: true,
        totalProductos: abc.totalProductos,
        productosEoqRop: eoqRop.productosProcesados,
        productosSistemas: sistemas.totalProductos,
      });
    } catch (error) {
      logger.error('Fallo en el recálculo del motor de una empresa', { empresaId, error });
      resultados.push({ empresaId, ok: false });
    }
  }

  logger.info('Job nocturno de clasificación ABC, recálculo EOQ/ROP y sistemas P/Q completado', {
    jobId,
    empresasProcesadas: resultados.length,
  });

  return { jobId, empresasProcesadas: resultados.length, resultados };
}
