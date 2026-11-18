import { describe, it, expect } from 'vitest';
import { generarUuid } from '@/lib/idempotency';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generarUuid (llave de idempotencia)', () => {
  it('genera un UUID v4 con formato válido', () => {
    expect(generarUuid()).toMatch(UUID_V4);
  });

  it('genera valores únicos en llamadas sucesivas', () => {
    const valores = new Set(Array.from({ length: 200 }, () => generarUuid()));
    expect(valores.size).toBe(200);
  });
});
