-- Replace shop_admins.email / name with a `username` login identifier.

-- 1. Add the new column (nullable for now so we can backfill existing rows).
ALTER TABLE "shop_admins" ADD COLUMN "username" VARCHAR;

-- 2. Carry over the current email as the username so existing admins keep their login.
UPDATE "shop_admins" SET "username" = "email";

-- 3. Now that every row has a value, enforce NOT NULL + uniqueness.
ALTER TABLE "shop_admins" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "shop_admins_username_key" ON "shop_admins"("username");

-- 4. Drop the retired columns and their index.
DROP INDEX IF EXISTS "shop_admins_email_key";
ALTER TABLE "shop_admins" DROP COLUMN "email";
ALTER TABLE "shop_admins" DROP COLUMN "name";
