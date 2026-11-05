-- CreateEnum
CREATE TYPE "time_entry_source" AS ENUM ('TIMER', 'MANUAL');

-- CreateTable
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_type_id" UUID NOT NULL,
    "track_id" UUID,
    "topic_id" UUID,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "source" "time_entry_source" NOT NULL DEFAULT 'TIMER',
    "note" TEXT,
    "focus_rating" SMALLINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_entries_user_id_started_at_idx" ON "time_entries"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "time_entries_track_id_idx" ON "time_entries"("track_id");

-- CreateIndex
CREATE INDEX "time_entries_topic_id_idx" ON "time_entries"("topic_id");

-- CreateIndex
CREATE INDEX "time_entries_activity_type_id_idx" ON "time_entries"("activity_type_id");

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Hand-written constraints (not expressible in schema.prisma) ───────────

-- Needed to combine "=" on user_id with "&&" on ranges in one GiST exclusion constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "time_entries"
  ADD CONSTRAINT "time_entries_ended_after_started_check"
    CHECK ("ended_at" IS NULL OR "ended_at" > "started_at"),
  ADD CONSTRAINT "time_entries_focus_rating_check"
    CHECK ("focus_rating" IS NULL OR "focus_rating" BETWEEN 1 AND 5),
  -- No two entries of the same user may overlap. A running entry spans [started_at, ∞).
  ADD CONSTRAINT "time_entries_no_overlap"
    EXCLUDE USING gist (
      "user_id" WITH =,
      tstzrange("started_at", COALESCE("ended_at", 'infinity'::timestamptz), '[)') WITH &&
    );

-- At most one running timer per user.
CREATE UNIQUE INDEX "time_entries_one_running_per_user"
  ON "time_entries" ("user_id") WHERE "ended_at" IS NULL;
