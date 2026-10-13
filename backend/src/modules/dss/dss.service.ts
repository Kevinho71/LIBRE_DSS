import crypto from 'crypto';
import { dssRepository, FilaAsignacionSistema } from './dss.repository';
import { clasificarAbc, round2, CategoriaAbc } from '../../engine/abcService';
import { calcularEoq, TOPE_CAPITAL_PEDIDO_DEFAULT } from '../../engine/eoqService';
import { calcularRop } from '../../engine/ropService';
import { calcularPosicionInventario, evaluarReorden } from '../../engine/inventoryPosition';
import { asignarPolitica, calcularSistemaP } from '../../engine/periodicService';
import { evaluarFaseArranque, evaluarAlertaMinMax } from '../../engine/coldStartService';
import { consolidarPedidoProveedor } from '../../engine/consolidacion';
import { generarExplicacionBase } from '../../engine/explicador';
import { enriquecerExplicacionConIA } from './dss.explicador';
import { NotFoundError } from '../../shared/errors/AppError';
import { env } from '../../shared/utils/env';
import {
  ejecutarRetrospectiva,
  ParametrosSerieRetrospectiva,
  ResultadoRetrospectiva,
} from '../../engine/retrospective';
import { RetrospectivaInput } from './dss.schema';
import { logger } from '../../shared/utils/logger';
import {
  ResumenAbc,
  ReportePareto,
  ResultadoRecalculo,
  ResultadoRecalculoEoqRop,
  PanelAlertas,
  AlertaReabastecimiento,
  CriticidadAlertas,
  ListadoSistemas,
  ResultadoAsignacionSistemas,
  AlertaMinMax,
  PanelAlertasMinMax,
  SugerenciaProveedor,
  ExplicacionAlerta,
} from './dss.types';

const DIAS_ANIO = 365;

const PESO_CRITICIDAD: Record<CategoriaAbc, number> = { A: 0, B: 1, C: 2 };

function toAlerta(fila: {
  productoId: string;
  categoriaAbc: CategoriaAbc | null;
  ropCalculado: number | null;
  eoqCalculado: number | null;
  stockSeguridadCalculado: number | null;
  stockActual: number;
  enTransito: number;
  sku: string | null;
  nombre: string;
}): AlertaReabastecimiento | null {
  if (fila.ropCalculado == null || fila.categoriaAbc == null) return null;

  const posicionInventario = calcularPosicionInventario({
    stockActual: fila.stockActual,
    enTransito: fila.enTransito,
  });

  if (!evaluarReorden(posicionInventario, fila.ropCalculado)) return null;

  return {
    productoId: fila.productoId,
    sku: fila.sku,
    nombre: fila.nombre,
    categoriaAbc: fila.categoriaAbc,
    stockActual: round2(fila.stockActual),
    enTransito: round2(fila.enTransito),
    posicionInventario: round2(posicionInventario),
    ropCalculado: round2(fila.ropCalculado),
    stockSeguridad: round2(fila.stockSeguridadCalculado ?? 0),
    eoqSugerido: fila.eoqCalculado != null ? Number(fila.eoqCalculado.toFixed(2)) : 0,
    deficit: round2(fila.ropCalculado - posicionInventario),
  };
}

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
        diasHistorial: d.diasHistorial,
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
          diasHistorial: src.diasHistorial,
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

  async recalcularEoqRop(empresaId: string, jobId: string = crypto.randomUUID()): Promise<ResultadoRecalculoEoqRop> {
    const filas = await dssRepository.obtenerParametrosLogisticos(empresaId);

    const calculadas = filas
      .filter((f) => f.categoriaAbc !== null)
      .map((f) => {
        const demandaAnual = f.demandaAnual ?? 0;
        const costoPedido = f.costoPedidoProveedor ?? f.costoPedido;

        const eoq = calcularEoq({
          demandaAnual,
          costoPedido,
          costoUnitario: f.costoUnitario,
          tasaMantenimiento: f.tasaMantenimientoAnual,
          loteMinimo: f.loteMinimo,
          topeCapitalPedido: TOPE_CAPITAL_PEDIDO_DEFAULT,
        });

        // Solo se calcula ROP/SS cuando existe demanda diaria positiva; sin demanda no hay
        // recomendación cuantitativa y se evita emitir alertas espurias con ROP = 0.
        if (f.demandaPromedioDiaria != null && f.demandaPromedioDiaria > 0) {
          const rop = calcularRop({
            demandaPromedioDiaria: f.demandaPromedioDiaria,
            leadTimeDias: f.leadTimeDias,
            categoriaAbc: f.categoriaAbc!,
          });
          return { productoId: f.productoId, eoq: eoq.eoqRecomendado, rop: rop.rop, ss: rop.ss };
        }

        return { productoId: f.productoId, eoq: eoq.eoqRecomendado, rop: null, ss: null };
      });

    await dssRepository.actualizarEoqRop(empresaId, jobId, calculadas);

    const conParametros = calculadas.filter((c) => c.rop != null).length;

    logger.info('Cálculo de EOQ/ROP/SS completado', {
      empresaId,
      jobId,
      productosProcesados: calculadas.length,
      productosConParametrosCuantitativos: conParametros,
    });

    return {
      jobId,
      productosProcesados: calculadas.length,
      productosConParametrosCuantitativos: conParametros,
      fechaCalculo: new Date().toISOString(),
    };
  },

  async obtenerAlertas(empresaId: string): Promise<PanelAlertas> {
    const filas = await dssRepository.obtenerPosiciones(empresaId);
    const alertas = filas
      .map(toAlerta)
      .filter((a): a is AlertaReabastecimiento => a !== null)
      .sort(
        (a, b) =>
          PESO_CRITICIDAD[a.categoriaAbc] - PESO_CRITICIDAD[b.categoriaAbc] ||
          b.deficit - a.deficit
      );

    const criticidad = new Map<CategoriaAbc, number>();
    for (const a of alertas) {
      criticidad.set(a.categoriaAbc, (criticidad.get(a.categoriaAbc) ?? 0) + 1);
    }

    const porCriticidad: CriticidadAlertas[] = (['A', 'B', 'C'] as CategoriaAbc[])
      .filter((c) => criticidad.has(c))
      .map((c) => ({ categoria: c, cantidad: criticidad.get(c)! }));

    return { totalAlertas: alertas.length, porCriticidad, alertas };
  },

  async evaluarPosicionInventario(empresaId: string, productoId: string): Promise<AlertaReabastecimiento | null> {
    const filas = await dssRepository.obtenerPosiciones(empresaId, productoId);
    const fila = filas[0];
    if (!fila) return null;

    return toAlerta(fila);
  },

  async recalcularSistemas(empresaId: string, jobId: string = crypto.randomUUID()): Promise<ResultadoAsignacionSistemas> {
    const filas = await dssRepository.obtenerFilasSistema(empresaId);

    const asignaciones: FilaAsignacionSistema[] = [];
    let productosQ = 0;
    let productosP = 0;
    let enFase3 = 0;

    for (const f of filas) {
      if (f.categoriaAbc == null) continue;

      const politica = asignarPolitica(f.categoriaAbc);
      const { fase } = evaluarFaseArranque({ diasHistorial: f.diasHistorial, diasConVenta: f.diasConVenta });

      if (politica === 'P') {
        productosP += 1;
        const sistemaP = calcularSistemaP({
          demandaPromedioDiaria: f.demandaPromedioDiaria ?? 0,
          leadTimeDias: f.leadTimeDias,
          eoq: f.eoqCalculado ?? 0,
        });

        asignaciones.push({
          productoId: f.productoId,
          politica,
          faseArranque: fase,
          intervaloRevisionDias: sistemaP.R,
          nivelObjetivoT: sistemaP.T,
          ropCalculado: null, // el Sistema P no usa ROP; opera por revisión periódica
          stockSeguridadCalculado: sistemaP.ssP,
        });
      } else {
        productosQ += 1;
        asignaciones.push({
          productoId: f.productoId,
          politica,
          faseArranque: fase,
          intervaloRevisionDias: null,
          nivelObjetivoT: null,
          ropCalculado: f.ropCalculado,
          stockSeguridadCalculado: f.stockSeguridadCalculado,
        });
      }

      if (fase === 3) enFase3 += 1;
    }

    await dssRepository.asignarSistemas(empresaId, jobId, asignaciones);

    logger.info('Asignación de sistemas P/Q y arranque en frío completada', {
      empresaId,
      jobId,
      totalProductos: asignaciones.length,
      productosQ,
      productosP,
      enFase3,
    });

    return {
      jobId,
      totalProductos: asignaciones.length,
      productosQ,
      productosP,
      enFase3,
      fechaCalculo: new Date().toISOString(),
    };
  },

  async obtenerSistemas(empresaId: string): Promise<ListadoSistemas> {
    const filas = await dssRepository.obtenerFilasSistema(empresaId);

    const items = filas
      .filter((f) => f.categoriaAbc !== null)
      .map((f) => {
        const { cuantitativoHabilitado } = evaluarFaseArranque({
          diasHistorial: f.diasHistorial,
          diasConVenta: f.diasConVenta,
        });

        return {
          productoId: f.productoId,
          sku: f.sku,
          nombre: f.nombre,
          categoriaAbc: f.categoriaAbc as CategoriaAbc,
          politica: f.politica,
          faseArranque: f.faseArranque,
          cuantitativoHabilitado,
          diasHistorial: f.diasHistorial,
          diasConVenta: f.diasConVenta,
          eoqCalculado: f.eoqCalculado,
          ropCalculado: f.ropCalculado,
          stockSeguridadCalculado: f.stockSeguridadCalculado,
          intervaloRevisionDias: f.intervaloRevisionDias,
          nivelObjetivoT: f.nivelObjetivoT,
          stockMinimoManual: f.stockMinimoManual,
          stockMaximoManual: f.stockMaximoManual,
        };
      });

    return { totalProductos: items.length, items };
  },

  async obtenerAlertasMinMax(empresaId: string): Promise<PanelAlertasMinMax> {
    const filas = await dssRepository.obtenerFilasSistema(empresaId);

    const alertas: AlertaMinMax[] = [];
    for (const f of filas) {
      const { fase, cuantitativoHabilitado } = evaluarFaseArranque({
        diasHistorial: f.diasHistorial,
        diasConVenta: f.diasConVenta,
      });

      // La política Min/Max solo aplica mientras el motor cuantitativo no está habilitado.
      if (cuantitativoHabilitado) continue;

      const tipo = evaluarAlertaMinMax(f.stockActual, {
        stockMinimo: f.stockMinimoManual,
        stockMaximo: f.stockMaximoManual,
      });
      if (tipo == null) continue;

      let cantidadSugerida = 0;
      if (tipo === 'bajo_minimo' && f.stockMaximoManual != null) {
        cantidadSugerida = round2(Math.max(0, f.stockMaximoManual - f.stockActual));
      } else if (tipo === 'sobre_maximo' && f.stockMaximoManual != null) {
        cantidadSugerida = round2(Math.max(0, f.stockActual - f.stockMaximoManual));
      }

      alertas.push({
        productoId: f.productoId,
        sku: f.sku,
        nombre: f.nombre,
        faseArranque: fase,
        tipo,
        stockActual: round2(f.stockActual),
        stockMinimoManual: f.stockMinimoManual,
        stockMaximoManual: f.stockMaximoManual,
        cantidadSugerida,
      });
    }

    return { totalAlertas: alertas.length, alertas };
  },

  async simularRetrospectiva(empresaId: string, input: RetrospectivaInput): Promise<ResultadoRetrospectiva> {
    const dias = input.serieDemanda.length;
    const demandaTotal = input.serieDemanda.reduce((acc, d) => acc + d, 0);
    const demandaPromedioDiaria = dias > 0 ? demandaTotal / dias : 0;
    const demandaAnual = demandaPromedioDiaria * DIAS_ANIO;

    const eoq = calcularEoq({
      demandaAnual,
      costoPedido: input.costoPedido,
      costoUnitario: input.costoUnitario,
      tasaMantenimiento: input.tasaMantenimientoAnual,
      topeCapitalPedido: TOPE_CAPITAL_PEDIDO_DEFAULT,
    });

    const rop = calcularRop({
      demandaPromedioDiaria,
      leadTimeDias: input.leadTimeDias,
      categoriaAbc: input.categoriaAbc,
    });

    const serie: ParametrosSerieRetrospectiva = {
      demanda: input.serieDemanda,
      inventarioInicial: input.inventarioInicial,
      costoUnitario: input.costoUnitario,
      precioVenta: input.precioVenta,
      costoPedido: input.costoPedido,
      tasaMantenimientoAnual: input.tasaMantenimientoAnual,
      leadTimeDias: input.leadTimeDias,
    };

    // Política empírica: reorden sin stock de seguridad (punto de pedido = d * L).
    const puntoPedidoEmpirico = demandaPromedioDiaria * input.leadTimeDias;

    const resultado = ejecutarRetrospectiva(
      serie,
      { puntoPedido: rop.rop, cantidadPedido: eoq.eoqRecomendado },
      { puntoPedido: puntoPedidoEmpirico, cantidadPedido: eoq.eoqRecomendado }
    );

    logger.info('Simulador retrospectivo contrafactual ejecutado', {
      empresaId,
      dias,
      demandaTotal,
      ahorro: resultado.ahorro,
    });

    return resultado;
  },

  async obtenerSugerenciasProveedor(empresaId: string, proveedorId: string): Promise<SugerenciaProveedor> {
    const proveedor = await dssRepository.obtenerProveedor(empresaId, proveedorId);
    if (!proveedor) {
      throw new NotFoundError('PROVEEDOR_NO_ENCONTRADO', 'El proveedor solicitado no existe en su empresa');
    }

    const posiciones = await dssRepository.obtenerPosicionesPorProveedor(empresaId, proveedorId);
    const costoPedido = await dssRepository.obtenerCostoPedidoProveedor(empresaId, proveedorId);

    const resultado = consolidarPedidoProveedor(posiciones, costoPedido);

    logger.info('Sugerencia de orden consolidada por proveedor calculada', {
      empresaId,
      proveedorId,
      totalLineas: resultado.totalLineas,
      ahorroEstimado: resultado.ahorroEstimado,
    });

    return {
      proveedorId: proveedor.id,
      nombreProveedor: proveedor.nombre,
      costoPedido,
      totalLineas: resultado.totalLineas,
      ahorroEstimado: resultado.ahorroEstimado,
      lineas: resultado.lineas,
    };
  },

  async explicarAlerta(empresaId: string, productoId: string): Promise<ExplicacionAlerta> {
    const datos = await dssRepository.obtenerDatosExplicacion(empresaId, productoId);
    if (!datos) {
      throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', 'El producto solicitado no fue encontrado');
    }

    const contexto = {
      nombre: datos.nombre,
      sku: datos.sku,
      categoriaAbc: datos.categoriaAbc,
      stockActual: datos.stockActual,
      ropCalculado: datos.ropCalculado,
      eoqCalculado: datos.eoqCalculado,
      demandaPromedioDiaria: datos.demandaPromedioDiaria,
    };

    const base = generarExplicacionBase(contexto);

    // Enriquecimiento con IA (best-effort). Si falla o no hay API key, se usa la plantilla.
    try {
      if (env.GEMINI_API_KEY) {
        const enriquecida = await enriquecerExplicacionConIA(contexto);
        logger.info('Explicación de alerta enriquecida con Gemini', { empresaId, productoId });
        return {
          productoId,
          sku: datos.sku,
          nombre: datos.nombre,
          explicacion: enriquecida,
          fuente: 'gemini',
        };
      }
    } catch (error) {
      logger.warn('Fallo en el enriquecimiento IA de la explicación; se usa la plantilla determinística', {
        empresaId,
        productoId,
        error,
      });
    }

    return {
      productoId,
      sku: datos.sku,
      nombre: datos.nombre,
      explicacion: base,
      fuente: 'plantilla',
    };
  },
};
