import { LambdaEvent, LambdaResponse, ok, noContent } from './shared/types/lambda';
import { NotFoundError } from './shared/errors/AppError';
import { handleError } from './shared/errors/errorHandler';
import { registerHandler, loginHandler, meHandler } from './modules/auth/auth.handler';
import {
  crearProductoHandler,
  obtenerProductoHandler,
  actualizarProductoHandler,
  eliminarProductoHandler,
  listarProductosHandler,
  buscarProductosHandler,
  importarCsvHandler,
} from './modules/productos/productos.handler';
import {
  crearProveedorHandler,
  listarProveedoresHandler,
  asociarProductoProveedorHandler,
  listarProveedoresDeProductoHandler,
} from './modules/proveedores/proveedores.handler';
import {
  registrarVentaHandler,
  registrarVentaBatchHandler,
  registrarIngresoHandler,
  registrarAjusteHandler,
  registrarDevolucionHandler,
  listarTransaccionesHandler,
  obtenerTransaccionesPorNotaHandler,
  actualizarPagoHandler,
  actualizarPagoNotaHandler,
} from './modules/transacciones/transacciones.handler';
import { generarPresignedUrlHandler } from './modules/storage/storage.handler';
import {
  recalcularAbcHandler,
  obtenerResumenAbcHandler,
  obtenerParetoHandler,
  recalcularEoqRopHandler,
  obtenerAlertasHandler,
  recalcularSistemasHandler,
  obtenerSistemasHandler,
  obtenerAlertasMinMaxHandler,
  retrospectivaHandler,
  sugerenciasProveedorHandler,
  explicarAlertaHandler,
} from './modules/dss/dss.handler';
import { extraerIngestaHandler, confirmarIngestaHandler } from './modules/ai/ai.handler';
import { obtenerDashboardKpisHandler, obtenerReporteCostosHandler } from './modules/dashboard/dashboard.handler';
import {
  listarUsuariosHandler,
  crearUsuarioHandler,
  actualizarRolUsuarioHandler,
  eliminarUsuarioHandler,
} from './modules/usuarios/usuarios.handler';

function normalizePath(rawPath: string): string {
  let p = (rawPath || '/').toLowerCase().trim();
  if (p.startsWith('/api/v1')) {
    p = p.substring('/api/v1'.length);
  }
  if (p.endsWith('/') && p.length > 1) {
    p = p.substring(0, p.length - 1);
  }
  return p === '' ? '/' : p;
}

async function router(event: LambdaEvent): Promise<LambdaResponse> {
  const method = (event.requestContext?.http?.method || (event as any).httpMethod || 'GET').toUpperCase();
  const rawPath = event.rawPath || (event as any).path || '/';
  const path = normalizePath(rawPath);

  // 1. Preflight CORS
  if (method === 'OPTIONS') {
    return noContent();
  }

  // 2. Health check y raíz
  if (method === 'GET' && (path === '/health' || path === '/')) {
    return ok({
      message: 'LIBREDSS API Base Online',
      service: 'LIBREDSS Backend API',
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });
  }

  const segments = path.split('/').filter(Boolean);
  const resource = segments[0];

  // 3. Autenticación (/auth/*)
  if (resource === 'auth') {
    const action = segments[1];
    if (method === 'POST' && action === 'register') return registerHandler(event);
    if (method === 'POST' && action === 'login') return loginHandler(event);
    if (method === 'GET' && action === 'me') return meHandler(event);
  }

  // 4. Productos (/productos/*)
  if (resource === 'productos') {
    if (segments.length === 1) {
      if (method === 'POST') return crearProductoHandler(event);
      if (method === 'GET') return listarProductosHandler(event);
    }

    if (segments.length === 2) {
      if (segments[1] === 'buscar' && method === 'GET') return buscarProductosHandler(event);
      if (segments[1] === 'importar-csv' && method === 'POST') return importarCsvHandler(event);
      const id = segments[1];
      if (method === 'GET') return obtenerProductoHandler(event, id);
      if (method === 'PUT') return actualizarProductoHandler(event, id);
      if (method === 'DELETE') return eliminarProductoHandler(event, id);
    }

    if (segments.length === 3 && segments[2] === 'proveedores') {
      const productoId = segments[1];
      if (method === 'POST') return asociarProductoProveedorHandler(event, productoId);
      if (method === 'GET') return listarProveedoresDeProductoHandler(event, productoId);
    }
  }

  // 5. Proveedores (/proveedores/*)
  if (resource === 'proveedores') {
    if (segments.length === 1) {
      if (method === 'POST') return crearProveedorHandler(event);
      if (method === 'GET') return listarProveedoresHandler(event);
    }
  }

  // 6. Transacciones (/transacciones/*)
  if (resource === 'transacciones') {
    if (segments.length === 1) {
      if (method === 'GET') return listarTransaccionesHandler(event);
    }

    if (segments.length === 2) {
      const action = segments[1];
      if (method === 'POST' && action === 'venta') return registrarVentaHandler(event);
      if (method === 'POST' && action === 'batch') return registrarVentaBatchHandler(event);
      if (method === 'POST' && action === 'ingreso') return registrarIngresoHandler(event);
      if (method === 'POST' && action === 'ajuste') return registrarAjusteHandler(event);
      if (method === 'POST' && action === 'devolucion') return registrarDevolucionHandler(event);
    }

    if (segments.length === 3) {
      if (segments[1] === 'notas' && method === 'GET') {
        return obtenerTransaccionesPorNotaHandler(event, segments[2]);
      }
      if (segments[2] === 'pago' && method === 'PATCH') {
        return actualizarPagoHandler(event, segments[1]);
      }
    }

    if (segments.length === 4 && segments[1] === 'notas' && segments[3] === 'pago' && method === 'PATCH') {
      return actualizarPagoNotaHandler(event, segments[2]);
    }
  }

  // 7. Almacenamiento / Fotos (/storage/*)
  if (resource === 'storage') {
    if (segments.length === 2 && segments[1] === 'presigned-url' && method === 'POST') {
      return generarPresignedUrlHandler(event);
    }
  }

  // 8. Motor DSS — Clasificación ABC (/dss/*)
  if (resource === 'dss') {
    if (segments.length === 3 && segments[1] === 'abc') {
      const action = segments[2];
      if (method === 'GET' && action === 'resumen') return obtenerResumenAbcHandler(event);
      if (method === 'GET' && action === 'pareto') return obtenerParetoHandler(event);
      if (method === 'POST' && action === 'recalcular') return recalcularAbcHandler(event);
    }

    if (segments.length === 2 && segments[1] === 'alertas' && method === 'GET') {
      return obtenerAlertasHandler(event);
    }

    if (segments.length === 2 && segments[1] === 'alertas-min-max' && method === 'GET') {
      return obtenerAlertasMinMaxHandler(event);
    }

    if (segments.length === 2 && segments[1] === 'sistemas' && method === 'GET') {
      return obtenerSistemasHandler(event);
    }

    if (segments.length === 3 && segments[1] === 'sistemas' && segments[2] === 'recalcular' && method === 'POST') {
      return recalcularSistemasHandler(event);
    }

    if (segments.length === 3 && segments[1] === 'eoq-rop' && segments[2] === 'recalcular' && method === 'POST') {
      return recalcularEoqRopHandler(event);
    }

    if (segments.length === 2 && segments[1] === 'retrospectiva' && method === 'POST') {
      return retrospectivaHandler(event);
    }

    // --- NUEVAS RUTAS FASE 6 ---
    // GET /dss/sugerencias-proveedor/:proveedorId
    if (segments.length === 3 && segments[1] === 'sugerencias-proveedor' && method === 'GET') {
      return sugerenciasProveedorHandler(event, segments[2]);
    }

    // POST /dss/explicar-alerta
    if (segments.length === 2 && segments[1] === 'explicar-alerta' && method === 'POST') {
      return explicarAlertaHandler(event);
    }
  }

  // 9. Ingesta asistida por IA (/ingesta/*)
  if (resource === 'ingesta') {
    if (segments.length === 2 && segments[1] === 'extraer' && method === 'POST') {
      return extraerIngestaHandler(event);
    }
    if (segments.length === 3 && segments[2] === 'confirmar' && method === 'POST') {
      return confirmarIngestaHandler(event, segments[1]);
    }
  }

  // 10. Dashboard Ejecutivo (/dashboard/*)
  if (resource === 'dashboard') {
    if (segments.length === 2 && segments[1] === 'kpis' && method === 'GET') {
      return obtenerDashboardKpisHandler(event);
    }
    if (segments.length === 2 && segments[1] === 'reporte-costos' && method === 'GET') {
      return obtenerReporteCostosHandler(event);
    }
  }

  // 11. Gestión de Usuarios (/usuarios/*)
  if (resource === 'usuarios') {
    if (segments.length === 1) {
      if (method === 'GET') return listarUsuariosHandler(event);
      if (method === 'POST') return crearUsuarioHandler(event);
    }

    if (segments.length === 2 && method === 'DELETE') {
      return eliminarUsuarioHandler(event, segments[1]);
    }

    if (segments.length === 3 && segments[2] === 'rol' && method === 'PUT') {
      return actualizarRolUsuarioHandler(event, segments[1]);
    }
  }

  throw new NotFoundError('RUTA_NO_ENCONTRADA', `La ruta '${method} ${rawPath}' no existe en el servidor`);
}

/**
 * Punto de entrada principal para AWS Lambda Function URL
 */
export async function handler(event: any = {}, context?: any): Promise<LambdaResponse> {
  try {
    return await router(event);
  } catch (error) {
    return handleError(error);
  }
}
