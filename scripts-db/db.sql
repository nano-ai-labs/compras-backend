-- 1. Crear Extensiones (Necesaria para UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear Tipos Enumerados (Enums)
CREATE TYPE "TripStatus" AS ENUM ('PLANNING', 'OPEN', 'SHOPPING', 'CLOSED');
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PURCHASED', 'PAID', 'DELIVERED');

-- 3. Crear Tablas de Catálogo y Configuración Global
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "full_name" VARCHAR(100),
  "role" VARCHAR(20) DEFAULT 'CLIENT',
  "is_global_admin" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "clients" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "exchange_rates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" DATE UNIQUE NOT NULL,
  "rate_mxn" DECIMAL(10,2) NOT NULL,
  "source" VARCHAR(30),
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "product_fee_catalog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "exchange_rule_catalog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "product_types" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "expense_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- 4. Crear Tablas de Viaje (Trips)
CREATE TABLE "trips" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "status" "TripStatus" DEFAULT 'PLANNING',
  "start_date" DATE,
  "end_date" DATE,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "trip_exchange_rules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "catalog_id" UUID NOT NULL REFERENCES "exchange_rule_catalog"("id"),
  "name_snapshot" VARCHAR(100) NOT NULL,
  "value_added" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE("trip_id", "catalog_id")
);

CREATE TABLE "trip_product_fees" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "catalog_id" UUID NOT NULL REFERENCES "product_fee_catalog"("id"),
  "name_snapshot" VARCHAR(100) NOT NULL,
  "percentage" DECIMAL(5,2) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE("trip_id", "catalog_id")
);

CREATE TABLE "trip_shipping_rates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "product_type_id" UUID NOT NULL REFERENCES "product_types"("id"),
  "name_snapshot" VARCHAR(100) NOT NULL,
  "cost_mxn" DECIMAL(12,2) NOT NULL,
  "enabled" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE("trip_id", "product_type_id")
);

-- 5. Productos
CREATE TABLE "products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "image_url" TEXT,
  "default_price_usd" DECIMAL(10,2),
  "default_category" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "product_type_id" UUID REFERENCES "product_types"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "trip_products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "product_id" UUID NOT NULL REFERENCES "products"("id"),
  "is_active" BOOLEAN DEFAULT true,
  "base_price_usd" DECIMAL(10,2),
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE("trip_id", "product_id")
);

-- 6. Pedidos, Pagos e Items
CREATE TABLE "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" UUID NOT NULL REFERENCES "trips"("id"),
  "client_id" UUID NOT NULL REFERENCES "clients"("id"),
  "status" "OrderStatus" DEFAULT 'DRAFT',
  "grand_total_mxn" DECIMAL(14,2) DEFAULT 0,
  "paid_total_mxn" DECIMAL(14,2) DEFAULT 0,
  "pricing_locked_at" TIMESTAMP,
  "exchange_rate_date" DATE,
  "exchange_rate_base" DECIMAL(10,2),
  "exchange_rate_add" DECIMAL(10,2) DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE("trip_id", "client_id")
);

CREATE TABLE "order_payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "amount_mxn" DECIMAL(14,2) NOT NULL,
  "method" VARCHAR(20) NOT NULL,
  "reference" VARCHAR(100),
  "paid_at" TIMESTAMP(6) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "order_exchange_rules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "trip_exchange_rule_id" UUID REFERENCES "trip_exchange_rules"("id"),
  "name_snapshot" VARCHAR(100) NOT NULL,
  "value_added" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "trip_product_id" UUID REFERENCES "trip_products"("id"),
  "product_id" UUID REFERENCES "products"("id"),
  "quantity" INTEGER DEFAULT 1,
  "product_name" VARCHAR(255) NOT NULL,
  "base_price_usd" DECIMAL(10,2) NOT NULL,
  "product_type_id" UUID REFERENCES "product_types"("id"),
  "product_type_snapshot" VARCHAR(100),
  "shipping_cost_mxn" DECIMAL(12,2) DEFAULT 0,
  "final_price_mxn" DECIMAL(14,2) DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "order_item_product_fees" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_item_id" UUID NOT NULL REFERENCES "order_items"("id") ON DELETE CASCADE,
  "trip_product_fee_id" UUID REFERENCES "trip_product_fees"("id"),
  "name_snapshot" VARCHAR(100) NOT NULL,
  "percentage_used" DECIMAL(5,2) NOT NULL,
  "amount_usd" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- 7. Gastos
CREATE TABLE "trip_expenses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "category_id" UUID NOT NULL REFERENCES "expense_categories"("id"),
  "currency" VARCHAR(3) DEFAULT 'MXN',
  "amount" DECIMAL(14,2) NOT NULL,
  "exchange_rate_base" DECIMAL(10,2),
  "amount_mxn" DECIMAL(14,2),
  "expense_date" TIMESTAMP(6) NOT NULL,
  "note" VARCHAR(500),
  "receipt_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- 8. Índices para Optimización
CREATE INDEX "idx_clients_user_id" ON "clients"("user_id");
CREATE INDEX "idx_trip_exchange_rules_trip_id" ON "trip_exchange_rules"("trip_id");
CREATE INDEX "idx_trip_product_fees_trip_id" ON "trip_product_fees"("trip_id");
CREATE INDEX "idx_trip_shipping_rates_trip_id" ON "trip_shipping_rates"("trip_id");
CREATE INDEX "idx_trip_products_trip_id" ON "trip_products"("trip_id");
CREATE INDEX "idx_products_product_type_id" ON "products"("product_type_id");
CREATE INDEX "idx_orders_trip_status" ON "orders"("trip_id", "status");
CREATE INDEX "idx_orders_client_id" ON "orders"("client_id");
CREATE INDEX "idx_order_payments_order_id" ON "order_payments"("order_id");
CREATE INDEX "idx_order_exchange_rules_order_id" ON "order_exchange_rules"("order_id");
CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id");
CREATE INDEX "idx_order_item_fees_item_id" ON "order_item_product_fees"("order_item_id");
CREATE INDEX "idx_trip_expenses_trip_id" ON "trip_expenses"("trip_id");