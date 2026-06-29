-- CreateTable
CREATE TABLE "likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "anon_id" VARCHAR NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "likes_anon_id_idx" ON "likes"("anon_id");

-- CreateIndex
CREATE INDEX "likes_product_id_idx" ON "likes"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_anon_id_product_id_key" ON "likes"("anon_id", "product_id");

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
