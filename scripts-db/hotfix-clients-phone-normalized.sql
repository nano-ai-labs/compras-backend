-- Agrega columna normalizada de teléfono para búsquedas rápidas por teléfono
-- Idempotente y seguro para producción

BEGIN;

ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "phone_normalized" VARCHAR(30);

UPDATE "clients"
SET "phone_normalized" = NULLIF(regexp_replace(COALESCE("phone", ''), '\D', '', 'g'), '')
WHERE "phone" IS NOT NULL
  AND (
    "phone_normalized" IS NULL
    OR "phone_normalized" = ''
  );

CREATE INDEX IF NOT EXISTS "idx_clients_phone_normalized"
  ON "clients" ("phone_normalized");

COMMIT;
