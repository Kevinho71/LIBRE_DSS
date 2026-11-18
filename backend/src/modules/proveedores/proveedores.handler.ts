import { LambdaEvent, LambdaResponse, ok, created, parseBody } from '../../shared/types/lambda';
import { CreateProveedorSchema, AsociarProductoProveedorSchema } from './proveedores.schema';
import { proveedoresService } from './proveedores.service';
import { extractTenantId } from '../../shared/middleware/requireAuth';

export async function crearProveedorHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = CreateProveedorSchema.parse(rawBody);
  const proveedor = await proveedoresService.crearProveedor(empresaId, dto);
  return created(proveedor);
}

export async function listarProveedoresHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const proveedores = await proveedoresService.listarProveedores(empresaId);
  return ok(proveedores);
}

export async function asociarProductoProveedorHandler(event: LambdaEvent, productoId: string): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = AsociarProductoProveedorSchema.parse(rawBody);
  const vinculo = await proveedoresService.asociarAProducto(empresaId, productoId, dto);
  return created(vinculo);
}

export async function listarProveedoresDeProductoHandler(event: LambdaEvent, productoId: string): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const vinculos = await proveedoresService.listarProveedoresDeProducto(empresaId, productoId);
  return ok(vinculos);
}
