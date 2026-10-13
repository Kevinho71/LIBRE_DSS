import { dashboardRepository, PosicionAlerta } from './dashboard.repository';
import { calcularPosicionInventario, evaluarReorden } from '../../engine/inventoryPosition';
import { round2 } from '../../engine/abcService';
import { DashboardKpis, ReporteCostos, ResumenSkuReporteCostos } from './dashboard.types';
import { ReporteCostosQuery } from './dashboard.schema';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { logger } from '../../shared/utils/logger';
import { ejecutarRetrospectiva, ParametrosSerieRetrospectiva } from '../../engine/retrospective';

export const LIMITE_SKUS_GRATUITO = 15;

function esAlerta(fila: PosicionAlerta): boolean {
  if (fila.ropCalculado == null) return false;
  const posicionInventario = calcularPosicionInventario({
    stockActual: fila.stockActual,
    enTransito: fila.enTransito,
  });
  return evaluarReorden(posicionInventario, fila.ropCalculado);
}

function inicioMesActual(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-01`;
}

export const dashboardService = {
  async obtenerKpis(empresaId: string): Promise<DashboardKpis> {
    const plan = await dashboardRepository.obtenerPlan(empresaId);
    const resumen = await dashboardRepository.obtenerResumenProductos(empresaId);
    const mermas = await dashboardRepository.obtenerMermasMes(empresaId, inicioMesActual());
    const posiciones = await dashboardRepository.obtenerPosicionesAlerta(empresaId);

    const enAlerta = posiciones.filter(esAlerta);

    // Ahorro estimado proyectado: margen unitario protegido por el stock de seguridad
    // de cada SKU en alerta, frente a una política empírica sin stock de seguridad.
    const ahorroEstimado = enAlerta.reduce((acc, f) => {
      const margen = Math.max(0, f.precioVenta - f.costoUnitario);
      const ss = Math.max(0, f.stockSeguridadCalculado ?? 0);
      return acc + margen * ss;
    }, 0);

    return {
      fecha: new Date().toISOString(),
      plan,
      limiteSku: plan === 'gratuito' ? LIMITE_SKUS_GRATUITO : null,
      productosActivos: resumen.productosActivos,
      valorInventario: round2(resumen.valorInventario),
      skusEnAlerta: enAlerta.length,
      mermasMes: {
        cantidad: round2(mermas.cantidad),
        valorEstimado: round2(mermas.valorEstimado),
      },
      ahorroEstimadoProyectado: round2(ahorroEstimado),
    };
  },

  async generarReporteCostos(
    empresaId: string,
    query?: ReporteCostosQuery
  ): Promise<ReporteCostos> {
    const dias = query?.dias ?? 30;
    const productoId = query?.productoId;

    if (productoId) {
      const existe = await dashboardRepository.existeProducto(empresaId, productoId);
      if (!existe) {
        throw new NotFoundError('PRODUCTO_NO_ENCONTRADO', 'El producto solicitado no fue encontrado');
      }
    }

    const candidatos = await dashboardRepository.obtenerDatosReporteCostos(empresaId, productoId);

    if (candidatos.length === 0) {
      if (productoId) {
        throw new ValidationError(
          'PRODUCTO_SIN_CALCULOS',
          'El producto no cuenta con parámetros vigentes de inventario para generar el comparativo'
        );
      }

      return {
        fechaGeneracion: new Date().toISOString(),
        diasAnalizados: dias,
        totalProductos: 0,
        politicaEmpirica: {
          nombre: 'empirica',
          costoOrdenar: 0,
          costoMantener: 0,
          costoVentaPerdida: 0,
          costoTotal: 0,
          nivelServicio: 100,
          numeroPedidos: 0,
        },
        politicaDss: {
          nombre: 'dss',
          costoOrdenar: 0,
          costoMantener: 0,
          costoVentaPerdida: 0,
          costoTotal: 0,
          nivelServicio: 100,
          numeroPedidos: 0,
        },
        ahorroTotal: 0,
        ahorroPorcentual: 0,
        conclusion: 'No se encontraron productos con parámetros vigentes para analizar.',
        productos: [],
      };
    }

    // Construcción de la ventana de días
    const fechas: string[] = [];
    const hoy = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy.getTime() - i * 86400000);
      fechas.push(d.toISOString().slice(0, 10));
    }
    const fechaDesde = fechas[0];

    const ventas = await dashboardRepository.obtenerVentasPorDia(
      empresaId,
      candidatos.map((c) => c.id),
      fechaDesde
    );

    const ventasPorProducto = new Map<string, Map<string, number>>();
    for (const v of ventas) {
      if (!ventasPorProducto.has(v.productoId)) {
        ventasPorProducto.set(v.productoId, new Map());
      }
      ventasPorProducto.get(v.productoId)!.set(v.fechaEvento, v.cantidadNeta);
    }

    const resultadosSkus: ResumenSkuReporteCostos[] = [];

    for (const p of candidatos) {
      const mapaFechas = ventasPorProducto.get(p.id);
      let serieDemanda: number[] = fechas.map((f) => mapaFechas?.get(f) ?? 0);
      const sumaVentas = serieDemanda.reduce((acc, v) => acc + v, 0);

      if (sumaVentas === 0 && p.demandaPromedioDiaria != null && p.demandaPromedioDiaria > 0) {
        serieDemanda = Array(dias).fill(round2(p.demandaPromedioDiaria));
      }

      const demandaTotal = serieDemanda.reduce((acc, v) => acc + v, 0);
      const demandaPromedioDiaria = dias > 0 ? demandaTotal / dias : (p.demandaPromedioDiaria ?? 0);

      const serie: ParametrosSerieRetrospectiva = {
        demanda: serieDemanda,
        inventarioInicial: p.stockActual > 0 ? p.stockActual : (p.eoqCalculado ?? 50),
        costoUnitario: p.costoUnitario,
        precioVenta: p.precioVenta,
        costoPedido: p.costoPedido,
        tasaMantenimientoAnual: p.tasaMantenimientoAnual,
        leadTimeDias: p.leadTimeDias,
      };

      const ropDss =
        p.ropCalculado != null && p.ropCalculado > 0
          ? p.ropCalculado
          : Math.round(demandaPromedioDiaria * p.leadTimeDias + (p.stockSeguridadCalculado ?? 0));
      const eoqDss =
        p.eoqCalculado != null && p.eoqCalculado > 0
          ? p.eoqCalculado
          : Math.max(1, Math.round(demandaPromedioDiaria * 15));

      const puntoPedidoEmpirico = Math.max(0, Math.round(demandaPromedioDiaria * p.leadTimeDias));
      const cantidadPedidoEmpirica = eoqDss;

      const resultado = ejecutarRetrospectiva(
        serie,
        { puntoPedido: ropDss, cantidadPedido: eoqDss },
        { puntoPedido: puntoPedidoEmpirico, cantidadPedido: cantidadPedidoEmpirica }
      );

      resultadosSkus.push({
        productoId: p.id,
        sku: p.sku,
        nombre: p.nombre,
        dias,
        demandaTotal: resultado.demandaTotal,
        politicaEmpirica: {
          nombre: 'empirica',
          costoOrdenar: resultado.politicaEmpirica.costoOrdenar,
          costoMantener: resultado.politicaEmpirica.costoMantener,
          costoVentaPerdida: resultado.politicaEmpirica.costoVentaPerdida,
          costoTotal: resultado.politicaEmpirica.costoTotal,
          nivelServicio: resultado.politicaEmpirica.nivelServicio,
          numeroPedidos: resultado.politicaEmpirica.numeroPedidos,
        },
        politicaDss: {
          nombre: 'dss',
          costoOrdenar: resultado.politicaDss.costoOrdenar,
          costoMantener: resultado.politicaDss.costoMantener,
          costoVentaPerdida: resultado.politicaDss.costoVentaPerdida,
          costoTotal: resultado.politicaDss.costoTotal,
          nivelServicio: resultado.politicaDss.nivelServicio,
          numeroPedidos: resultado.politicaDss.numeroPedidos,
        },
        ahorro: resultado.ahorro,
        ahorroPorcentual: resultado.ahorroPorcentual,
      });
    }

    // Totales agregados
    const totalOrdenarEmp = round2(resultadosSkus.reduce((a, r) => a + r.politicaEmpirica.costoOrdenar, 0));
    const totalMantenerEmp = round2(resultadosSkus.reduce((a, r) => a + r.politicaEmpirica.costoMantener, 0));
    const totalPerdidaEmp = round2(resultadosSkus.reduce((a, r) => a + r.politicaEmpirica.costoVentaPerdida, 0));
    const totalCostEmp = round2(resultadosSkus.reduce((a, r) => a + r.politicaEmpirica.costoTotal, 0));
    const totalPedidosEmp = resultadosSkus.reduce((a, r) => a + r.politicaEmpirica.numeroPedidos, 0);

    const totalOrdenarDss = round2(resultadosSkus.reduce((a, r) => a + r.politicaDss.costoOrdenar, 0));
    const totalMantenerDss = round2(resultadosSkus.reduce((a, r) => a + r.politicaDss.costoMantener, 0));
    const totalPerdidaDss = round2(resultadosSkus.reduce((a, r) => a + r.politicaDss.costoVentaPerdida, 0));
    const totalCostDss = round2(resultadosSkus.reduce((a, r) => a + r.politicaDss.costoTotal, 0));
    const totalPedidosDss = resultadosSkus.reduce((a, r) => a + r.politicaDss.numeroPedidos, 0);

    const promedioServicioEmp =
      resultadosSkus.length > 0
        ? round2(resultadosSkus.reduce((a, r) => a + r.politicaEmpirica.nivelServicio, 0) / resultadosSkus.length)
        : 100;
    const promedioServicioDss =
      resultadosSkus.length > 0
        ? round2(resultadosSkus.reduce((a, r) => a + r.politicaDss.nivelServicio, 0) / resultadosSkus.length)
        : 100;

    const ahorroTotal = round2(totalCostEmp - totalCostDss);
    const ahorroPorcentual = totalCostEmp > 0 ? round2((ahorroTotal / totalCostEmp) * 100) : 0;

    const conclusion =
      ahorroTotal >= 0
        ? 'La política DSS reduce los costos totales frente a la política empírica tradicional.'
        : 'La política empírica obtuvo menor costo para los datos evaluados.';

    logger.info('Reporte comparativo de costos generado', {
      empresaId,
      dias,
      totalProductos: resultadosSkus.length,
      ahorroTotal,
    });

    return {
      fechaGeneracion: new Date().toISOString(),
      diasAnalizados: dias,
      totalProductos: resultadosSkus.length,
      politicaEmpirica: {
        nombre: 'empirica',
        costoOrdenar: totalOrdenarEmp,
        costoMantener: totalMantenerEmp,
        costoVentaPerdida: totalPerdidaEmp,
        costoTotal: totalCostEmp,
        nivelServicio: promedioServicioEmp,
        numeroPedidos: totalPedidosEmp,
      },
      politicaDss: {
        nombre: 'dss',
        costoOrdenar: totalOrdenarDss,
        costoMantener: totalMantenerDss,
        costoVentaPerdida: totalPerdidaDss,
        costoTotal: totalCostDss,
        nivelServicio: promedioServicioDss,
        numeroPedidos: totalPedidosDss,
      },
      ahorroTotal,
      ahorroPorcentual,
      conclusion,
      productos: resultadosSkus,
    };
  },
};
