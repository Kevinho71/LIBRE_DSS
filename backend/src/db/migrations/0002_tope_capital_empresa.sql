-- Migración 0002: Tope de capital de pedido configurable por empresa
-- Plan de Simulación §4.3: dejar de usar la constante fija de 15.000 Bs y leerla por tenant.
-- Valor 0 desactiva el tope (PACHIPLAC compra por camiones completos: 6 o 12 paquetes).

ALTER TABLE "empresa"
  ADD COLUMN IF NOT EXISTS "tope_capital_pedido" numeric(12, 2) DEFAULT '15000.00' NOT NULL;
