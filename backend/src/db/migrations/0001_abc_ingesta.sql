-- Migración 0001: Motor ABC e Ingesta IA (Épica LIB-4 / Sprint 3)
-- Plataforma DSS (LIBREDSS)
-- 1) Columnas de clasificación ABC y correlación de job en parametros_calculo
-- 2) Tabla ingesta para el flujo de validación Human-in-the-Loop

-- 1. Nuevas columnas en parametros_calculo (idempotente)
ALTER TABLE "parametros_calculo"
  ADD COLUMN IF NOT EXISTS "job_id" uuid,
  ADD COLUMN IF NOT EXISTS "demanda_anual" numeric(14, 2),
  ADD COLUMN IF NOT EXISTS "valor_consumo_anual" numeric(14, 2),
  ADD COLUMN IF NOT EXISTS "porcentaje_valor" numeric(6, 2),
  ADD COLUMN IF NOT EXISTS "porcentaje_acumulado" numeric(6, 2);

-- 2. Tabla: Ingesta (estado de extracción IA para Human-in-the-Loop)
CREATE TABLE IF NOT EXISTS "ingesta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL REFERENCES "empresa"("id") ON DELETE CASCADE,
	"s3_key" varchar(512) NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"fecha_evento" date,
	"items" jsonb,
	"llave_idempotencia" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ingesta_idemp_idx" UNIQUE ("empresa_id", "llave_idempotencia")
);

-- 3. Row-Level Security para ingesta
ALTER TABLE "ingesta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ingesta" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_ingesta" ON "ingesta";
CREATE POLICY "tenant_isolation_ingesta" ON "ingesta"
	FOR ALL
	USING ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid)
	WITH CHECK ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid);

GRANT ALL PRIVILEGES ON TABLE "ingesta" TO libredss_app;
