import { ApiError } from '@/api/client';
import {
  transaccionesApi,
  type ItemVentaRequest,
  type ResultadoVentaBatch,
} from '@/api/transacciones.api';
import { generarUuid } from '@/lib/idempotency';
import { hoyISO } from '@/lib/format';
import { encolarVenta } from './salesQueue';
import { esErrorDeRed } from './sync';

export interface RegistrarVentaEntrada {
  notaId?: string;
  llaveIdempotencia?: string;
  items: ItemVentaRequest[];
  estadoPago?: 'contado' | 'credito_pendiente';
  fechaEvento?: string;
  motivo?: string;
}

export type ResultadoEnvioVenta =
  | { via: 'online'; notaId: string; resultado: ResultadoVentaBatch }
  | { via: 'cola'; notaId: string; pendienteId: string };

/**
 * Intenta registrar la nota de venta en el backend; si no hay red o el
 * servidor falla de forma transitoria, la encola en IndexedDB conservando la
 * llave de idempotencia para evitar duplicados al sincronizar (CB-03 / HU-44).
 */
export async function registrarVenta(payload: RegistrarVentaEntrada): Promise<ResultadoEnvioVenta> {
  const notaId = payload.notaId ?? generarUuid();
  const llaveIdempotencia = payload.llaveIdempotencia ?? generarUuid();
  const estadoPago = payload.estadoPago ?? 'contado';
  const fechaEvento = payload.fechaEvento ?? hoyISO();

  const encolar = async (): Promise<ResultadoEnvioVenta> => {
    const pendiente = await encolarVenta({
      id: generarUuid(),
      notaId,
      llaveIdempotencia,
      items: payload.items,
      estadoPago,
      fechaEvento,
      motivo: payload.motivo,
    });
    return { via: 'cola', notaId, pendienteId: pendiente.id };
  };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return encolar();
  }

  try {
    const resultado = await transaccionesApi.registrarVentaBatch({
      notaId,
      llaveIdempotencia,
      items: payload.items,
      estadoPago,
      fechaEvento,
      motivo: payload.motivo,
    });
    return { via: 'online', notaId, resultado };
  } catch (error) {
    const transitorio = esErrorDeRed(error) || (error instanceof ApiError && error.statusCode >= 500);
    if (transitorio) {
      return encolar();
    }
    throw error;
  }
}
