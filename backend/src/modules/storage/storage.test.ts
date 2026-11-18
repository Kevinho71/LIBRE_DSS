import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { storageService } from './storage.service';
import { presignedUrlSchema } from './storage.schema';

describe('Storage Module Unit Tests (HU-35 / Presigned S3)', () => {
  const empresaId = crypto.randomUUID();

  it('debe validar exitosamente solicitud de presigned URL para imagen jpeg', () => {
    const res = presignedUrlSchema.safeParse({
      filename: 'recibo_compra.jpg',
      contentType: 'image/jpeg',
    });
    expect(res.success).toBe(true);
  });

  it('debe rechazar archivo con extensión o MIME no permitido', () => {
    const res = presignedUrlSchema.safeParse({
      filename: 'script.exe',
      contentType: 'application/x-msdownload',
    });
    expect(res.success).toBe(false);
  });

  it('debe generar una URL prefirmada con la clave particionada por empresaId', async () => {
    const res = await storageService.generarPresignedUrl(empresaId, {
      filename: 'recibo_prueba.png',
      contentType: 'image/png',
    });

    expect(res.uploadUrl).toBeDefined();
    expect(res.uploadUrl).toContain('s3');
    expect(res.key).toMatch(new RegExp(`^recibos/${empresaId}/[a-f0-9-]+_recibo_prueba\\.png$`));
    expect(res.expiresInSeconds).toBe(300);
  });
});
