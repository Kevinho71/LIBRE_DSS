import crypto from 'crypto';
import { dssRepository } from '../modules/dss/dss.repository';
import { dssService } from '../modules/dss/dss.service';
import { logger } from '../shared/utils/logger';

/**
 * Job nocturno de reclasificación ABC (EventBridge 3:00 AM).
 * Recorre todas las empresas del tenant y recalcula la clasificación ABC de cada una.
 */
export async function handler(_event?: unknown, _context?: unknown) {
  const jobId = crypto.randomUUID();
  const empresaIds = await dssRepository.listarEmpresas();

  const resultados: Array<{ empresaId: string; ok: boolean; totalProductos?: number }> = [];

  for (const empresaId of empresaIds) {
    try {
      const r = await dssService.recalcularAbc(empresaId, jobId);
      resultados.push({ empresaId, ok: true, totalProductos: r.totalProductos });
    } catch (error) {
      logger.error('Fallo en la reclasificación ABC de una empresa', { empresaId, error });
      resultados.push({ empresaId, ok: false });
    }
  }

  logger.info('Job nocturno de clasificación ABC completado', {
    jobId,
    empresasProcesadas: resultados.length,
  });

  return { jobId, empresasProcesadas: resultados.length, resultados };
}
