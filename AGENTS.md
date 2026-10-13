# AGENTS.md — Manual del Agente (LIBREDSS)

Guía operativa para agentes de IA que trabajan en este repositorio. Léela completa antes de tocar cualquier archivo. Las reglas marcadas como **no negociables** hacen que un PR se rechace si se incumplen.

## 1. Qué es este proyecto

SaaS Serverless multiempresa para optimización de inventarios en MyPEs bolivianas (plataforma DSS). Monorepo `npm workspaces`:

- `shared/` — contratos y tipos compartidos (`@libredss/shared`), única fuente de tipos entre backend y frontend.
- `backend/` — API Lambda Function URL (Node.js 22 + TypeScript + Drizzle ORM + Neon PostgreSQL) + motor algorítmico DSS.
- `frontend/` — PWA React 18 + TypeScript + Vite (offline con IndexedDB + Service Worker).

## 2. Comandos canónicos

```bash
npm install                                  # raíz (instala workspaces)
npm run typecheck --workspace=backend
npm run typecheck --workspace=frontend
npm run test --workspace=backend             # Vitest; integración contra Neon si DATABASE_URL está definida
npm run test --workspace=frontend
npm run db:migrate --workspace=backend       # migraciones idempotentes (tabla de tracking schema_migrations)
npm run dev --workspace=frontend
```

No se commitea sin `typecheck` y `test` verdes.

## 3. Skills locales (cargar con la herramienta `skill` según el contexto)

| Contexto | Skills |
|:---|:---|
| Backend (servicios, handlers, migraciones, schema, lógica) | `backend-best-practices`, `postgresql`, `docker-local-db`, `vitest-unit-testing` |
| Frontend (UI, componentes, PWA, data fetching) | `vercel-react-best-practices`, `shadcn`, `ui-styling`, `ui-ux-pro-max`, `vitest-unit-testing` |
| Ramas/commits/PR | `gitflow-workflow` |
| CI/CD | `cicd-pipelines` |
| GitHub (PRs, issues) | `gh` |
| Añadir MCP/skill nueva | `agent-env-setup` |

## 4. Reglas de arquitectura backend (no negociables)

- **Capas estrictas**: `handler → service → repository → db`. Prohibido importar `db`/Drizzle en `handler` o `service`.
- **`engine/`**: funciones puras y determinísticas, sin DB, sin IO, sin framework.
- **Zod en todo borde** (body, query, path) antes de entrar al `service`.
- **Errores solo vía `AppError`** (subclases); `handler` jamás usa `try/catch`; `handleError` es el único formateador.
- **Multi-tenant**: `empresaId` proviene del JWT (`requireAuth`); RLS `FORCE` + `withTenant`; toda query filtra por `empresaId`.
- **Soft-delete** (`deletedAt`) en maestros; **idempotencia** en inventario/contable (`llave_idempotencia`).
- **Migraciones**: `schema.ts` es la fuente de verdad; el SQL de RLS se escribe a mano; commitear `schema.ts` + archivo `.sql` juntos; `db:migrate` debe ser idempotente.
- `strict: true`, sin `any` implícito, sin imports/variables muertas (CodeQL limpio).

## 5. Política de IA de bajo costo

- **Determinismo primero**: la IA jamás calcula ABC/EOQ/ROP/SS/P-Q; solo extrae (`no-estructurado → estructurado`) o genera texto corto.
- **Matcher por `pg_trgm`** (umbral 0.3); prohibido embeddings/vector stores.
- **Modelo lite por ID exacto** (`GEMINI_MODEL`, p. ej. `gemini-3.1-flash-lite`); prohibido `-latest` y modelos pesados en Lambda.
- **OCR/parseo local primero**; LLM solo para baja confianza; **fallback lite**; **HITL obligatorio**; **cache por hash de imagen**; **cuotas por tenant**; contabilidad de tokens/costo.

## 6. Flujo Git

- Rama `feat/<descripcion-kebab>` desde `development` (nunca `main`).
- Conventional Commits con scope: `feat(back): ...`, `feat(front): ...`, `fix(back): ...`, etc.
- PR contra `development`; CI (lint/typecheck/test/security/build) es bloqueante.

## 7. Definition of Done

- [ ] `typecheck` + `test` verdes en los workspaces afectados.
- [ ] Cobertura ≥85% en `src/engine/` y `src/modules/`.
- [ ] Toda tabla multiempresa nueva con test de aislamiento RLS.
- [ ] Operaciones idempotentes con test de repetición de llave.
- [ ] Migración commiteada (schema + SQL) y `db:migrate` idempotente.
- [ ] Errores vía `AppError`, logging estructurado, env tipado, CodeQL limpio.
