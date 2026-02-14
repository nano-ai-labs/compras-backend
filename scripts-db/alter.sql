-- ============================================================
-- 0) Base: schema + extensiones
-- ============================================================
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

-- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1) NUEVAS TABLAS: brands, colors, product_variants
-- ============================================================

CREATE TABLE IF NOT EXISTS "brands" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "colors" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "hex" VARCHAR(10),
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_type_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "product_variants_type_code_key" UNIQUE ("product_type_id", "code")
);

-- ============================================================
-- 2) FK product_variants -> product_types
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_product_type_id_fkey'
  ) THEN
    ALTER TABLE "product_variants"
      ADD CONSTRAINT "product_variants_product_type_id_fkey"
      FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id")
      ON DELETE CASCADE;
  END IF;
END $$;

-- Índice para cargar variantes por tipo
CREATE INDEX IF NOT EXISTS "idx_product_variants_product_type_id"
ON "product_variants" ("product_type_id");

-- ============================================================
-- 3) ALTER TABLE products: agregar columnas
-- ============================================================

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "brand_id" UUID,
  ADD COLUMN IF NOT EXISTS "color_id" UUID,
  ADD COLUMN IF NOT EXISTS "product_variant_id" UUID;

-- ============================================================
-- 4) FKs en products
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_brand_id_fkey') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_brand_id_fkey"
      FOREIGN KEY ("brand_id") REFERENCES "brands"("id")
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_color_id_fkey') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_color_id_fkey"
      FOREIGN KEY ("color_id") REFERENCES "colors"("id")
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_product_variant_id_fkey') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_product_variant_id_fkey"
      FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 5) Índices en products para filtros
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_products_brand_id" ON "products" ("brand_id");
CREATE INDEX IF NOT EXISTS "idx_products_color_id" ON "products" ("color_id");
CREATE INDEX IF NOT EXISTS "idx_products_product_variant_id" ON "products" ("product_variant_id");

-- combinado típico
CREATE INDEX IF NOT EXISTS "idx_products_type_variant_brand_color"
ON "products" ("product_type_id", "product_variant_id", "brand_id", "color_id");

ALTER TABLE "products"
  ALTER COLUMN "brand_id" SET NOT NULL,
  ALTER COLUMN "color_id" SET NOT NULL,
  ALTER COLUMN "product_variant_id" SET NOT NULL;


ALTER TABLE "products"
  ALTER COLUMN "image_url" SET NOT NULL;

