import * as fs from 'fs';
import * as path from 'path';

/** Tipos MIME de los activos que genera `vite build`. */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

export interface ArchivoEstatico {
  filePath: string;
  contentType: string;
  cacheControl: string;
}

/** Devuelve el directorio con `index.html` del frontend compilado, o null si no existe. */
export function localizarDistFrontend(candidatos: Array<string | undefined>): string | null {
  for (const candidato of candidatos) {
    if (candidato && fs.existsSync(path.join(candidato, 'index.html'))) {
      return path.resolve(candidato);
    }
  }
  return null;
}

function esArchivo(ruta: string): boolean {
  try {
    return fs.statSync(ruta).isFile();
  } catch {
    return false;
  }
}

/**
 * Resuelve qué archivo servir para una ruta HTTP del frontend (SPA).
 * - Archivos existentes dentro de `distDir` se sirven tal cual.
 * - Rutas sin extensión (navegación del router) caen a `index.html`.
 * - Rutas con extensión que no existen devuelven null (404 real, no HTML).
 * - Cualquier intento de salir de `distDir` devuelve null.
 */
export function resolverArchivoEstatico(distDir: string, urlPath: string): ArchivoEstatico | null {
  let decodificada: string;
  try {
    decodificada = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decodificada.includes('\0')) return null;

  const raiz = path.resolve(distDir);
  const candidato = path.resolve(raiz, '.' + path.posix.normalize('/' + decodificada));
  if (candidato !== raiz && !candidato.startsWith(raiz + path.sep)) return null;

  let archivo: string | null = null;
  if (esArchivo(candidato)) {
    archivo = candidato;
  } else if (path.extname(decodificada) === '') {
    const index = path.join(raiz, 'index.html');
    archivo = esArchivo(index) ? index : null;
  }
  if (!archivo) return null;

  const relativo = path.relative(raiz, archivo).split(path.sep).join('/');
  const inmutable = relativo.startsWith('assets/');
  return {
    filePath: archivo,
    contentType: MIME_TYPES[path.extname(archivo).toLowerCase()] ?? 'application/octet-stream',
    // Los activos con hash son inmutables; index.html, sw.js y manifest deben revalidarse siempre.
    cacheControl: inmutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
}

/** Orígenes CORS permitidos a partir de CORS_ORIGINS (lista separada por comas). */
export function origenCorsPermitido(origin: string | undefined, permitidos: string[], esProduccion: boolean): string | null {
  if (!origin) return null;
  if (permitidos.includes('*')) return '*';
  if (permitidos.includes(origin)) return origin;
  // En desarrollo se permite cualquier origen (Vite en :3000, etc.).
  return esProduccion ? null : origin;
}
