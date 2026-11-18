import { LambdaEvent, LambdaResponse, ok, created, parseBody } from '../../shared/types/lambda';
import { RegisterSchema, LoginSchema } from './auth.schema';
import { authService } from './auth.service';
import { requireAuth } from '../../shared/middleware/requireAuth';

export async function registerHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const body = parseBody(event.body, event.isBase64Encoded);
  const dto = RegisterSchema.parse(body);
  const response = await authService.register(dto);
  return created(response);
}

export async function loginHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const body = parseBody(event.body, event.isBase64Encoded);
  const dto = LoginSchema.parse(body);
  const response = await authService.login(dto);
  return ok(response);
}

export async function meHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const user = requireAuth(event);
  const response = await authService.getMe(user.usuarioId);
  return ok(response);
}
