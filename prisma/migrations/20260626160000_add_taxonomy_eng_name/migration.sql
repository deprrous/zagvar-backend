-- AlterTable: English display names for categories/subcategories (nullable).
ALTER TABLE "categories" ADD COLUMN "eng_name" VARCHAR;
ALTER TABLE "subcategories" ADD COLUMN "eng_name" VARCHAR;
