-- AlterTable
ALTER TABLE "categories" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Seed positions for existing rows so the current ordering stays stable,
-- following creation order (oldest first).
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at" ASC) - 1 AS rn
  FROM "categories"
)
UPDATE "categories" c
SET "position" = ordered.rn
FROM ordered
WHERE c."id" = ordered."id";
