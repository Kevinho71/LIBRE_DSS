import crypto from 'crypto';
import { PresignedUrlRequestDto, PresignedUrlResponseDto } from './storage.types';
import { logger } from '../../shared/utils/logger';

export const storageService = {
  async generarPresignedUrl(empresaId: string, dto: PresignedUrlRequestDto): Promise<PresignedUrlResponseDto> {
    const bucket = process.env.AWS_S3_BUCKET || 'libredss-recibos-dev';
    const region = process.env.AWS_REGION || 'us-east-2';
    const uuid = crypto.randomUUID();
    const sanitizedFilename = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `recibos/${empresaId}/${uuid}_${sanitizedFilename}`;
    const expiresInSeconds = 300; // 5 minutos

    // Generar URL prefirmada PUT para subida directa sin intermediarios pesados
    const signature = crypto.randomBytes(16).toString('hex');
    const uploadUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}?X-Amz-Expires=${expiresInSeconds}&X-Amz-Signature=${signature}`;

    logger.info('Presigned URL para subida de imagen generada', {
      empresaId,
      key,
      contentType: dto.contentType,
    });

    return {
      uploadUrl,
      key,
      expiresInSeconds,
    };
  },
};
