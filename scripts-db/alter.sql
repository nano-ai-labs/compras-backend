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



-- ============================================================
-- 1) BRANDS (catálogo maestro, sin duplicados)
-- ============================================================

INSERT INTO "brands" ("code", "name") VALUES

-- Deportes / Activo
('NIKE', 'Nike'),
('ADIDAS', 'Adidas'),
('PUMA', 'Puma'),
('UNDER_ARMOUR', 'Under Armour'),
('REEBOK', 'Reebok'),
('NEW_BALANCE', 'New Balance'),
('ASICS', 'Asics'),
('HOKA', 'Hoka'),
('ON_RUNNING', 'On Running'),
('CHAMPION', 'Champion'),
('GYMSHARK', 'Gymshark'),
('FILA', 'Fila'),
('SKECHERS', 'Skechers'),
('VANS', 'Vans'),
('CONVERSE', 'Converse'),
('COLUMBIA', 'Columbia'),
('THE_NORTH_FACE', 'The North Face'),
('PATAGONIA', 'Patagonia'),
('TIMBERLAND', 'Timberland'),
('JORDAN', 'Jordan'),

-- Moda casual / comercial
('LEVIS', 'Levi’s'),
('AMERICAN_EAGLE', 'American Eagle'),
('GAP', 'Gap'),
('BANANA_REPUBLIC', 'Banana Republic'),
('EXPRESS', 'Express'),
('ZARA', 'Zara'),
('H_AND_M', 'H&M'),
('FOREVER21', 'Forever 21'),
('URBAN_OUTFITTERS', 'Urban Outfitters'),
('NAUTICA', 'Nautica'),
('IZOD', 'Izod'),
('TOMMY_HILFIGER', 'Tommy Hilfiger'),
('CALVIN_KLEIN', 'Calvin Klein'),
('DKNY', 'DKNY'),
('LACOSTE', 'Lacoste'),
('RALPH_LAUREN', 'Ralph Lauren'),
('POLO_RALPH_LAUREN', 'Polo Ralph Lauren'),
('GUESS', 'Guess'),
('ARMANI_EXCHANGE', 'Armani Exchange'),

-- Premium / Designer accesible
('MICHAEL_KORS', 'Michael Kors'),
('KATE_SPADE', 'Kate Spade'),
('COACH', 'Coach'),
('TORY_BURCH', 'Tory Burch'),
('MARC_JACOBS', 'Marc Jacobs'),
('KARL_LAGERFELD', 'Karl Lagerfeld'),
('VINCE_CAMUTO', 'Vince Camuto'),
('STEVE_MADDEN', 'Steve Madden'),
('BETSEY_JOHNSON', 'Betsey Johnson'),
('TED_BAKER', 'Ted Baker'),
('FREE_PEOPLE', 'Free People'),
('LUCKY_BRAND', 'Lucky Brand'),
('BCBG', 'BCBG'),
('SAM_EDLEMAN', 'Sam Edelman'),
('COLE_HAAN', 'Cole Haan'),
('ALDO', 'Aldo'),
('CLARKS', 'Clarks'),
('UGG', 'UGG'),
('DR_MARTENS', 'Dr. Martens'),
('BIRKENSTOCK', 'Birkenstock'),

-- Lujo / Alta moda (hallazgos ocasionales off-price)
('GUCCI', 'Gucci'),
('PRADA', 'Prada'),
('BALENCIAGA', 'Balenciaga'),
('VERSACE', 'Versace'),
('DIOR', 'Dior'),
('GIVENCHY', 'Givenchy'),
('VALENTINO', 'Valentino'),
('BURBERRY', 'Burberry'),
('DOLCE_GABBANA', 'Dolce & Gabbana'),
('SAINT_LAURENT', 'Saint Laurent'),
('BALMAIN', 'Balmain'),
('ALEXANDER_MCQUEEN', 'Alexander McQueen'),
('MAISON_MARGIELA', 'Maison Margiela'),
('MOSCHINO', 'Moschino'),
('FENDI', 'Fendi'),
('CELINE', 'Celine'),
('CHLOE', 'Chloé'),
('BOTTEGA_VENETA', 'Bottega Veneta'),
('SALVATORE_FERRAGAMO', 'Salvatore Ferragamo'),
('HERMES', 'Hermès'),
('MIU_MIU', 'Miu Miu'),

-- Bolsas / Accesorios adicionales comunes
('DOONEY_BOURKE', 'Dooney & Bourke'),
('REBECCA_MINKOFF', 'Rebecca Minkoff'),
('FOSSIL', 'Fossil'),
('LONGCHAMP', 'Longchamp'),
('NINE_WEST', 'Nine West'),

-- Beauty / Skincare / Fragancias (muy común en TJ Maxx / Marshalls / Rack)
('CHANEL', 'Chanel'),
('DIOR_BEAUTY', 'Dior Beauty'),
('VERSACE_FRAGRANCES', 'Versace (Fragancias)'),
('JEAN_PAUL_GAULTIER', 'Jean Paul Gaultier'),
('YSL_BEAUTY', 'YSL Beauty'),
('TOM_FORD', 'Tom Ford'),
('GIORGIO_ARMANI', 'Giorgio Armani'),
('CAROLINA_HERRERA', 'Carolina Herrera'),
('LANCOME', 'Lancôme'),
('ESTEE_LAUDER', 'Estée Lauder'),
('CLINIQUE', 'Clinique'),
('MAC', 'MAC'),
('SHISEIDO', 'Shiseido'),
('CLARINS', 'Clarins'),
('KIEHLS', 'Kiehl’s'),
('THE_ORDINARY', 'The Ordinary'),
('OLAPLEX', 'Olaplex'),
('MOROCCANOIL', 'Moroccanoil')

ON CONFLICT ("code") DO NOTHING;

-- ============================================================
-- 2) COLORS (catálogo maestro)
-- ============================================================

INSERT INTO "colors" ("code", "name", "hex") VALUES
('BLACK', 'Negro', '#000000'),
('WHITE', 'Blanco', '#FFFFFF'),
('GRAY', 'Gris', '#808080'),
('SILVER', 'Plateado', '#C0C0C0'),
('GOLD', 'Dorado', '#D4AF37'),

('RED', 'Rojo', '#D32F2F'),
('PINK', 'Rosa', '#E91E63'),
('FUCHSIA', 'Fucsia', '#FF00FF'),
('PURPLE', 'Morado', '#7B1FA2'),
('LILAC', 'Lila', '#C8A2C8'),

('BLUE', 'Azul', '#1976D2'),
('NAVY', 'Azul marino', '#0B2A45'),
('SKY_BLUE', 'Azul cielo', '#87CEEB'),
('TEAL', 'Azul petróleo', '#006D77'),

('GREEN', 'Verde', '#2E7D32'),
('OLIVE', 'Verde olivo', '#556B2F'),
('MINT', 'Verde menta', '#98FF98'),

('YELLOW', 'Amarillo', '#FBC02D'),
('ORANGE', 'Naranja', '#FB8C00'),
('BROWN', 'Café', '#6D4C41'),
('BEIGE', 'Beige', '#DCC7AA'),
('CREAM', 'Crema', '#FFFDD0'),
('TAN', 'Camel', '#C19A6B'),

('DENIM', 'Mezclilla', NULL),
('MULTICOLOR', 'Multicolor', NULL),
('PRINT', 'Estampado', NULL),
('TRANSPARENT', 'Transparente', NULL)

ON CONFLICT ("code") DO NOTHING;

-- ============================================================
-- 3) PRODUCT VARIANTS (por tipo de producto)
-- ============================================================

WITH pt AS (
  SELECT id, code
  FROM "product_types"
)
INSERT INTO "product_variants" ("product_type_id", "code", "name")
SELECT pt.id, v.code, v.name
FROM pt
JOIN (
  -- KIDS_CLOTHING
  SELECT 'KIDS_CLOTHING'::text AS type_code, 'KIDS_CLOTHING_CLOTHING_BOY'::text AS code, 'Ropa niño'::text AS name UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_CLOTHING_GIRL', 'Ropa niña' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_SHORTS_BOY', 'Short niño' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_SHORTS_GIRL', 'Short niña' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_SWIM_BOY', 'Traje de baño niño' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_SWIM_GIRL', 'Traje de baño niña' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_PANTS_BOY', 'Pants niño' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_PANTS_GIRL', 'Pants niña' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_HOODIE_BOY', 'Sudadera niño' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_HOODIE_GIRL', 'Sudadera niña' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_DRESS_GIRL', 'Vestido niña' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_PAJAMAS_BOY', 'Pijama niño' UNION ALL
  SELECT 'KIDS_CLOTHING', 'KIDS_CLOTHING_PAJAMAS_GIRL', 'Pijama niña' UNION ALL

  -- KIDS_SHOES
  SELECT 'KIDS_SHOES', 'KIDS_SHOES_SNEAKERS_BOY', 'Tenis niño' UNION ALL
  SELECT 'KIDS_SHOES', 'KIDS_SHOES_SNEAKERS_GIRL', 'Tenis niña' UNION ALL
  SELECT 'KIDS_SHOES', 'KIDS_SHOES_SANDALS_BOY', 'Sandalia niño' UNION ALL
  SELECT 'KIDS_SHOES', 'KIDS_SHOES_SANDALS_GIRL', 'Sandalia niña' UNION ALL
  SELECT 'KIDS_SHOES', 'KIDS_SHOES_BOOTS_BOY', 'Bota niño' UNION ALL
  SELECT 'KIDS_SHOES', 'KIDS_SHOES_BOOTS_GIRL', 'Bota niña' UNION ALL
  SELECT 'KIDS_SHOES', 'KIDS_SHOES_SCHOOL_BOY', 'Escolar niño' UNION ALL
  SELECT 'KIDS_SHOES', 'KIDS_SHOES_SCHOOL_GIRL', 'Escolar niña' UNION ALL

  -- CLOTHING_LIGHT
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_TSHIRT_MEN', 'Playera caballero' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_TSHIRT_WOMEN', 'Playera dama' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_BLOUSE_WOMEN', 'Blusa dama' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_SHIRT_MEN', 'Camisa caballero' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_SHORTS_MEN', 'Short caballero' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_SHORTS_WOMEN', 'Short dama' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_SWIM_MEN', 'Traje de baño caballero' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_SWIM_WOMEN', 'Traje de baño dama' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_PANTS_MEN', 'Pants caballero' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_PANTS_WOMEN', 'Pants dama' UNION ALL
  SELECT 'CLOTHING_LIGHT', 'CLOTHING_LIGHT_DRESS_WOMEN', 'Vestido dama' UNION ALL

  -- CLOTHING_HEAVY
  SELECT 'CLOTHING_HEAVY', 'CLOTHING_HEAVY_HOODIE_MEN', 'Sudadera caballero' UNION ALL
  SELECT 'CLOTHING_HEAVY', 'CLOTHING_HEAVY_HOODIE_WOMEN', 'Sudadera dama' UNION ALL
  SELECT 'CLOTHING_HEAVY', 'CLOTHING_HEAVY_JACKET_MEN', 'Chamarra caballero' UNION ALL
  SELECT 'CLOTHING_HEAVY', 'CLOTHING_HEAVY_JACKET_WOMEN', 'Chamarra dama' UNION ALL
  SELECT 'CLOTHING_HEAVY', 'CLOTHING_HEAVY_COAT_WOMEN', 'Abrigo dama' UNION ALL
  SELECT 'CLOTHING_HEAVY', 'CLOTHING_HEAVY_SWEATER_MEN', 'Suéter caballero' UNION ALL
  SELECT 'CLOTHING_HEAVY', 'CLOTHING_HEAVY_SWEATER_WOMEN', 'Suéter dama' UNION ALL

  -- SHOES_LIGHT
  SELECT 'SHOES_LIGHT', 'SHOES_LIGHT_SANDALS_MEN', 'Sandalia caballero' UNION ALL
  SELECT 'SHOES_LIGHT', 'SHOES_LIGHT_SANDALS_WOMEN', 'Sandalia dama' UNION ALL
  SELECT 'SHOES_LIGHT', 'SHOES_LIGHT_FLIPFLOPS_MEN', 'Chancla caballero' UNION ALL
  SELECT 'SHOES_LIGHT', 'SHOES_LIGHT_FLIPFLOPS_WOMEN', 'Chancla dama' UNION ALL
  SELECT 'SHOES_LIGHT', 'SHOES_LIGHT_SNEAKERS_MEN', 'Tenis ligero caballero' UNION ALL
  SELECT 'SHOES_LIGHT', 'SHOES_LIGHT_SNEAKERS_WOMEN', 'Tenis ligero dama' UNION ALL

  -- SHOES_STANDARD
  SELECT 'SHOES_STANDARD', 'SHOES_STANDARD_SNEAKERS_MEN', 'Tenis caballero' UNION ALL
  SELECT 'SHOES_STANDARD', 'SHOES_STANDARD_SNEAKERS_WOMEN', 'Tenis dama' UNION ALL
  SELECT 'SHOES_STANDARD', 'SHOES_STANDARD_DRESS_MEN', 'Zapato vestir caballero' UNION ALL
  SELECT 'SHOES_STANDARD', 'SHOES_STANDARD_DRESS_WOMEN', 'Zapato vestir dama' UNION ALL
  SELECT 'SHOES_STANDARD', 'SHOES_STANDARD_LOAFERS_MEN', 'Mocasín caballero' UNION ALL
  SELECT 'SHOES_STANDARD', 'SHOES_STANDARD_LOAFERS_WOMEN', 'Mocasín dama' UNION ALL

  -- SHOES_HEAVY
  SELECT 'SHOES_HEAVY', 'SHOES_HEAVY_BOOTS_MEN', 'Bota caballero' UNION ALL
  SELECT 'SHOES_HEAVY', 'SHOES_HEAVY_BOOTS_WOMEN', 'Bota dama' UNION ALL
  SELECT 'SHOES_HEAVY', 'SHOES_HEAVY_WORK', 'Bota trabajo' UNION ALL

  -- SHOES_WITH_BOX
  SELECT 'SHOES_WITH_BOX', 'SHOES_WITH_BOX_SNEAKERS_MEN', 'Tenis caballero con caja' UNION ALL
  SELECT 'SHOES_WITH_BOX', 'SHOES_WITH_BOX_SNEAKERS_WOMEN', 'Tenis dama con caja' UNION ALL
  SELECT 'SHOES_WITH_BOX', 'SHOES_WITH_BOX_DRESS_MEN', 'Zapato caballero con caja' UNION ALL

  -- ACCESSORY_SMALL
  SELECT 'ACCESSORY_SMALL', 'ACCESSORY_SMALL_WALLET_WOMEN', 'Cartera dama' UNION ALL
  SELECT 'ACCESSORY_SMALL', 'ACCESSORY_SMALL_WALLET_MEN', 'Cartera caballero' UNION ALL
  SELECT 'ACCESSORY_SMALL', 'ACCESSORY_SMALL_CARDHOLDER', 'Tarjetero' UNION ALL
  SELECT 'ACCESSORY_SMALL', 'ACCESSORY_SMALL_BELT_MEN', 'Cinturón caballero' UNION ALL
  SELECT 'ACCESSORY_SMALL', 'ACCESSORY_SMALL_BELT_WOMEN', 'Cinturón dama' UNION ALL
  SELECT 'ACCESSORY_SMALL', 'ACCESSORY_SMALL_SUNGLASSES', 'Lentes' UNION ALL
  SELECT 'ACCESSORY_SMALL', 'ACCESSORY_SMALL_CAP', 'Gorra' UNION ALL
  SELECT 'ACCESSORY_SMALL', 'ACCESSORY_SMALL_POUCH', 'Cosmetiquera' UNION ALL

  -- HANDBAG_SMALL
  SELECT 'HANDBAG_SMALL', 'HANDBAG_SMALL_CROSSBODY_WOMEN', 'Crossbody dama' UNION ALL
  SELECT 'HANDBAG_SMALL', 'HANDBAG_SMALL_MINI_BAG', 'Mini bag' UNION ALL
  SELECT 'HANDBAG_SMALL', 'HANDBAG_SMALL_CLUTCH_WOMEN', 'Clutch dama' UNION ALL
  SELECT 'HANDBAG_SMALL', 'HANDBAG_SMALL_PHONE_BAG', 'Bolsa celular' UNION ALL

  -- HANDBAG_LARGE
  SELECT 'HANDBAG_LARGE', 'HANDBAG_LARGE_TOTE', 'Bolsa tote' UNION ALL
  SELECT 'HANDBAG_LARGE', 'HANDBAG_LARGE_LARGE_WOMEN', 'Bolsa grande dama' UNION ALL
  SELECT 'HANDBAG_LARGE', 'HANDBAG_LARGE_BACKPACK_WOMEN', 'Mochila dama' UNION ALL
  SELECT 'HANDBAG_LARGE', 'HANDBAG_LARGE_BACKPACK_MEN', 'Mochila caballero' UNION ALL

  -- PERFUME_100ML
  SELECT 'PERFUME_100ML', 'PERFUME_100ML_WOMEN', 'Perfume dama' UNION ALL
  SELECT 'PERFUME_100ML', 'PERFUME_100ML_MEN', 'Perfume caballero' UNION ALL
  SELECT 'PERFUME_100ML', 'PERFUME_100ML_UNISEX', 'Perfume unisex' UNION ALL
  SELECT 'PERFUME_100ML', 'PERFUME_100ML_SET', 'Set perfume' UNION ALL

  -- ELECTRONICS_SMALL
  SELECT 'ELECTRONICS_SMALL', 'ELECTRONICS_SMALL_HEADPHONES', 'Audífonos' UNION ALL
  SELECT 'ELECTRONICS_SMALL', 'ELECTRONICS_SMALL_SMARTWATCH', 'Smartwatch' UNION ALL
  SELECT 'ELECTRONICS_SMALL', 'ELECTRONICS_SMALL_CHARGER', 'Cargador' UNION ALL
  SELECT 'ELECTRONICS_SMALL', 'ELECTRONICS_SMALL_POWERBANK', 'Powerbank' UNION ALL
  SELECT 'ELECTRONICS_SMALL', 'ELECTRONICS_SMALL_SPEAKER', 'Bocina pequeña' UNION ALL
  SELECT 'ELECTRONICS_SMALL', 'ELECTRONICS_SMALL_STREAMING', 'Streaming stick' UNION ALL

  -- BEAUTY_HEALTH
  SELECT 'BEAUTY_HEALTH', 'BEAUTY_HEALTH_SKINCARE', 'Skincare' UNION ALL
  SELECT 'BEAUTY_HEALTH', 'BEAUTY_HEALTH_MAKEUP', 'Maquillaje' UNION ALL
  SELECT 'BEAUTY_HEALTH', 'BEAUTY_HEALTH_HAIRCARE', 'Cuidado cabello' UNION ALL
  SELECT 'BEAUTY_HEALTH', 'BEAUTY_HEALTH_PERSONAL_CARE', 'Cuidado personal' UNION ALL
  SELECT 'BEAUTY_HEALTH', 'BEAUTY_HEALTH_TOOLS', 'Herramienta belleza'
) v
ON v.type_code = pt.code
ON CONFLICT ("product_type_id", "code") DO NOTHING;
