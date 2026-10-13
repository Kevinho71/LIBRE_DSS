import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../utils/env';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? '',
        sessionToken: env.AWS_SESSION_TOKEN,
      },
    });
  }
  return s3Client;
}

export async function generarPresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<string> {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
}

export interface ObjetoLeido {
  mimeType: string;
  base64: string;
}

export async function leerObjetoComoBase64(bucket: string, key: string): Promise<ObjetoLeido> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await getS3Client().send(command);

  if (!response.Body) {
    throw new Error(`El objeto '${key}' no tiene contenido disponible en S3.`);
  }

  const bytes = await response.Body.transformToByteArray();
  return {
    mimeType: response.ContentType ?? 'image/jpeg',
    base64: Buffer.from(bytes).toString('base64'),
  };
}
