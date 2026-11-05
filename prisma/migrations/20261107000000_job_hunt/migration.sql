-- CreateEnum
CREATE TYPE "organization_type" AS ENUM ('COMPANY', 'UNIVERSITY');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('WISHLIST', 'APPLIED', 'OA', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "interview_round" AS ENUM ('SCREENING', 'OA', 'TECHNICAL', 'SYSTEM_DESIGN', 'BEHAVIORAL', 'HR', 'TEACHING_DEMO', 'VIVA', 'WRITTEN');

-- CreateEnum
CREATE TYPE "interview_outcome" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "organization_type" NOT NULL DEFAULT 'COMPANY',
    "website" TEXT,
    "location" TEXT,
    "notes_md" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "track_id" UUID,
    "role" TEXT NOT NULL,
    "job_url" TEXT,
    "source" TEXT,
    "status" "application_status" NOT NULL DEFAULT 'WISHLIST',
    "applied_on" DATE,
    "deadline_on" DATE,
    "salary_range" TEXT,
    "notes_md" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "from_status" "application_status",
    "to_status" "application_status" NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "round" "interview_round" NOT NULL,
    "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
    "duration_min" INTEGER,
    "interviewer" TEXT,
    "questions_md" TEXT NOT NULL DEFAULT '',
    "my_answers_md" TEXT NOT NULL DEFAULT '',
    "outcome" "interview_outcome" NOT NULL DEFAULT 'PENDING',
    "self_rating" SMALLINT,
    "lessons_md" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_interviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "track_id" UUID,
    "date" DATE NOT NULL,
    "partner" TEXT,
    "type" "interview_round" NOT NULL,
    "score" SMALLINT,
    "feedback_md" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_user_id_name_key" ON "organizations"("user_id", "name");

-- CreateIndex
CREATE INDEX "applications_user_id_status_idx" ON "applications"("user_id", "status");

-- CreateIndex
CREATE INDEX "applications_organization_id_idx" ON "applications"("organization_id");

-- CreateIndex
CREATE INDEX "applications_track_id_idx" ON "applications"("track_id");

-- CreateIndex
CREATE INDEX "application_events_application_id_at_idx" ON "application_events"("application_id", "at");

-- CreateIndex
CREATE INDEX "application_events_user_id_at_idx" ON "application_events"("user_id", "at");

-- CreateIndex
CREATE INDEX "interviews_user_id_scheduled_at_idx" ON "interviews"("user_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "interviews_application_id_idx" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "mock_interviews_user_id_date_idx" ON "mock_interviews"("user_id", "date");

-- CreateIndex
CREATE INDEX "mock_interviews_track_id_idx" ON "mock_interviews"("track_id");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Hand-written constraints (not expressible in schema.prisma) ───────────

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_name_check" CHECK (length(btrim("name")) > 0);

ALTER TABLE "applications"
  ADD CONSTRAINT "applications_role_check" CHECK (length(btrim("role")) > 0),
  -- Anything past the wishlist has been applied to.
  ADD CONSTRAINT "applications_applied_on_check"
    CHECK ("status" = 'WISHLIST' OR "applied_on" IS NOT NULL);

ALTER TABLE "application_events"
  ADD CONSTRAINT "application_events_change_check"
    CHECK ("from_status" IS NULL OR "from_status" <> "to_status");

ALTER TABLE "interviews"
  ADD CONSTRAINT "interviews_duration_check"
    CHECK ("duration_min" IS NULL OR "duration_min" BETWEEN 1 AND 1440),
  ADD CONSTRAINT "interviews_self_rating_check"
    CHECK ("self_rating" IS NULL OR "self_rating" BETWEEN 1 AND 5);

ALTER TABLE "mock_interviews"
  ADD CONSTRAINT "mock_interviews_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 1 AND 5);
