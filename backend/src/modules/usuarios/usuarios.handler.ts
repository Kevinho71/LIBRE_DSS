import { LambdaEvent, LambdaResponse, ok, created, noContent, parseBody } from '../../shared/types/lambda';
import { crearUsuarioSchema, actualizarRolSchema } from './usuarios.schema';
import { usuariosService } from './usuarios.service';
import { requireAdmin, requireAuth } from '../../shared/middleware/requireAuth';

export async function listarUsuariosHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = requireAuth(event).empresaId;
  const items = await usuariosService.listar(empresaId);
  return ok({ items, total: items.length });
}

export async function crearUsuarioHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const user = requireAdmin(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = crearUsuarioSchema.parse(rawBody);
  const result = await usuariosService.crear(user.empresaId, dto);
  return created(result);
}

export async function actualizarRolUsuarioHandler(event: LambdaEvent, id: string): Promise<LambdaResponse> {
  const user = requireAdmin(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = actualizarRolSchema.parse(rawBody);
  const result = await usuariosService.actualizarRol(user.empresaId, user.usuarioId, id, dto);
  return ok(result);
}

export async function eliminarUsuarioHandler(event: LambdaEvent, id: string): Promise<LambdaResponse> {
  const user = requireAdmin(event);
  await usuariosService.eliminar(user.empresaId, user.usuarioId, id);
  return noContent();
}
