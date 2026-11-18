import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { handler } from './index';
import { LambdaEvent } from './shared/types/lambda';
import { localizarDistFrontend, resolverArchivoEstatico, origenCorsPermitido } from './shared/utils/staticFiles';

// Cargar .env.development o .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const ES_PRODUCCION = process.env.NODE_ENV === 'production';
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

/**
 * Directorio del frontend compilado (vite build). Si existe, este servidor atiende
 * la PWA y la API desde un mismo origen (despliegue en un único servicio: la API vive
 * bajo /api/v1 y el resto de rutas cae al index.html de la SPA).
 */
const DIST_FRONTEND = localizarDistFrontend([
  process.env.FRONTEND_DIST,
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(__dirname, '../../../frontend/dist'),
  path.resolve(__dirname, '../../frontend/dist'),
]);

/** Rutas atendidas por el handler de la API (el resto es de la SPA cuando hay frontend). */
function esRutaApi(pathPart: string): boolean {
  const p = pathPart.toLowerCase();
  return p === '/health' || p === '/api/v1' || p.startsWith('/api/v1/');
}

function aplicarCors(req: http.IncomingMessage, res: http.ServerResponse): void {
  const origen = origenCorsPermitido(req.headers.origin, CORS_ORIGINS, ES_PRODUCCION);
  if (origen) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    if (origen !== '*') res.setHeader('Vary', 'Origin');
  } else {
    res.removeHeader('Access-Control-Allow-Origin');
  }
}

function servirEstatico(req: http.IncomingMessage, res: http.ServerResponse, pathPart: string): boolean {
  if (!DIST_FRONTEND || (req.method !== 'GET' && req.method !== 'HEAD')) return false;
  const archivo = resolverArchivoEstatico(DIST_FRONTEND, pathPart);
  if (!archivo) return false;
  res.statusCode = 200;
  res.setHeader('Content-Type', archivo.contentType);
  res.setHeader('Cache-Control', archivo.cacheControl);
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  fs.createReadStream(archivo.filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const [pathPart, queryPart] = (req.url || '/').split('?');

  // SPA: todo lo que no es API se sirve desde el frontend compilado.
  if (DIST_FRONTEND && !esRutaApi(pathPart)) {
    if (servirEstatico(req, res, pathPart)) return;
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Recurso no encontrado' }));
    return;
  }

  // Manejo de CORS (solo orígenes permitidos; el mismo origen no lo necesita)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key');
  aplicarCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const rawBody = Buffer.concat(chunks).toString('utf-8');

    const queryParams: Record<string, string> = queryPart
      ? Object.fromEntries(
          Array.from(new URLSearchParams(queryPart).entries()).filter(
            ([key]) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
          )
        )
      : {};

    const event: LambdaEvent = {
      rawPath: pathPart,
      rawQueryString: queryPart,
      queryStringParameters: queryParams,
      headers: req.headers as Record<string, string>,
      requestContext: {
        http: {
          method: req.method || 'GET',
          path: pathPart,
          protocol: req.httpVersion,
          sourceIp: req.socket.remoteAddress || '127.0.0.1',
          userAgent: req.headers['user-agent'] || '',
        },
      },
      body: rawBody.length > 0 ? rawBody : null,
    };

    try {
      const response = await handler(event);
      res.statusCode = response.statusCode;
      res.setHeader('Content-Type', 'application/json');
      if (response.headers) {
        for (const [key, value] of Object.entries(response.headers)) {
          res.setHeader(key, value);
        }
      }
      // El handler Lambda responde con CORS abierto; aquí se restringe de nuevo.
      aplicarCors(req, res);
      res.end(response.body);
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR', message: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 LIBREDSS escuchando en: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(
    DIST_FRONTEND
      ? `   Frontend: ${DIST_FRONTEND} (API en /api/v1)`
      : `   Frontend: no encontrado (solo API; use "npm run dev" en frontend)`
  );
  console.log(`======================================================\n`);
});
