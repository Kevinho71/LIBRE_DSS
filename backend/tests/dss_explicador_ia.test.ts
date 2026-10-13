import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dssService } from '../src/modules/dss/dss.service';
import { dssRepository } from '../src/modules/dss/dss.repository';
import * as explicadorIa from '../src/modules/dss/dss.explicador';
import { env } from '../src/shared/utils/env';
import { NotFoundError } from '../src/shared/errors/AppError';

describe('Explicador de Alertas con IA y Fallback (LIB-47 / HU-34)', () => {
  const empresaId = 'empresa-test-uuid';
  const productoId = 'prod-test-uuid';

  const datosMock = {
    productoId,
    sku: 'SKU-001',
    nombre: 'Pintura Látex Blanca 18L',
    categoriaAbc: 'A' as const,
    stockActual: 10,
    ropCalculado: 25,
    eoqCalculado: 60,
    demandaPromedioDiaria: 3.5,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lanza NotFoundError si el producto no existe en la empresa', async () => {
    vi.spyOn(dssRepository, 'obtenerDatosExplicacion').mockResolvedValue(null);

    await expect(
      dssService.explicarAlerta(empresaId, productoId)
    ).rejects.toThrow(NotFoundError);
  });

  it('enriquece la recomendación con Gemini si el servicio de IA responde exitosamente', async () => {
    vi.spyOn(dssRepository, 'obtenerDatosExplicacion').mockResolvedValue(datosMock);
    vi.spyOn(explicadorIa, 'enriquecerExplicacionConIA').mockResolvedValue(
      'Se recomienda reabastecer 60 unidades de Pintura Látex Blanca porque el stock actual está por debajo de su punto de reorden.'
    );

    const originalKey = env.GEMINI_API_KEY;
    try {
      (env as any).GEMINI_API_KEY = 'test-key-valid';

      const res = await dssService.explicarAlerta(empresaId, productoId);

      expect(res.productoId).toBe(productoId);
      expect(res.sku).toBe('SKU-001');
      expect(res.fuente).toBe('gemini');
      expect(res.explicacion).toContain('Se recomienda reabastecer 60 unidades');
    } finally {
      (env as any).GEMINI_API_KEY = originalKey;
    }
  });

  it('hace fallback automático y transparente a la plantilla determinística si Gemini falla', async () => {
    vi.spyOn(dssRepository, 'obtenerDatosExplicacion').mockResolvedValue(datosMock);
    vi.spyOn(explicadorIa, 'enriquecerExplicacionConIA').mockRejectedValue(
      new Error('API quota exceeded / network timeout')
    );

    const originalKey = env.GEMINI_API_KEY;
    try {
      (env as any).GEMINI_API_KEY = 'test-key-valid';

      const res = await dssService.explicarAlerta(empresaId, productoId);

      expect(res.productoId).toBe(productoId);
      expect(res.fuente).toBe('plantilla');
      // Debe contener la plantilla determinística generada por engine/explicador
      expect(res.explicacion).toContain('Pintura Látex Blanca 18L');
      expect(res.explicacion).toContain('stock actual de 10 unidades');
      expect(res.explicacion).toContain('por debajo de su punto de reorden de 25 unidades');
    } finally {
      (env as any).GEMINI_API_KEY = originalKey;
    }
  });

  it('utiliza la plantilla determinística directamente si no hay GEMINI_API_KEY configurada', async () => {
    vi.spyOn(dssRepository, 'obtenerDatosExplicacion').mockResolvedValue(datosMock);
    const iaSpy = vi.spyOn(explicadorIa, 'enriquecerExplicacionConIA');

    const originalKey = env.GEMINI_API_KEY;
    try {
      (env as any).GEMINI_API_KEY = undefined;

      const res = await dssService.explicarAlerta(empresaId, productoId);

      expect(iaSpy).not.toHaveBeenCalled();
      expect(res.fuente).toBe('plantilla');
      expect(res.explicacion).toContain('stock actual de 10 unidades');
    } finally {
      (env as any).GEMINI_API_KEY = originalKey;
    }
  });
});
