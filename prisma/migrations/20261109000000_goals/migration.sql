-- CreateEnum
CREATE TYPE "goal_metric" AS ENUM ('STUDY_MINUTES', 'PROBLEMS_SOLVED', 'LEARNING_ENTRIES');

-- CreateEnum
CREATE TYPE "goal_period" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "track_id" UUID,
    "metric" "goal_metric" NOT NULL,
    "period" "goal_period" NOT NULL,
    "target" INTEGER NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Hand-written constraints (not expressible in schema.prisma) ───────────

ALTER TABLE "goals"
  ADD CONSTRAINT "goals_target_check" CHECK ("target" > 0 AND "target" <= 100000),
  ADD CONSTRAINT "goals_dates_check" CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on"),
  -- Only study time is tracked per track.
  ADD CONSTRAINT "goals_track_check" CHECK ("track_id" IS NULL OR "metric" = 'STUDY_MINUTES');
