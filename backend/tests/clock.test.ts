import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clock, now, today } from '../src/shared/utils/clock';
import { ValidationError } from '../src/shared/errors/AppError';

describe('Reloj inyectable (Plan de Simulación §4.1)', () => {
  afterEach(() => {
    clock.clear();
  });

  it('sin fecha simulada devuelve la hora real del sistema', () => {
    clock.clear();
    const antes = Date.now();
    const actual = clock.now().getTime();
    const despues = Date.now();

    expect(clock.isSimulated()).toBe(false);
    expect(actual).toBeGreaterThanOrEqual(antes);
    expect(actual).toBeLessThanOrEqual(despues);
    expect(clock.today()).toBe(new Date().toISOString().slice(0, 10));
  });

  it('fija la fecha simulada en formato YYYY-MM-DD', () => {
    clock.setSimulatedDate('2026-05-15');

    expect(clock.isSimulated()).toBe(true);
    expect(clock.getSimulatedDate()).toBe('2026-05-15');
    expect(clock.today()).toBe('2026-05-15');
    expect(clock.now().toISOString().slice(0, 10)).toBe('2026-05-15');
  });

  it('acepta un objeto Date como fecha simulada', () => {
    clock.setSimulatedDate(new Date('2027-01-02T00:00:00.000Z'));

    expect(clock.today()).toBe('2027-01-02');
  });

  it('permite avanzar el día simulando el paso del tiempo', () => {
    clock.setSimulatedDate('2026-05-15');
    expect(today()).toBe('2026-05-15');

    clock.setSimulatedDate('2026-05-16');
    expect(today()).toBe('2026-05-16');
  });

  it('clear() vuelve a la hora real del sistema', () => {
    clock.setSimulatedDate('2026-05-15');
    clock.clear();

    expect(clock.isSimulated()).toBe(false);
    expect(clock.getSimulatedDate()).toBeNull();
  });

  it('rechaza fechas con formato inválido', () => {
    expect(() => clock.setSimulatedDate('15/05/2026')).toThrow(ValidationError);
    expect(() => clock.setSimulatedDate('2026-13-01T00:00:00.000Z')).toThrow(ValidationError);
  });

  it('expone los atajos now() y today()', () => {
    clock.setSimulatedDate('2026-12-31');
    expect(today()).toBe('2026-12-31');
    expect(now().toISOString().slice(0, 10)).toBe('2026-12-31');
  });
});
