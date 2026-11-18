import { describe, it, expect } from 'vitest';
import {
  calcularDimensiones,
  nombreComprimido,
  esImagenValida,
  MAX_DIMENSION_DEFAULT,
} from '@/lib/imageCompression';

describe('compresión de imágenes (Canvas) — utilidades', () => {
  describe('calcularDimensiones', () => {
    it('reduce el lado mayor respetando el aspecto cuando excede el máximo', () => {
      expect(calcularDimensiones(2000, 1000, 1000)).toEqual({ width: 1000, height: 500 });
    });

    it('no escala hacia arriba imágenes pequeñas', () => {
      expect(calcularDimensiones(400, 300)).toEqual({ width: 400, height: 300 });
    });

    it('aplica el máximo por defecto de 1024 px', () => {
      const resultado = calcularDimensiones(4000, 3000);
      expect(resultado.width).toBe(MAX_DIMENSION_DEFAULT);
      expect(resultado.height).toBe(768);
    });

    it('devuelve 0x0 ante dimensiones inválidas', () => {
      expect(calcularDimensiones(0, 100)).toEqual({ width: 0, height: 0 });
    });
  });

  describe('nombreComprimido', () => {
    it('fuerza la extensión .jpg', () => {
      expect(nombreComprimido('recibo.png')).toBe('recibo.jpg');
      expect(nombreComprimido('foto.recibo.jpeg')).toBe('foto.recibo.jpg');
    });

    it('usa "foto" cuando no hay nombre base', () => {
      expect(nombreComprimido('.png')).toBe('foto.jpg');
    });
  });

  describe('esImagenValida', () => {
    it('acepta tipos image/* y rechaza el resto', () => {
      expect(esImagenValida(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(true);
      expect(esImagenValida(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
    });
  });
});
