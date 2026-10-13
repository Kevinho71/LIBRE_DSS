import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { transaccionesService } from './transacciones.service';
import { transaccionesRepository } from './transacciones.repository';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError';
import {
  registrarVentaSchema,
  registrarVentaBatchSchema,
  registrarIngresoSchema,
  registrarAjusteSchema,
  registrarDevolucionSchema,
} from './transacciones.schema';

describe('Transacciones Service & Schema Unit Tests (Sprint 2 / LIB-3)', () => {
  const empresaId = crypto.randomUUID();
  const productoId = crypto.randomUUID();
  const notaId = crypto.randomUUID();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Validación de Esquemas Zod', () => {
    it('debe rechazar venta con cantidad negativa o cero', () => {
      const res = registrarVentaSchema.safeParse({
        productoId,
        cantidad: -5,
      });
      expect(res.success).toBe(false);
    });

    it('debe rechazar venta con productoId inválido', () => {
      const res = registrarVentaSchema.safeParse({
        productoId: 'no-uuid',
        cantidad: 5,
      });
      expect(res.success).toBe(false);
    });

    it('debe validar exitosamente venta batch multilínea (CB-03)', () => {
      const res = registrarVentaBatchSchema.safeParse({
        notaId,
        items: [
          { productoId, cantidad: 2 },
          { productoId: crypto.randomUUID(), cantidad: 10 },
        ],
        estadoPago: 'credito_pendiente',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.items.length).toBe(2);
        expect(res.data.estadoPago).toBe('credito_pendiente');
      }
    });

    it('debe rechazar venta batch con arreglo vacío de items', () => {
      const res = registrarVentaBatchSchema.safeParse({
        items: [],
      });
      expect(res.success).toBe(false);
    });

    it('debe rechazar ajuste si no incluye conteoFisico ni cantidad (CB-06)', () => {
      const res = registrarAjusteSchema.safeParse({
        productoId,
        motivo: 'Ajuste general',
      });
      expect(res.success).toBe(false);
    });

    it('debe validar devolución de cliente con notaId opcional (CB-05)', () => {
      const res = registrarDevolucionSchema.safeParse({
        productoId,
        tipo: 'devolucion_cliente',
        cantidad: 3,
        notaId,
        motivo: 'Cliente devolvió sobrante de obra',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Ventas e Idempotencia (HU-11, CB-01, CB-07)', () => {
    it('debe registrar una venta simple descontando stock', async () => {
      vi.spyOn(transaccionesRepository, 'findByIdempotencia').mockResolvedValue([]);
      vi.spyOn(transaccionesRepository, 'registrarVenta').mockResolvedValue({
        transaccion: {
          id: 'trx-1',
          empresaId,
          productoId,
          notaId: null,
          tipo: 'venta',
          cantidad: '5.00',
          costoUnitarioHistorico: '10.00',
          precioVentaHistorico: '15.00',
          motivo: null,
          estadoPago: 'contado',
          llaveIdempotencia: 'idemp-123',
          fechaEvento: '2026-10-12',
          fechaRegistro: new Date(),
        },
        nuevoStock: 45,
      });

      const res = await transaccionesService.registrarVenta(empresaId, {
        productoId,
        cantidad: 5,
        llaveIdempotencia: 'idemp-123',
      });

      expect(res.idempotente).toBe(false);
      expect(res.nuevoStock).toBe(45);
      expect(res.transaccion.id).toBe('trx-1');
      expect(transaccionesRepository.registrarVenta).toHaveBeenCalledTimes(1);
    });

    it('debe retornar transacción existente sin alterar stock si se repite la llave de idempotencia', async () => {
      const trxExistente = {
        id: 'trx-previa-1',
        empresaId,
        productoId,
        notaId: null,
        tipo: 'venta',
        cantidad: '5.00',
        costoUnitarioHistorico: '10.00',
        precioVentaHistorico: '15.00',
        motivo: null,
        estadoPago: 'contado',
        llaveIdempotencia: 'idemp-repetida',
        fechaEvento: '2026-10-12',
        fechaRegistro: new Date(),
      };

      vi.spyOn(transaccionesRepository, 'findByIdempotencia').mockResolvedValue([trxExistente]);
      vi.spyOn(transaccionesRepository, 'registrarVenta');

      const res = await transaccionesService.registrarVenta(empresaId, {
        productoId,
        cantidad: 5,
        llaveIdempotencia: 'idemp-repetida',
      });

      expect(res.idempotente).toBe(true);
      expect(res.transaccion.id).toBe('trx-previa-1');
      expect(transaccionesRepository.registrarVenta).not.toHaveBeenCalled();
    });

    it('debe registrar venta batch con nota_id atómico (CB-03)', async () => {
      vi.spyOn(transaccionesRepository, 'findByIdempotencia').mockResolvedValue([]);
      vi.spyOn(transaccionesRepository, 'registrarVentaBatch').mockResolvedValue({
        notaId,
        transacciones: [
          {
            id: 'trx-batch-1',
            empresaId,
            productoId,
            notaId,
            tipo: 'venta',
            cantidad: '2.00',
            costoUnitarioHistorico: '10.00',
            precioVentaHistorico: '15.00',
            motivo: null,
            estadoPago: 'contado',
            llaveIdempotencia: null,
            fechaEvento: '2026-10-12',
            fechaRegistro: new Date(),
          },
        ],
      });

      const res = await transaccionesService.registrarVentaBatch(empresaId, {
        notaId,
        items: [{ productoId, cantidad: 2 }],
      });

      expect(res.idempotente).toBe(false);
      expect(res.notaId).toBe(notaId);
      expect(res.transacciones.length).toBe(1);
    });
  });

  describe('Ingreso de Mercadería y Conversión de Empaques (HU-12, CB-04)', () => {
    it('debe procesar ingreso y retornar nuevo stock actualizado', async () => {
      vi.spyOn(transaccionesRepository, 'findByIdempotencia').mockResolvedValue([]);
      vi.spyOn(transaccionesRepository, 'registrarIngreso').mockResolvedValue({
        transaccion: {
          id: 'trx-ingreso-1',
          empresaId,
          productoId,
          notaId: null,
          tipo: 'ingreso',
          cantidad: '5000.00',
          costoUnitarioHistorico: '0.50',
          precioVentaHistorico: null,
          motivo: 'Ingreso mayorista: 5 cajas x 1000',
          estadoPago: 'contado',
          llaveIdempotencia: null,
          fechaEvento: '2026-10-12',
          fechaRegistro: new Date(),
        },
        nuevoStock: 5000,
      });

      const res = await transaccionesService.registrarIngreso(empresaId, {
        productoId,
        cantidad: 5,
        esUnidadCompra: true,
      });

      expect(res.idempotente).toBe(false);
      expect(res.nuevoStock).toBe(5000);
      expect(res.transaccion.tipo).toBe('ingreso');
    });
  });

  describe('Ajustes, Mermas y Arqueo Físico (HU-13, CB-06)', () => {
    it('debe registrar un ajuste por conteo físico exitosamente', async () => {
      vi.spyOn(transaccionesRepository, 'findByIdempotencia').mockResolvedValue([]);
      vi.spyOn(transaccionesRepository, 'registrarAjuste').mockResolvedValue({
        transaccion: {
          id: 'trx-ajuste-1',
          empresaId,
          productoId,
          notaId: null,
          tipo: 'merma',
          cantidad: '3.00',
          costoUnitarioHistorico: '10.00',
          precioVentaHistorico: null,
          motivo: 'Diferencia en arqueo físico',
          estadoPago: 'contado',
          llaveIdempotencia: null,
          fechaEvento: '2026-10-12',
          fechaRegistro: new Date(),
        },
        nuevoStock: 14,
      });

      const res = await transaccionesService.registrarAjuste(empresaId, {
        productoId,
        conteoFisico: 14,
        motivo: 'Diferencia en arqueo físico',
      });

      expect(res.idempotente).toBe(false);
      expect(res.nuevoStock).toBe(14);
      expect(res.transaccion.tipo).toBe('merma');
    });
  });

  describe('Devoluciones (CB-05)', () => {
    it('debe registrar devolución de cliente restituyendo stock', async () => {
      vi.spyOn(transaccionesRepository, 'findByIdempotencia').mockResolvedValue([]);
      vi.spyOn(transaccionesRepository, 'registrarDevolucion').mockResolvedValue({
        transaccion: {
          id: 'trx-dev-1',
          empresaId,
          productoId,
          notaId,
          tipo: 'devolucion_cliente',
          cantidad: '2.00',
          costoUnitarioHistorico: '10.00',
          precioVentaHistorico: null,
          motivo: 'Devolución de mercadería sin usar',
          estadoPago: 'contado',
          llaveIdempotencia: null,
          fechaEvento: '2026-10-12',
          fechaRegistro: new Date(),
        },
        nuevoStock: 12,
      });

      const res = await transaccionesService.registrarDevolucion(empresaId, {
        productoId,
        tipo: 'devolucion_cliente',
        cantidad: 2,
        notaId,
        motivo: 'Devolución de mercadería sin usar',
      });

      expect(res.idempotente).toBe(false);
      expect(res.nuevoStock).toBe(12);
      expect(res.transaccion.tipo).toBe('devolucion_cliente');
    });
  });

  describe('Estado de Pago ("Al Fiado" / CB-07)', () => {
    it('debe actualizar el estado de pago de una transacción a credito_pagado', async () => {
      vi.spyOn(transaccionesRepository, 'actualizarEstadoPago').mockResolvedValue({
        id: 'trx-1',
        empresaId,
        productoId,
        notaId: null,
        tipo: 'venta',
        cantidad: '5.00',
        costoUnitarioHistorico: '10.00',
        precioVentaHistorico: '15.00',
        motivo: null,
        estadoPago: 'credito_pagado',
        llaveIdempotencia: null,
        fechaEvento: '2026-10-12',
        fechaRegistro: new Date(),
      });

      const res = await transaccionesService.actualizarEstadoPago(empresaId, 'trx-1', 'credito_pagado');
      expect(res.estadoPago).toBe('credito_pagado');
    });

    it('debe lanzar NotFoundError si la transacción a actualizar no existe', async () => {
      vi.spyOn(transaccionesRepository, 'actualizarEstadoPago').mockResolvedValue(null);

      await expect(
        transaccionesService.actualizarEstadoPago(empresaId, 'trx-inexistente', 'credito_pagado')
      ).rejects.toThrow(NotFoundError);
    });
  });
});
