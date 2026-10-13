import { transaccionesRepository } from './transacciones.repository';
import {
  RegistrarVentaDto,
  RegistrarVentaBatchDto,
  RegistrarIngresoDto,
  RegistrarAjusteDto,
  RegistrarDevolucionDto,
  FiltroTransaccionesDto,
  EstadoPago,
} from './transacciones.types';
import { logger } from '../../shared/utils/logger';
import { NotFoundError } from '../../shared/errors/AppError';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { dssService } from '../dss/dss.service';
import { AlertaReabastecimiento } from '../dss/dss.types';

/**
 * Evaluación de ROP posterior a una salida de almacén (HU-21 / LIB-35).
 * Es de mejor esfuerzo: si la evaluación falla, la venta ya quedó confirmada y la
 * recomendación simplemente se omite sin romper la operación transaccional.
 */
async function evaluarAlertaPostSalida(empresaId: string, productoId: string): Promise<AlertaReabastecimiento | null> {
  try {
    return await dssService.evaluarPosicionInventario(empresaId, productoId);
  } catch (error) {
    logger.warn('Evaluación de ROP post-salida falló; se omite la recomendación', {
      empresaId,
      productoId,
      error,
    });
    return null;
  }
}

export const transaccionesService = {
  async registrarVenta(empresaId: string, data: RegistrarVentaDto) {
    if (data.llaveIdempotencia) {
      const previas = await transaccionesRepository.findByIdempotencia(empresaId, data.llaveIdempotencia);
      if (previas.length > 0) {
        logger.info('Venta duplicada detectada por idempotencia, retornando registro existente', {
          empresaId,
          llaveIdempotencia: data.llaveIdempotencia,
          trxId: previas[0].id,
        });
        return {
          idempotente: true,
          transaccion: previas[0],
          mensaje: 'Transacción ya procesada previamente (Idempotencia)',
        };
      }
    }

    const resultado = await transaccionesRepository.registrarVenta(empresaId, data);
    logger.info('Venta registrada exitosamente', {
      empresaId,
      productoId: data.productoId,
      cantidad: data.cantidad,
      nuevoStock: resultado.nuevoStock,
      estadoPago: data.estadoPago || 'contado',
    });

    const alerta = await evaluarAlertaPostSalida(empresaId, data.productoId);

    return {
      idempotente: false,
      transaccion: resultado.transaccion,
      nuevoStock: resultado.nuevoStock,
      alerta,
      mensaje: 'Venta registrada exitosamente',
    };
  },

  async registrarVentaBatch(empresaId: string, data: RegistrarVentaBatchDto) {
    if (data.llaveIdempotencia) {
      const previas = await transaccionesRepository.findByIdempotencia(empresaId, data.llaveIdempotencia);
      if (previas.length > 0) {
        logger.info('Venta batch duplicada detectada por idempotencia', {
          empresaId,
          llaveIdempotencia: data.llaveIdempotencia,
        });
        return {
          idempotente: true,
          notaId: previas[0].notaId,
          transacciones: previas,
          mensaje: 'Nota de venta ya procesada previamente (Idempotencia)',
        };
      }
    }

    const resultado = await transaccionesRepository.registrarVentaBatch(empresaId, data);
    logger.info('Nota de venta batch registrada exitosamente', {
      empresaId,
      notaId: resultado.notaId,
      totalItems: data.items.length,
      estadoPago: data.estadoPago || 'contado',
    });

    const alertas = (
      await Promise.all(data.items.map((i) => evaluarAlertaPostSalida(empresaId, i.productoId)))
    ).filter((a): a is AlertaReabastecimiento => a !== null);

    return {
      idempotente: false,
      notaId: resultado.notaId,
      transacciones: resultado.transacciones,
      totalItems: resultado.transacciones.length,
      alertas,
      mensaje: 'Nota de venta registrada exitosamente',
    };
  },

  async registrarIngreso(empresaId: string, data: RegistrarIngresoDto) {
    if (data.llaveIdempotencia) {
      const previas = await transaccionesRepository.findByIdempotencia(empresaId, data.llaveIdempotencia);
      if (previas.length > 0) {
        logger.info('Ingreso duplicado detectado por idempotencia', {
          empresaId,
          llaveIdempotencia: data.llaveIdempotencia,
        });
        return {
          idempotente: true,
          transaccion: previas[0],
          mensaje: 'Ingreso ya procesado previamente (Idempotencia)',
        };
      }
    }

    const resultado = await transaccionesRepository.registrarIngreso(empresaId, data);
    logger.info('Ingreso de mercadería registrado exitosamente', {
      empresaId,
      productoId: data.productoId,
      cantidadIngresada: data.cantidad,
      esUnidadCompra: !!data.esUnidadCompra,
      nuevoStock: resultado.nuevoStock,
    });

    return {
      idempotente: false,
      transaccion: resultado.transaccion,
      nuevoStock: resultado.nuevoStock,
      mensaje: 'Ingreso de mercadería registrado exitosamente',
    };
  },

  async registrarAjuste(empresaId: string, data: RegistrarAjusteDto) {
    if (data.llaveIdempotencia) {
      const previas = await transaccionesRepository.findByIdempotencia(empresaId, data.llaveIdempotencia);
      if (previas.length > 0) {
        return {
          idempotente: true,
          transaccion: previas[0],
          mensaje: 'Ajuste ya procesado previamente (Idempotencia)',
        };
      }
    }

    const resultado = await transaccionesRepository.registrarAjuste(empresaId, data);
    logger.info('Ajuste de inventario registrado exitosamente', {
      empresaId,
      productoId: data.productoId,
      tipo: resultado.transaccion.tipo,
      motivo: data.motivo,
      nuevoStock: resultado.nuevoStock,
    });

    return {
      idempotente: false,
      transaccion: resultado.transaccion,
      nuevoStock: resultado.nuevoStock,
      mensaje: 'Ajuste de inventario registrado exitosamente',
    };
  },

  async registrarDevolucion(empresaId: string, data: RegistrarDevolucionDto) {
    if (data.llaveIdempotencia) {
      const previas = await transaccionesRepository.findByIdempotencia(empresaId, data.llaveIdempotencia);
      if (previas.length > 0) {
        return {
          idempotente: true,
          transaccion: previas[0],
          mensaje: 'Devolución ya procesada previamente (Idempotencia)',
        };
      }
    }

    const resultado = await transaccionesRepository.registrarDevolucion(empresaId, data);
    logger.info('Devolución registrada exitosamente', {
      empresaId,
      productoId: data.productoId,
      tipo: data.tipo,
      cantidad: data.cantidad,
      nuevoStock: resultado.nuevoStock,
    });

    return {
      idempotente: false,
      transaccion: resultado.transaccion,
      nuevoStock: resultado.nuevoStock,
      mensaje: 'Devolución registrada exitosamente',
    };
  },

  async actualizarEstadoPago(empresaId: string, id: string, estadoPago: EstadoPago) {
    const actualizada = await transaccionesRepository.actualizarEstadoPago(empresaId, id, estadoPago);
    if (!actualizada) {
      throw new NotFoundError('TRANSACCION_NO_ENCONTRADA', `La transacción '${id}' no existe`);
    }
    logger.info('Estado de pago actualizado para transacción', { empresaId, id, estadoPago });
    return actualizada;
  },

  async actualizarEstadoPagoPorNota(empresaId: string, notaId: string, estadoPago: EstadoPago) {
    const actualizadas = await transaccionesRepository.actualizarEstadoPagoPorNota(empresaId, notaId, estadoPago);
    if (actualizadas.length === 0) {
      throw new NotFoundError('NOTA_NO_ENCONTRADA', `No existen transacciones para la nota de venta '${notaId}'`);
    }
    logger.info('Estado de pago actualizado para nota de venta', {
      empresaId,
      notaId,
      afectadas: actualizadas.length,
      estadoPago,
    });
    return { notaId, estadoPago, afectadas: actualizadas.length };
  },

  async listar(empresaId: string, filtros: FiltroTransaccionesDto) {
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;

    const { items, total } = await transaccionesRepository.findList(empresaId, filtros);
    return buildPaginatedResult(items, total, { page, limit, offset });
  },

  async obtenerPorNota(empresaId: string, notaId: string) {
    const items = await transaccionesRepository.findByNotaId(empresaId, notaId);
    if (items.length === 0) {
      throw new NotFoundError('NOTA_NO_ENCONTRADA', `No se encontraron transacciones para la nota '${notaId}'`);
    }
    return { notaId, items, totalItems: items.length };
  },
};
