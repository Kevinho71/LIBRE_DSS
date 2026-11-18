# Despliegue en Railway (API + PWA en un servicio) con Neon

Entorno de pruebas con usuarios. La arquitectura objetivo del documento de grado sigue siendo AWS (S3 + CloudFront + Lambda); este despliegue reutiliza el mismo código con `backend/src/server.ts`.

## Cómo funciona

- Un solo contenedor (`Dockerfile` en la raíz) sirve la PWA (`frontend/dist`) y la API.
- La API vive bajo `/api/v1` (mismo origen, sin CORS). Cualquier otra ruta cae al `index.html` de la SPA.
- `/health` responde 200 (healthcheck de Railway).
- Al arrancar ejecuta las migraciones idempotentes (`db/migrate.js`) y luego el servidor.

## Pasos

1. **Neon:** usar la base existente (o crear otra para pruebas) y copiar la cadena de conexión con pooling.
2. **Railway:** `New Project` → `Deploy from GitHub repo` → este repositorio. Railway detecta `railway.json` y construye el `Dockerfile`.
3. **Variables del servicio** (pestaña Variables):

| Variable | Valor | Obligatoria |
|:---|:---|:---|
| `DATABASE_URL` | Cadena de Neon | Sí |
| `JWT_SECRET` | Texto aleatorio de 32+ caracteres (`openssl rand -hex 32`) | Sí (el arranque falla sin ella en producción) |
| `GEMINI_API_KEY` | Clave de Google AI Studio | Para ingesta IA y explicaciones |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | No (valor por defecto) |
| `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credenciales del bucket de fotos | Para fotos del cuaderno |
| `S3_ENDPOINT` | Endpoint S3-compatible (R2, Railway Bucket) | Solo si el bucket no es de AWS |
| `CORS_ORIGINS` | Vacío (mismo origen) | No |
| `NODE_ENV` | `production` (ya lo fija el Dockerfile) | No |

`PORT` lo inyecta Railway.

4. **Dominio:** `Settings → Networking → Generate Domain`. Esa URL es la que se abre en el celular.
5. **Fotos:** el navegador sube la imagen por URL prefirmada directo al bucket: configurar en el bucket CORS con `PUT` permitido desde el dominio de Railway y cabecera `Content-Type`.

## Probar en local la imagen

```bash
docker build -t libredss:local .
docker run --rm -p 3001:3001 \
  -e DATABASE_URL=postgresql://... -e JWT_SECRET=un-secreto-largo-de-prueba \
  libredss:local
# http://localhost:3001  (PWA)   http://localhost:3001/health  (API)
```

## Prueba de humo desde un celular real

1. Abrir la URL de Railway en Chrome/Safari móvil. Registrar una cuenta (entra directo al dashboard).
2. Crear un producto (nombre, precio, costo y stock).
3. Vender: buscar, tocar el resultado, `+`, `Registrar venta`.
4. Activar modo avión, registrar otra venta (queda en cola) y volver a conectar: se sincroniza sola.
5. Abrir `Qué pedir` y verificar que aparecen recomendaciones.
6. `Más → Ingesta IA → Tomar foto`: la cámara trasera se abre directo.
7. `Instalar app` / `Agregar a pantalla de inicio`: debe aparecer el icono.

## Presupuesto de toques (diseño; medir en la prueba real)

Toques sin contar el tecleo ni el obturador de la cámara, con el flujo actual:

| Tarea | Toques mínimos | Meta |
|:--|:--|:--|
| T1 Crear cuenta | 6 (4 campos, casilla de términos, botón) | ≤ 12 |
| T2 Crear producto | 7 (Productos, Nuevo, 4 campos, Registrar) | ≤ 10 |
| T3 Vender 3 unidades | 6 (Vender, buscador, resultado, `+`, `+`, Registrar) | ≤ 6 |
| T4 Qué pedir | 1 (pestaña `Qué pedir`) | ≤ 4 |
| T5 Foto del cuaderno | por medir | ≤ 8 |

## Límites conocidos

- La imagen Docker no incluye ni ejecuta el CD de AWS (`.github/workflows/cd.yml` se conserva aparte).
- Las rutas de la API sin el prefijo `/api/v1` solo funcionan en desarrollo local (`npm run dev`).
