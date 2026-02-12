-- 1. ASEGURAR EL ESQUEMA (LA SOLUCIÓN AL ERROR)
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

-- 2. Crear Extensiones (Necesaria para UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Crear Tipos Enumerados (Enums)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TripStatus') THEN
        CREATE TYPE "TripStatus" AS ENUM ('PLANNING', 'OPEN', 'SHOPPING', 'CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PURCHASED', 'PAID', 'DELIVERED');
    END IF;
END $$;

-- 4. Crear Tablas de Catálogo y Configuración Global
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "full_name" VARCHAR(100),
    "role" VARCHAR(20) DEFAULT 'CLIENT',
    "is_global_admin" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "clients" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "exchange_rates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "date" DATE UNIQUE NOT NULL,
    "rate_mxn" DECIMAL(10,2) NOT NULL,
    "source" VARCHAR(30),
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "product_fee_catalog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) UNIQUE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "exchange_rule_catalog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) UNIQUE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "product_types" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) UNIQUE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) UNIQUE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- 5. Crear Tablas de Viaje (Trips)
CREATE TABLE IF NOT EXISTS "trips" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "status" "TripStatus" DEFAULT 'PLANNING',
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "trip_exchange_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
    "catalog_id" UUID NOT NULL REFERENCES "exchange_rule_catalog"("id"),
    "name_snapshot" VARCHAR(100) NOT NULL,
    "value_added" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE("trip_id", "catalog_id")
);

CREATE TABLE IF NOT EXISTS "trip_product_fees" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
    "catalog_id" UUID NOT NULL REFERENCES "product_fee_catalog"("id"),
    "name_snapshot" VARCHAR(100) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE("trip_id", "catalog_id")
);

CREATE TABLE IF NOT EXISTS "trip_shipping_rates" (
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

-- 6. Productos
CREATE TABLE IF NOT EXISTS "products" (
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

CREATE TABLE IF NOT EXISTS "trip_products" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
    "product_id" UUID NOT NULL REFERENCES "products"("id"),
    "is_active" BOOLEAN DEFAULT true,
    "base_price_usd" DECIMAL(10,2),
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE("trip_id", "product_id")
);

-- 7. Pedidos, Pagos e Items
CREATE TABLE IF NOT EXISTS "orders" (
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

CREATE TABLE IF NOT EXISTS "order_payments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "amount_mxn" DECIMAL(14,2) NOT NULL,
    "method" VARCHAR(20) NOT NULL,
    "reference" VARCHAR(100),
    "paid_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "order_exchange_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "trip_exchange_rule_id" UUID REFERENCES "trip_exchange_rules"("id"),
    "name_snapshot" VARCHAR(100) NOT NULL,
    "value_added" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "order_items" (
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

CREATE TABLE IF NOT EXISTS "order_item_product_fees" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_item_id" UUID NOT NULL REFERENCES "order_items"("id") ON DELETE CASCADE,
    "trip_product_fee_id" UUID REFERENCES "trip_product_fees"("id"),
    "name_snapshot" VARCHAR(100) NOT NULL,
    "percentage_used" DECIMAL(5,2) NOT NULL,
    "amount_usd" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- 8. Gastos
CREATE TABLE IF NOT EXISTS "trip_expenses" (
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

-- 9. Índices
CREATE INDEX IF NOT EXISTS "idx_clients_user_id" ON "clients"("user_id");
CREATE INDEX IF NOT EXISTS "idx_trip_exchange_rules_trip_id" ON "trip_exchange_rules"("trip_id");
CREATE INDEX IF NOT EXISTS "idx_trip_product_fees_trip_id" ON "trip_product_fees"("trip_id");
CREATE INDEX IF NOT EXISTS "idx_trip_shipping_rates_trip_id" ON "trip_shipping_rates"("trip_id");
CREATE INDEX IF NOT EXISTS "idx_trip_products_trip_id" ON "trip_products"("trip_id");
CREATE INDEX IF NOT EXISTS "idx_products_product_type_id" ON "products"("product_type_id");
CREATE INDEX IF NOT EXISTS "idx_orders_trip_status" ON "orders"("trip_id", "status");
CREATE INDEX IF NOT EXISTS "idx_orders_client_id" ON "orders"("client_id");
CREATE INDEX IF NOT EXISTS "idx_order_payments_order_id" ON "order_payments"("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_exchange_rules_order_id" ON "order_exchange_rules"("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items"("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_item_fees_item_id" ON "order_item_product_fees"("order_item_id");
CREATE INDEX IF NOT EXISTS "idx_trip_expenses_trip_id" ON "trip_expenses"("trip_id");

-- PATCH SEGURO (no recrea tablas)

-- 1) Asegurar extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Índice para búsquedas por trip_product_id (performance)
CREATE INDEX IF NOT EXISTS "idx_order_items_trip_product_id"
ON "order_items" ("trip_product_id");
CREATE EXTENSION IF NOT EXISTS pgcrypto;


ALTER TABLE "trips"
ADD COLUMN IF NOT EXISTS "image_path" TEXT;


-- 1) Crear enum TripPhase si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TripPhase') THEN
    CREATE TYPE "TripPhase" AS ENUM ('PLANNING', 'OPEN', 'SHOPPING', 'CLOSED');
  END IF;
END $$;

-- 2) Si aún existe trips.status (enum viejo) y NO existe trips.phase, renombrar status -> phase
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trips' AND column_name='status'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trips' AND column_name='phase'
  ) THEN
    ALTER TABLE "trips" RENAME COLUMN "status" TO "phase";
  END IF;
END $$;

-- 3) Quitar DEFAULT de phase (para poder cambiar el tipo sin error)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trips' AND column_name='phase'
  ) THEN
    ALTER TABLE "trips" ALTER COLUMN "phase" DROP DEFAULT;
  END IF;
END $$;

-- 4) Cambiar el tipo de phase a TripPhase (con cast via text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trips' AND column_name='phase'
  ) THEN
    ALTER TABLE "trips"
      ALTER COLUMN "phase" TYPE "TripPhase"
      USING ("phase"::text::"TripPhase");
  END IF;
END $$;

-- 5) Volver a poner DEFAULT a phase
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trips' AND column_name='phase'
  ) THEN
    ALTER TABLE "trips" ALTER COLUMN "phase" SET DEFAULT 'PLANNING';
  END IF;
END $$;

-- 6) Agregar columna status (ACTIVE/INACTIVE) si no existe
ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- 7) Agregar image_path si no existe
ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "image_path" TEXT;


ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "google_id" VARCHAR(255);

-- Si quieres que sea único (recomendado para Google login):
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname='public' AND indexname='users_google_id_key'
  ) THEN
    CREATE UNIQUE INDEX "users_google_id_key" ON "users" ("google_id");
  END IF;
END $$;


ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 0;


ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "phone" VARCHAR(30);


-- 1. Aseguramos los tipos de producto actualizados en español
T-- 1. Limpiamos y recreamos el catálogo maestro para evitar desajustes
TRUNCATE TABLE "product_types" RESTART IDENTITY CASCADE;

INSERT INTO "product_types" ("code", "name") VALUES
('KIDS_CLOTHING', 'Ropa de Niños (70)'),
('KIDS_SHOES', 'Calzado de Niños (150)'),
('CLOTHING_LIGHT', 'Ropa Ligera Adulto (80)'),
('CLOTHING_HEAVY', 'Ropa Pesada Adulto (180)'),
('SHOES_LIGHT', 'Calzado Ligero / Sandalias (120)'),
('SHOES_STANDARD', 'Calzado Adulto / Tenis (230)'),
('SHOES_HEAVY', 'Calzado Pesado / Botas (400)'),
('SHOES_WITH_BOX', 'Calzado con Caja Original (450)'),
('ACCESSORY_SMALL', 'Carteras y Accesorios (100)'),
('HANDBAG_SMALL', 'Bolsas Crossbody (200)'),
('HANDBAG_LARGE', 'Bolsas Grandes / Totes (350)'),
('PERFUME_100ML', 'Perfumes hasta 100ml (150)'),
('ELECTRONICS_SMALL', 'Electrónicos Pequeños (250)'),
('BEAUTY_HEALTH', 'Belleza y Salud (80)');

-- 2. Insertamos los costos de envío para tu viaje
INSERT INTO "trip_shipping_rates" ("trip_id", "product_type_id", "name_snapshot", "cost_mxn")
SELECT 
    t.id AS trip_id, 
    pt.id AS product_type_id, 
    pt.name AS name_snapshot,
    CASE pt.code
        WHEN 'KIDS_CLOTHING'    THEN 70.00
        WHEN 'CLOTHING_LIGHT'   THEN 80.00
        WHEN 'ACCESSORY_SMALL'  THEN 100.00
        WHEN 'HANDBAG_SMALL'    THEN 200.00
        WHEN 'KIDS_SHOES'       THEN 150.00
        WHEN 'CLOTHING_HEAVY'   THEN 180.00
        WHEN 'SHOES_LIGHT'      THEN 120.00
        WHEN 'SHOES_STANDARD'   THEN 230.00
        WHEN 'SHOES_HEAVY'      THEN 400.00
        WHEN 'SHOES_WITH_BOX'   THEN 450.00
        WHEN 'HANDBAG_LARGE'    THEN 350.00
        WHEN 'PERFUME_100ML'    THEN 150.00
        WHEN 'ELECTRONICS_SMALL' THEN 250.00
        WHEN 'BEAUTY_HEALTH'    THEN 80.00
        ELSE 0.00 -- Esto evita que el valor sea NULL si falta alguno
    END AS cost_mxn
FROM "trips" t
CROSS JOIN "product_types" pt
WHERE t.id = (SELECT id FROM "trips" LIMIT 1)
ON CONFLICT ("trip_id", "product_type_id") DO UPDATE 
SET cost_mxn = EXCLUDED.cost_mxn, name_snapshot = EXCLUDED.name_snapshot;


-- 1. POBLAR CATÁLOGOS (Solo si no tienen datos)
INSERT INTO "product_fee_catalog" ("code", "name") VALUES
('SALES_TAX', 'Impuesto de Venta (USA Tax)'),
('IMPORT_TAX', 'Impuesto de Importación (Aduana)'),
('SERVICE_COMMISSION', 'Comisión Personal Shopper')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "exchange_rule_catalog" ("code", "name") VALUES
('USD_SPREAD', 'Margen de Protección Dólar')
ON CONFLICT ("code") DO NOTHING;

-- 2. APLICAR PORCENTAJES AL VIAJE (6%, 19%, 20%)
INSERT INTO "trip_product_fees" ("trip_id", "catalog_id", "name_snapshot", "percentage")
SELECT 
    t.id AS trip_id, 
    pfc.id AS catalog_id, 
    pfc.name AS name_snapshot,
    CASE pfc.code
        WHEN 'SALES_TAX'          THEN 6.00  -- Tax de Maryland
        WHEN 'IMPORT_TAX'         THEN 19.00 -- Importación México
        WHEN 'SERVICE_COMMISSION' THEN 20.00 -- Tu ganancia (20%)
    END AS percentage
FROM "trips" t
CROSS JOIN "product_fee_catalog" pfc
WHERE t.id = (SELECT id FROM "trips" LIMIT 1)
ON CONFLICT ("trip_id", "catalog_id") DO UPDATE 
SET percentage = EXCLUDED.percentage, name_snapshot = EXCLUDED.name_snapshot;

-- 3. APLICAR MARGEN DE DIVISA ($0.60)
INSERT INTO "trip_exchange_rules" ("trip_id", "catalog_id", "name_snapshot", "value_added")
SELECT 
    t.id AS trip_id, 
    erc.id AS catalog_id, 
    erc.name AS name_snapshot,
    0.60 -- Tu margen de ganancia y protección por dólar
FROM "trips" t
CROSS JOIN "exchange_rule_catalog" erc
WHERE t.id = (SELECT id FROM "trips" LIMIT 1)
ON CONFLICT ("trip_id", "catalog_id") DO UPDATE 
SET value_added = EXCLUDED.value_added, name_snapshot = EXCLUDED.name_snapshot;