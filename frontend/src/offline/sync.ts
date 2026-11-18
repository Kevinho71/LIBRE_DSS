import { ApiError } from '@/api/client';
import { transaccionesApi } from '@/api/transacciones.api';
import {
  listarVentasPendientes,
  eliminarVentaPendiente,
  marcarIntentoFallido,
  marcarVentaFallida,
  contarVentasPendientes,
} from './salesQueue';

export interface ResultadoSync {
  sincronizadas: number;
  fallidas: number;
  pendientes: number;
  detenidaPorSesion: boolean;
}

function describirError(error: unknown): string {
  if (error instanceof ApiError) return `${error.errorCode}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return 'Error desconocido';
}

/**
 * Vacía la cola de ventas offline llamando al endpoint batch con la misma
 * `llave_idempotencia` que se generó al encolar, de modo que un reintento tras
 * recuperar la red nunca duplica la venta (CB-03 / HU-44).
 */
export async function sincronizarVentasPendientes(): Promise<ResultadoSync> {
  const pendientes = (await listarVentasPendientes()).filter((v) => !v.fallido);

  let sincronizadas = 0;
  let fallidas = 0;
  let detenidaPorSesion = false;

  for (const venta of pendientes) {
    try {
      await transaccionesApi.registrarVentaBatch({
        notaId: venta.notaId,
        llaveIdempotencia: venta.llaveIdempotencia,
        items: venta.items,
        estadoPago: venta.estadoPago,
        fechaEvento: venta.fechaEvento,
        motivo: venta.motivo,
      });
      await eliminarVentaPendiente(venta.id);
      sincronizadas += 1;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        // Sesión expirada: se detiene la sincronización sin marcar la venta como fallida.
        detenidaPorSesion = true;
        break;
      }

      if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
        // Error de validación / conflicto determinista: no reintentar en bucle.
        await marcarVentaFallida(venta.id, describirError(error));
        fallidas += 1;
        continue;
      }

      // Fallo transitorio (red caída o 5xx): se reintentará luego.
      await marcarIntentoFallido(venta.id, describirError(error));
      break;
    }
  }

  return {
    sincronizadas,
    fallidas,
    pendientes: await contarVentasPendientes(),
    detenidaPorSesion,
  };
}

export function esErrorDeRed(error: unknown): boolean {
  if (error instanceof ApiError) return false;
  return error instanceof TypeError || (error instanceof Error && /fetch|network/i.test(error.message));
}
