CREATE UNIQUE INDEX IF NOT EXISTS only_one_global_admin
ON public."User" ("isGlobalAdmin")
WHERE "isGlobalAdmin" = true;
