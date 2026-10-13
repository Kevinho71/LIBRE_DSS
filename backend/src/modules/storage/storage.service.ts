import crypto from 'crypto';
import { PresignedUrlRequestDto, PresignedUrlResponseDto } from './storage.types';
import { logger } from '../../shared/utils/logger';
import { generarPresignedUploadUrl } from '../../shared/aws/s3';
import { env } from '../../shared/utils/env';

export const storageService = {
  async generarPresignedUrl(empresaId: string, dto: PresignedUrlRequestDto): Promise<PresignedUrlResponseDto> {
    const bucket = env.AWS_S3_BUCKET;
    const uuid = crypto.randomUUID();
    const sanitizedFilename = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `recibos/${empresaId}/${uuid}_${sanitizedFilename}`;
    const expiresInSeconds = 300;

    // URL prefirmada real para subida directa a S3 sin intermediarios pesados
    const uploadUrl = await generarPresignedUploadUrl(bucket, key, dto.contentType, expiresInSeconds);

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
