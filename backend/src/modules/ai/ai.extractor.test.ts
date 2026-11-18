import { describe, it, expect } from 'vitest';
import { normalizarExtraccion, promptPara } from './ai.extractor';
import { extraerIngestaSchema } from './ai.schema';

describe('Ingesta IA: modo inventario', () => {
  it('el modo por defecto es venta y acepta inventario', () => {
    expect(extraerIngestaSchema.parse({ s3Key: 'recibos/e/a.jpg' }).modo).toBe('venta');
    expect(extraerIngestaSchema.parse({ s3Key: 'recibos/e/a.jpg', modo: 'inventario' }).modo).toBe('inventario');
    expect(() => extraerIngestaSchema.parse({ s3Key: 'recibos/e/a.jpg', modo: 'otro' })).toThrow();
  });

  it('el prompt de inventario trata la cantidad como stock y el de venta como ventas', () => {
    expect(promptPara('inventario')).toMatch(/stock/i);
    expect(promptPara('inventario')).toMatch(/No son ventas/);
    expect(promptPara('venta')).toMatch(/ventas/i);
  });

  it('normaliza el costo unitario y lo deja en null si no es visible', () => {
    const r = normalizarExtraccion({
      items: [
        { descripcion: ' Pegamento ', cantidad: 12, precioUnitario: 6, costoUnitario: 3.5 },
        { descripcion: 'Cinta', cantidad: '4' },
        { descripcion: '', cantidad: 1 },
      ],
    });
    expect(r.items).toEqual([
      { descripcion: 'Pegamento', cantidad: 12, precioUnitario: 6, costoUnitario: 3.5 },
      { descripcion: 'Cinta', cantidad: 4, precioUnitario: null, costoUnitario: null },
    ]);
  });
});
