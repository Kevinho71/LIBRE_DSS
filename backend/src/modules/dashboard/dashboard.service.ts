import { dashboardRepository, PosicionAlerta } from './dashboard.repository';
import { calcularPosicionInventario, evaluarReorden } from '../../engine/inventoryPosition';
import { round2 } from '../../engine/abcService';
import { DashboardKpis } from './dashboard.types';

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
};
