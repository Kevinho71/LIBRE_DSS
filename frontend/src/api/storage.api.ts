import { client, getBaseUrl } from './client';

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
}

export const storageApi = {
  solicitarPresignedUrl: (filename: string, contentType: string) =>
    client.post<PresignedUrlResponse>('/storage/presigned-url', { filename, contentType }),

  /**
   * Sube el binario directamente a S3 con la URL prefirmada (sin pasar por el
   * backend). El Content-Type debe coincidir con el declarado al firmar.
   */
  subirArchivo: async (uploadUrl: string, file: Blob, contentType: string): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`La subida a S3 falló con estado ${response.status}`);
    }
  },
};

export { getBaseUrl };
