import { LambdaEvent, LambdaResponse, ok, parseBody } from '../../shared/types/lambda';
import { presignedUrlSchema } from './storage.schema';
import { storageService } from './storage.service';
import { extractTenantId } from '../../shared/middleware/requireAuth';

export async function generarPresignedUrlHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = presignedUrlSchema.parse(rawBody);
  const result = await storageService.generarPresignedUrl(empresaId, dto);
  return ok(result);
}
