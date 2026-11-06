-- CreateEnum
CREATE TYPE "resource_type" AS ENUM ('BOOK', 'COURSE', 'VIDEO', 'ARTICLE', 'SHEET', 'OTHER');

-- CreateEnum
CREATE TYPE "resource_status" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'DROPPED');

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "track_id" UUID,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "type" "resource_type" NOT NULL,
    "url" TEXT,
    "unit_label" TEXT,
    "total_units" INTEGER,
    "completed_units" INTEGER NOT NULL DEFAULT 0,
    "status" "resource_status" NOT NULL DEFAULT 'PLANNED',
    "started_on" DATE,
    "finished_on" DATE,
    "rating" SMALLINT,
    "notes_md" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resources_user_id_status_idx" ON "resources"("user_id", "status");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Hand-written constraints (not expressible in schema.prisma) ───────────

ALTER TABLE "resources"
  ADD CONSTRAINT "resources_title_check" CHECK (length(btrim("title")) > 0),
  ADD CONSTRAINT "resources_units_check" CHECK (
    "completed_units" >= 0
    AND ("total_units" IS NULL OR ("total_units" > 0 AND "completed_units" <= "total_units"))
  ),
  -- Started once it leaves PLANNED; DONE needs a finish date.
  ADD CONSTRAINT "resources_started_on_check"
    CHECK ("status" = 'PLANNED' OR "started_on" IS NOT NULL),
  ADD CONSTRAINT "resources_finished_on_check"
    CHECK ("status" <> 'DONE' OR "finished_on" IS NOT NULL),
  ADD CONSTRAINT "resources_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);
