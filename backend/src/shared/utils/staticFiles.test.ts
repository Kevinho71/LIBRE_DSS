import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { localizarDistFrontend, resolverArchivoEstatico, origenCorsPermitido } from './staticFiles';

let dist: string;

beforeAll(() => {
  dist = fs.mkdtempSync(path.join(os.tmpdir(), 'libredss-dist-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<html></html>');
  fs.writeFileSync(path.join(dist, 'sw.js'), '//sw');
  fs.writeFileSync(path.join(dist, 'assets', 'app-abc123.js'), '//js');
});

afterAll(() => {
  fs.rmSync(dist, { recursive: true, force: true });
});

describe('resolverArchivoEstatico', () => {
  it('sirve index.html para la raíz y para rutas del router (fallback SPA)', () => {
    expect(resolverArchivoEstatico(dist, '/')?.filePath).toBe(path.join(dist, 'index.html'));
    expect(resolverArchivoEstatico(dist, '/transacciones/venta')?.contentType).toContain('text/html');
  });

  it('sirve activos con hash como inmutables y sw.js sin caché', () => {
    const asset = resolverArchivoEstatico(dist, '/assets/app-abc123.js');
    expect(asset?.cacheControl).toContain('immutable');
    expect(asset?.contentType).toContain('javascript');
    expect(resolverArchivoEstatico(dist, '/sw.js')?.cacheControl).toBe('no-cache');
  });

  it('devuelve null para archivos con extensión inexistente', () => {
    expect(resolverArchivoEstatico(dist, '/assets/no-existe.js')).toBeNull();
  });

  it('bloquea el recorrido de directorios y los caracteres nulos', () => {
    expect(resolverArchivoEstatico(dist, '/../package.json')).toBeNull();
    // Un recorrido sin extensión nunca sale de dist: termina en el fallback SPA.
    expect(resolverArchivoEstatico(dist, '/%2e%2e/%2e%2e/etc/passwd')?.filePath).toBe(path.join(dist, 'index.html'));
    expect(resolverArchivoEstatico(dist, '/%2e%2e/%2e%2e/etc/passwd.conf')).toBeNull();
    expect(resolverArchivoEstatico(dist, '/a%00.js')).toBeNull();
    expect(resolverArchivoEstatico(dist, '/%E0%A4%A')).toBeNull();
  });
});

describe('localizarDistFrontend', () => {
  it('elige el primer candidato con index.html', () => {
    expect(localizarDistFrontend([undefined, '/no/existe', dist])).toBe(path.resolve(dist));
    expect(localizarDistFrontend(['/no/existe'])).toBeNull();
  });
});

describe('origenCorsPermitido', () => {
  it('en producción solo acepta orígenes listados', () => {
    expect(origenCorsPermitido('https://app.example.com', ['https://app.example.com'], true)).toBe('https://app.example.com');
    expect(origenCorsPermitido('https://otro.com', ['https://app.example.com'], true)).toBeNull();
    expect(origenCorsPermitido('https://otro.com', [], true)).toBeNull();
  });

  it('sin cabecera Origin (mismo origen) no agrega CORS', () => {
    expect(origenCorsPermitido(undefined, [], true)).toBeNull();
  });

  it('en desarrollo refleja cualquier origen', () => {
    expect(origenCorsPermitido('http://localhost:3000', [], false)).toBe('http://localhost:3000');
  });
});
