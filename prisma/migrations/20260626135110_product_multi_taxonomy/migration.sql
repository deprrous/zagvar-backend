/*
  Migration: products gain many-to-many categories & subcategories.

  The previous singular `category_id` / `subcategory_id` columns are replaced by
  Prisma implicit join tables. Existing associations are copied into the join
  tables BEFORE the old columns are dropped, so no data is lost. Each product's
  former subcategory's parent category is also linked, matching the new
  invariant that a product is always discoverable under a subcategory's parent.
*/

-- CreateTable
CREATE TABLE "_ProductCategories" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ProductCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProductSubcategories" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ProductSubcategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProductCategories_B_index" ON "_ProductCategories"("B");

-- CreateIndex
CREATE INDEX "_ProductSubcategories_B_index" ON "_ProductSubcategories"("B");

-- Backfill: copy existing product -> category links (A = category, B = product).
INSERT INTO "_ProductCategories" ("A", "B")
SELECT "category_id", "id" FROM "products" WHERE "category_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill: copy existing product -> subcategory links (A = product, B = subcategory).
INSERT INTO "_ProductSubcategories" ("A", "B")
SELECT "id", "subcategory_id" FROM "products" WHERE "subcategory_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill: ensure each former subcategory's parent category is linked too.
INSERT INTO "_ProductCategories" ("A", "B")
SELECT s."category_id", p."id"
FROM "products" p
JOIN "subcategories" s ON s."id" = p."subcategory_id"
WHERE p."subcategory_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- AddForeignKey
ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductSubcategories" ADD CONSTRAINT "_ProductSubcategories_A_fkey" FOREIGN KEY ("A") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductSubcategories" ADD CONSTRAINT "_ProductSubcategories_B_fkey" FOREIGN KEY ("B") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_subcategory_id_fkey";

-- DropIndex
DROP INDEX "products_category_id_idx";

-- DropIndex
DROP INDEX "products_subcategory_id_idx";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "category_id",
DROP COLUMN "subcategory_id";
