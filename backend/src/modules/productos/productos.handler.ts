import { LambdaEvent, LambdaResponse, ok, created, noContent, parseBody } from '../../shared/types/lambda';
import { CreateProductoSchema, UpdateProductoSchema, ListProductosQuerySchema } from './productos.schema';
import { productosService } from './productos.service';
import { extractTenantId } from '../../shared/middleware/requireAuth';

export async function crearProductoHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = CreateProductoSchema.parse(rawBody);
  const producto = await productosService.crearProducto(empresaId, dto);
  return created(producto);
}

export async function obtenerProductoHandler(event: LambdaEvent, id: string): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const producto = await productosService.obtenerProducto(empresaId, id);
  return ok(producto);
}

export async function actualizarProductoHandler(event: LambdaEvent, id: string): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = UpdateProductoSchema.parse(rawBody);
  const producto = await productosService.actualizarProducto(empresaId, id, dto);
  return ok(producto);
}

export async function eliminarProductoHandler(event: LambdaEvent, id: string): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  await productosService.desactivarProducto(empresaId, id);
  return noContent();
}

export async function listarProductosHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const queryParams = event.queryStringParameters || {};
  const query = ListProductosQuerySchema.parse(queryParams);
  const result = await productosService.listarProductos(empresaId, query);
  return ok(result);
}
