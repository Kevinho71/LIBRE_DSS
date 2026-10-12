-- Migración inicial: Creación de tablas, índices y políticas Row-Level Security (RLS)
-- Plataforma DSS (LIBREDSS)

-- Habilitar extensión para coincidencia difusa (trigramas)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Tabla: Empresa (Tenant)
CREATE TABLE IF NOT EXISTS "empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"nit" varchar(50),
	"plan" varchar(20) DEFAULT 'gratuito' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- 2. Tabla: Usuario
CREATE TABLE IF NOT EXISTS "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL REFERENCES "empresa"("id") ON DELETE CASCADE,
	"nombre" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"password_hash" varchar(255) NOT NULL,
	"rol" varchar(50) DEFAULT 'operador' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 3. Tabla: Producto
CREATE TABLE IF NOT EXISTS "producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL REFERENCES "empresa"("id") ON DELETE CASCADE,
	"sku" varchar(100),
	"nombre" varchar(255) NOT NULL,
	"unidad_medida" varchar(50) DEFAULT 'unidad' NOT NULL,
	"unidad_compra" varchar(50),
	"factor_conversion" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"costo_unitario" numeric(12, 2) NOT NULL,
	"precio_venta" numeric(12, 2) NOT NULL,
	"costo_pedido" numeric(12, 2) DEFAULT '50.00' NOT NULL,
	"tasa_mantenimiento_anual" numeric(5, 4) DEFAULT '0.2000' NOT NULL,
	"stock_actual" numeric(12, 2) DEFAULT '0' NOT NULL,
	"stock_minimo_manual" numeric(12, 2),
	"stock_maximo_manual" numeric(12, 2),
	"origen_dato" varchar(50) DEFAULT 'manual' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- 4. Tabla: Proveedor
CREATE TABLE IF NOT EXISTS "proveedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL REFERENCES "empresa"("id") ON DELETE CASCADE,
	"nombre" varchar(255) NOT NULL,
	"contacto" varchar(255),
	"telefono" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 5. Tabla: ProductoProveedor
CREATE TABLE IF NOT EXISTS "producto_proveedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL REFERENCES "empresa"("id") ON DELETE CASCADE,
	"producto_id" uuid NOT NULL REFERENCES "producto"("id") ON DELETE CASCADE,
	"proveedor_id" uuid NOT NULL REFERENCES "proveedor"("id") ON DELETE CASCADE,
	"codigo_proveedor" varchar(100),
	"costo_compra" numeric(12, 2),
	"lead_time_dias" integer DEFAULT 3 NOT NULL,
	"costo_pedido" numeric(12, 2) DEFAULT '50.00' NOT NULL,
	"lote_minimo" numeric(12, 2) DEFAULT '1' NOT NULL,
	"es_principal" boolean DEFAULT true NOT NULL
);

-- 6. Tabla: Transaccion
CREATE TABLE IF NOT EXISTS "transaccion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL REFERENCES "empresa"("id") ON DELETE CASCADE,
	"nota_id" uuid,
	"producto_id" uuid NOT NULL REFERENCES "producto"("id") ON DELETE CASCADE,
	"tipo" varchar(50) NOT NULL,
	"cantidad" numeric(12, 2) NOT NULL,
	"costo_unitario_historico" numeric(12, 2) NOT NULL,
	"precio_venta_historico" numeric(12, 2),
	"motivo" varchar(255),
	"estado_pago" varchar(30) DEFAULT 'contado' NOT NULL,
	"llave_idempotencia" varchar(64),
	"fecha_evento" date NOT NULL,
	"fecha_registro" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transaccion_idemp_idx" UNIQUE ("empresa_id", "llave_idempotencia")
);

-- 7. Tabla: OrdenCompra
CREATE TABLE IF NOT EXISTS "orden_compra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL REFERENCES "empresa"("id") ON DELETE CASCADE,
	"producto_id" uuid NOT NULL REFERENCES "producto"("id") ON DELETE CASCADE,
	"proveedor_id" uuid NOT NULL REFERENCES "proveedor"("id") ON DELETE RESTRICT,
	"cantidad_pedida" numeric(12, 2) NOT NULL,
	"estado" varchar(50) DEFAULT 'en_transito' NOT NULL,
	"fecha_emision" date NOT NULL,
	"fecha_entrega_estimada" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 8. Tabla: ParametrosCalculo
CREATE TABLE IF NOT EXISTS "parametros_calculo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL REFERENCES "empresa"("id") ON DELETE CASCADE,
	"producto_id" uuid NOT NULL REFERENCES "producto"("id") ON DELETE CASCADE,
	"categoria_abc" varchar(1),
	"politica" varchar(1) DEFAULT 'Q' NOT NULL,
	"demanda_promedio_diaria" numeric(10, 4),
	"desviacion_estandar_diaria" numeric(10, 4),
	"dias_historial" integer DEFAULT 0 NOT NULL,
	"dias_con_venta" integer DEFAULT 0 NOT NULL,
	"fase_arranque" integer DEFAULT 1 NOT NULL,
	"eoq_calculado" numeric(12, 2),
	"rop_calculado" numeric(12, 2),
	"stock_seguridad_calculado" numeric(12, 2),
	"intervalo_revision_dias" integer,
	"nivel_objetivo_t" numeric(12, 2),
	"es_vigente" boolean DEFAULT true NOT NULL,
	"fecha_calculo" timestamp DEFAULT now() NOT NULL
);

-- Índices de Trigramas para búsqueda difusa en catálogo
CREATE INDEX IF NOT EXISTS "idx_producto_nombre_trgm" ON "producto" USING gin ("nombre" gin_trgm_ops);

-- Configuración de Row-Level Security (RLS)
ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuario" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_usuario" ON "usuario"
	FOR ALL
	USING ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid)
	WITH CHECK ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid);

ALTER TABLE "producto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "producto" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_producto" ON "producto"
	FOR ALL
	USING ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid)
	WITH CHECK ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid);

ALTER TABLE "proveedor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proveedor" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_proveedor" ON "proveedor"
	FOR ALL
	USING ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid)
	WITH CHECK ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid);

ALTER TABLE "producto_proveedor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "producto_proveedor" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_producto_proveedor" ON "producto_proveedor"
	FOR ALL
	USING ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid)
	WITH CHECK ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid);

ALTER TABLE "transaccion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaccion" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_transaccion" ON "transaccion"
	FOR ALL
	USING ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid)
	WITH CHECK ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid);

ALTER TABLE "orden_compra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orden_compra" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_orden_compra" ON "orden_compra"
	FOR ALL
	USING ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid)
	WITH CHECK ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid);

ALTER TABLE "parametros_calculo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parametros_calculo" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_parametros_calculo" ON "parametros_calculo"
	FOR ALL
	USING ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid)
	WITH CHECK ("empresa_id" = NULLIF(current_setting('app.empresa_id', true), '')::uuid);
