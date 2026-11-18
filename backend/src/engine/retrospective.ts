/**
 * Motor Algorítmico DSS — Simulador Retrospectivo Contrafactual (Épica LIB-7 / HU-29)
 * Funciones puras y determinísticas. Sin dependencia de base de datos ni de framework.
 *
 * Reconstruye día a día la trayectoria de inventario de un SKU bajo dos políticas:
 *  - Política A (empírica): pedidos "a ojo" sin stock de seguridad (punto de pedido = d * L).
 *  - Política B (DSS): reorden por ROP (d * L + SS) con lote EOQ.
 *
 * Balance económico por política:
 *  - Costo de ordenar   = Nº de pedidos * costoPedido.
 *  - Costo de mantener  = Σ (inventario al cierre del día) * (i * C) / 365.
 *  - Costo de venta perdida = unidades no atendidas * (precioVenta - costoUnitario).
 */

export interface ParametrosSerieRetrospectiva {
  demanda: number[]; // d_t (unidades/día)
  inventarioInicial: number;
  costoUnitario: number; // C
  precioVenta: number; // P_v (para el margen de venta perdida)
  costoPedido: number; // S
  tasaMantenimientoAnual: number; // i
  leadTimeDias: number; // L
}

export interface PoliticaReorden {
  nombre: string;
  puntoPedido: number; // umbral de reorden
  cantidadPedido: number; // lote de reabastecimiento
}

export interface ResultadoSimulacion {
  nombre: string;
  dias: number;
  demandaTotal: number;
  unidadesVendidas: number;
  unidadesPerdidas: number;
  nivelServicio: number; // % de la demanda atendida
  numeroPedidos: number;
  costoOrdenar: number;
  costoMantener: number;
  costoVentaPerdida: number;
  costoTotal: number;
}

export interface ResultadoRetrospectiva {
  dias: number;
  demandaTotal: number;
  politicaEmpirica: ResultadoSimulacion;
  politicaDss: ResultadoSimulacion;
  ahorro: number; // costoTotal empirica - costoTotal DSS (> 0 favorece a DSS)
  ahorroPorcentual: number;
  conclusion: string;
}

export function simularPolitica(
  serie: ParametrosSerieRetrospectiva,
  politica: PoliticaReorden
): ResultadoSimulacion {
  const T = serie.demanda.length;
  const L = Math.max(1, Math.round(serie.leadTimeDias));
  const margen = Math.max(0, serie.precioVenta - serie.costoUnitario);
  const costoMantenerAnual = Math.max(0, serie.tasaMantenimientoAnual) * serie.costoUnitario;
  const costoMantenerDiario = costoMantenerAnual / 365;

  let stock = Math.max(0, serie.inventarioInicial);
  let enTransito = 0;
  const arribos: { dia: number; cantidad: number }[] = [];

  let unidadesVendidas = 0;
  let unidadesPerdidas = 0;
  let numeroPedidos = 0;
  let costoOrdenar = 0;
  let costoMantener = 0;
  let costoVentaPerdida = 0;

  for (let t = 0; t < T; t++) {
    // 1. Recibir pedidos en tránsito cuyo día de arribo es hoy.
    for (const arribo of arribos) {
      if (arribo.dia === t) {
        stock += arribo.cantidad;
        enTransito -= arribo.cantidad;
      }
    }

    // 2. Atender la demanda del día hasta agotar el stock disponible.
    const demanda = Math.max(0, serie.demanda[t] ?? 0);
    const vendido = Math.min(stock, demanda);
    const perdido = demanda - vendido;
    stock -= vendido;
    unidadesVendidas += vendido;
    unidadesPerdidas += perdido;
    costoVentaPerdida += perdido * margen;

    // 3. Evaluar condición de reorden al cierre del día (revisión continua).
    const posicion = stock + enTransito;
    if (posicion <= politica.puntoPedido && politica.cantidadPedido > 0) {
      numeroPedidos += 1;
      costoOrdenar += serie.costoPedido;
      enTransito += politica.cantidadPedido;
      arribos.push({ dia: t + L, cantidad: politica.cantidadPedido });
    }

    // 4. Costo de mantener sobre el inventario al cierre del día.
    costoMantener += stock * costoMantenerDiario;
  }

  const demandaTotal = serie.demanda.reduce((acc, d) => acc + Math.max(0, d), 0);
  const nivelServicio = demandaTotal > 0 ? (unidadesVendidas / demandaTotal) * 100 : 100;
  const costoTotal = costoOrdenar + costoMantener + costoVentaPerdida;

  return {
    nombre: politica.nombre,
    dias: T,
    demandaTotal,
    unidadesVendidas,
    unidadesPerdidas,
    nivelServicio: Number(nivelServicio.toFixed(2)),
    numeroPedidos,
    costoOrdenar: Number(costoOrdenar.toFixed(2)),
    costoMantener: Number(costoMantener.toFixed(2)),
    costoVentaPerdida: Number(costoVentaPerdida.toFixed(2)),
    costoTotal: Number(costoTotal.toFixed(2)),
  };
}

export function ejecutarRetrospectiva(
  serie: ParametrosSerieRetrospectiva,
  dss: Omit<PoliticaReorden, 'nombre'>,
  empirica: Omit<PoliticaReorden, 'nombre'>
): ResultadoRetrospectiva {
  const rEmpirica = simularPolitica(serie, { nombre: 'empirica', ...empirica });
  const rDss = simularPolitica(serie, { nombre: 'dss', ...dss });

  const ahorro = rEmpirica.costoTotal - rDss.costoTotal;
  const ahorroPorcentual = rEmpirica.costoTotal > 0 ? (ahorro / rEmpirica.costoTotal) * 100 : 0;

  return {
    dias: serie.demanda.length,
    demandaTotal: rDss.demandaTotal,
    politicaEmpirica: rEmpirica,
    politicaDss: rDss,
    ahorro: Number(ahorro.toFixed(2)),
    ahorroPorcentual: Number(ahorroPorcentual.toFixed(2)),
    conclusion:
      ahorro > 0
        ? 'La política DSS reduce el costo total frente a la política empírica.'
        : 'La política empírica resultó menos costosa para esta serie.',
  };
}
