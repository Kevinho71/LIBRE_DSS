import { env } from './env';
import { ValidationError } from '../errors/AppError';

/**
 * Reloj inyectable (Plan de Simulación §4.1).
 *
 * El motor DSS (`engine/`) es puro y no usa fechas. Sin embargo, las fechas de negocio
 * del backend (`fechaEvento`, `fechaRegistro`, `fechaCalculo`) sí dependen del reloj del
 * sistema. Para reconstruir un año de operación simulado necesitamos poder fijar y
 * avanzar esa fecha de forma determinística, sin depender de la hora real de la máquina.
 *
 * La fecha simulada se inicializa desde la variable de entorno `DSS_SIM_FECHA`
 * (formato `YYYY-MM-DD`) y puede sobreescribirse/avanzarse en caliente mediante
 * `setSimulatedDate` (expuesto por HTTP en `POST /dss/simular/reloj`). Si no hay fecha
 * simulada activa, `now()` y `today()` devuelven la fecha real del sistema.
 */

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

let fechaSimulada: Date | null = null;

function normalizarFecha(valor: string | Date): Date {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      throw new ValidationError('FECHA_SIMULADA_INVALIDA', 'La fecha simulada no es una fecha válida');
    }
    return new Date(valor.getTime());
  }

  const texto = valor.trim();
  if (!FECHA_REGEX.test(texto)) {
    throw new ValidationError(
      'FECHA_SIMULADA_INVALIDA',
      `La fecha simulada debe tener formato YYYY-MM-DD (recibido: '${valor}')`
    );
  }

  const fecha = new Date(`${texto}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime())) {
    throw new ValidationError('FECHA_SIMULADA_INVALIDA', `La fecha simulada '${valor}' no es válida`);
  }
  return fecha;
}

// Inicialización perezosa desde el entorno (una sola vez, al cargar el módulo).
if (env.DSS_SIM_FECHA) {
  fechaSimulada = normalizarFecha(env.DSS_SIM_FECHA);
}

export const clock = {
  /** Fecha/hora actual: simulada si está fijada, real del sistema en caso contrario. */
  now(): Date {
    return fechaSimulada ? new Date(fechaSimulada.getTime()) : new Date();
  },

  /** Fecha actual en formato `YYYY-MM-DD` (UTC), consistente con las columnas `date`. */
  today(): string {
    return clock.now().toISOString().slice(0, 10);
  },

  /** Indica si hay una fecha simulada activa. */
  isSimulated(): boolean {
    return fechaSimulada !== null;
  },

  /** Fecha simulada activa en formato `YYYY-MM-DD`, o `null` si se usa la hora real. */
  getSimulatedDate(): string | null {
    return fechaSimulada ? fechaSimulada.toISOString().slice(0, 10) : null;
  },

  /** Fija la fecha simulada (acepta `YYYY-MM-DD`, ISO-8601 o `Date`). */
  setSimulatedDate(valor: string | Date): void {
    fechaSimulada = normalizarFecha(valor);
  },

  /** Desactiva la fecha simulada y vuelve a la hora real del sistema. */
  clear(): void {
    fechaSimulada = null;
  },
};

/** Atajo equivalente a `clock.now()`. */
export function now(): Date {
  return clock.now();
}

/** Atajo equivalente a `clock.today()` (formato `YYYY-MM-DD`). */
export function today(): string {
  return clock.today();
}
