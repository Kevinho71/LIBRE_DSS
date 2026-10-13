import crypto from 'crypto';
import { dssRepository } from './dss.repository';
import { clasificarAbc, round2, CategoriaAbc } from '../../engine/abcService';
import { logger } from '../../shared/utils/logger';
import { ResumenAbc, ReportePareto, ResultadoRecalculo } from './dss.types';

const DIAS_ANIO = 365;

export const dssService = {
  async recalcularAbc(empresaId: string, jobId: string = crypto.randomUUID()): Promise<ResultadoRecalculo> {
    const ventana = await dssRepository.obtenerVentana(empresaId);
    const demanda = await dssRepository.obtenerDemanda(empresaId);

    const dias = ventana ?? 1;

    const items = demanda.map((d) => {
      const demandaPromedioDiaria = Math.max(0, d.demandaNeta) / dias;
      return {
        productoId: d.productoId,
        demandaAnual: demandaPromedioDiaria * DIAS_ANIO,
        costoUnitario: d.costoUnitario,
        demandaPromedioDiaria,
        diasConVenta: d.diasConVenta,
      };
    });

    const resultados = clasificarAbc(items);

    await dssRepository.invalidarVigentes(empresaId);

    if (resultados.length > 0) {
      const filas = resultados.map((r) => {
        const src = items.find((i) => i.productoId === r.productoId)!;
        return {
          productoId: r.productoId,
          categoria: r.categoria,
          demandaAnual: r.demandaAnual,
          demandaPromedioDiaria: round2(src.demandaPromedioDiaria),
          valorConsumoAnual: r.valorConsumoAnual,
          porcentajeValor: r.porcentajeValor,
          porcentajeAcumulado: r.porcentajeAcumulado,
          diasHistorial: dias,
          diasConVenta: src.diasConVenta,
        };
      });
      await dssRepository.insertarClasificacion(empresaId, jobId, filas);
    }

    const valorConsumoTotal = round2(resultados.reduce((acc, r) => acc + r.valorConsumoAnual, 0));

    logger.info('Clasificación ABC recalculada', {
      empresaId,
      jobId,
      totalProductos: resultados.length,
      valorConsumoTotal,
    });

    return {
      jobId,
      totalProductos: resultados.length,
      valorConsumoTotal,
      fechaCalculo: new Date().toISOString(),
    };
  },

  async obtenerResumen(empresaId: string): Promise<ResumenAbc> {
    const vigentes = await dssRepository.obtenerVigentes(empresaId);

    const clasesMap = new Map<CategoriaAbc, { cantidad: number; valor: number; pct: number }>();
    let valorConsumoTotal = 0;

    for (const fila of vigentes) {
      if (!fila.categoriaAbc) continue;
      const valor = fila.valorConsumoAnual ?? 0;
      const pct = fila.porcentajeValor ?? 0;
      valorConsumoTotal += valor;

      const actual = clasesMap.get(fila.categoriaAbc) ?? { cantidad: 0, valor: 0, pct: 0 };
      actual.cantidad += 1;
      actual.valor += valor;
      actual.pct += pct;
      clasesMap.set(fila.categoriaAbc, actual);
    }

    const orden: CategoriaAbc[] = ['A', 'B', 'C'];
    const clases = orden
      .filter((c) => clasesMap.has(c))
      .map((c) => {
        const v = clasesMap.get(c)!;
        return {
          categoria: c,
          cantidadProductos: v.cantidad,
          valorConsumo: round2(v.valor),
          porcentajeValor: round2(v.pct),
        };
      });

    return {
      jobId: vigentes[0]?.jobId ?? null,
      totalProductos: vigentes.length,
      valorConsumoTotal: round2(valorConsumoTotal),
      fechaCalculo: vigentes[0]?.fechaCalculo ? vigentes[0].fechaCalculo.toISOString() : null,
      clases,
    };
  },

  async obtenerPareto(empresaId: string): Promise<ReportePareto> {
    const vigentes = await dssRepository.obtenerVigentes(empresaId);

    const filas = vigentes
      .filter((f) => f.categoriaAbc !== null)
      .map((f) => ({
        productoId: f.productoId,
        sku: f.sku,
        nombre: f.nombre,
        categoria: f.categoriaAbc as CategoriaAbc,
        valorConsumoAnual: round2(f.valorConsumoAnual ?? 0),
        porcentajeValor: round2(f.porcentajeValor ?? 0),
        porcentajeAcumulado: round2(f.porcentajeAcumulado ?? 0),
      }));

    const valorConsumoTotal = round2(filas.reduce((acc, f) => acc + f.valorConsumoAnual, 0));

    return {
      jobId: vigentes[0]?.jobId ?? null,
      totalProductos: filas.length,
      valorConsumoTotal,
      fechaCalculo: vigentes[0]?.fechaCalculo ? vigentes[0].fechaCalculo.toISOString() : null,
      filas,
    };
  },
};
