import { describe, it, expect } from 'vitest';
import { handler } from '../src/index';

describe('Backend Smoke Test Suite', () => {
  it('debe inicializar el manejador base correctamente', async () => {
    const res = await handler({}, {});
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('LIBREDSS API Base Online');
    expect(body.version).toBe('0.1.0');
  });
});
