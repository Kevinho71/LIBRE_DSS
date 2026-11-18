import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PUBLIC = path.resolve(__dirname, '../public');

interface IconoManifest {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

describe('PWA: manifiesto e iconos instalables', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'manifest.json'), 'utf-8')) as {
    icons: IconoManifest[];
    theme_color: string;
    display: string;
  };

  it('declara iconos PNG de 192 y 512 px, normales y maskable', () => {
    for (const size of ['192x192', '512x512']) {
      for (const purpose of ['any', 'maskable']) {
        expect(
          manifest.icons.some((i) => i.type === 'image/png' && i.sizes === size && i.purpose === purpose),
          `falta icono PNG ${size} ${purpose}`
        ).toBe(true);
      }
    }
  });

  it('todos los iconos declarados existen en public/', () => {
    for (const icono of manifest.icons) {
      expect(fs.existsSync(path.join(PUBLIC, icono.src.replace(/^\//, ''))), icono.src).toBe(true);
    }
  });

  it('es instalable: display standalone y theme_color', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#/);
  });

  it('el service worker no intercepta las rutas de la SPA ni cachea /api', () => {
    const sw = fs.readFileSync(path.join(PUBLIC, 'sw.js'), 'utf-8');
    expect(sw).toMatch(/RUTAS_API\s*=\s*\['\/api'\]/);
  });
});
