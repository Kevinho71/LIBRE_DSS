# LIBREDSS — Plataforma DSS para Gestión de Inventarios

Sistema de Soporte a Decisiones (DSS) para la optimización de inventarios en micro y pequeñas empresas comerciales.

## Estructura del Monorepo (`npm workspaces`)

```text
LIBRE_DSS/
├── package.json          # Raíz con workspaces (shared, backend, frontend)
├── tsconfig.base.json    # Configuración TypeScript unificada
├── neon.ts               # Configuración Neon Cloud Postgres
├── COPYING               # Licencia GPLv3
├── .github/workflows/    # CI/CD Quality Gate (lint, typecheck, vitest)
├── shared/               # Tipos, contratos e interfaces compartidas
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── backend/              # API Serverless, Drizzle ORM y Motor DSS
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── src/
│   │   ├── db/           # Schema y migraciones SQL con RLS
│   │   ├── engine/       # Motor algorítmico DSS (plantillas)
│   │   └── index.ts      # Lambda Handler Function URL
│   └── tests/            # Runner de pruebas unitarias Vitest
└── frontend/             # PWA en React 18 + TypeScript + Vite
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    ├── src/              # Vistas, componentes y sync offline IndexedDB
    └── public/           # Manifest y Service Worker PWA
```

## Requisitos y Configuración

- **Node.js**: v20 o v22+
- **NPM**: v10+

### Instalación de dependencias

```bash
npm install
```

### Ejecutar Pruebas y Typecheck

```bash
npm run typecheck
npm run test
```

### Migraciones de Base de Datos (Neon PostgreSQL)

```bash
npm run --workspace=@libredss/backend db:generate
npm run --workspace=@libredss/backend db:migrate
```

## Licencia

Este proyecto está bajo los términos de la licencia GNU GPLv3. Consulte el archivo [COPYING](COPYING).
