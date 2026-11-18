import { client } from './client';
import type {
  ConfirmarIngestaDto,
  ExtraerIngestaRequest,
  ResultadoConfirmacion,
  ResultadoExtraccion,
} from '@libredss/shared';

/**
 * Ingesta asistida por IA con validación humana (HU-37).
 * `extraer` nunca persiste transacciones: solo deja la ingesta en estado
 * `pendiente`. Las transacciones se crean exclusivamente al `confirmar`.
 */
export const ingestaApi = {
  extraer: (payload: ExtraerIngestaRequest, signal?: AbortSignal) =>
    client.post<ResultadoExtraccion>('/ingesta/extraer', payload, { signal }),

  confirmar: (ingestaId: string, payload: ConfirmarIngestaDto) =>
    client.post<ResultadoConfirmacion>(`/ingesta/${ingestaId}/confirmar`, payload),
};
