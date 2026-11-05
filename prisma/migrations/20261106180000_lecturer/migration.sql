-- CreateEnum
CREATE TYPE "demo_audience" AS ENUM ('SELF', 'RECORDED', 'MOCK_PANEL', 'LIVE_CLASS');

-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('IDEA', 'WRITING', 'SUBMITTED', 'ACCEPTED', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "syllabus_url" TEXT,
    "readiness" SMALLINT NOT NULL DEFAULT 1,
    "notes_md" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_demos" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID,
    "topic" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "audience" "demo_audience" NOT NULL DEFAULT 'SELF',
    "self_score" SMALLINT,
    "feedback_md" TEXT NOT NULL DEFAULT '',
    "recording_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "teaching_demos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "venue" TEXT,
    "status" "publication_status" NOT NULL DEFAULT 'IDEA',
    "submitted_on" DATE,
    "url" TEXT,
    "notes_md" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viva_questions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID,
    "question" TEXT NOT NULL,
    "answer_md" TEXT NOT NULL DEFAULT '',
    "next_review_on" DATE,
    "review_stage" SMALLINT NOT NULL DEFAULT 0,
    "last_practiced_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "viva_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_user_id_name_key" ON "courses"("user_id", "name");

-- CreateIndex
CREATE INDEX "teaching_demos_user_id_date_idx" ON "teaching_demos"("user_id", "date");

-- CreateIndex
CREATE INDEX "teaching_demos_course_id_idx" ON "teaching_demos"("course_id");

-- CreateIndex
CREATE INDEX "publications_user_id_status_idx" ON "publications"("user_id", "status");

-- CreateIndex
CREATE INDEX "viva_questions_user_id_next_review_on_idx" ON "viva_questions"("user_id", "next_review_on");

-- CreateIndex
CREATE INDEX "viva_questions_course_id_idx" ON "viva_questions"("course_id");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_demos" ADD CONSTRAINT "teaching_demos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_demos" ADD CONSTRAINT "teaching_demos_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_questions" ADD CONSTRAINT "viva_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viva_questions" ADD CONSTRAINT "viva_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Hand-written constraints (not expressible in schema.prisma) ───────────

ALTER TABLE "courses"
  ADD CONSTRAINT "courses_name_check" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "courses_readiness_check" CHECK ("readiness" BETWEEN 1 AND 5);

ALTER TABLE "teaching_demos"
  ADD CONSTRAINT "teaching_demos_topic_check" CHECK (length(btrim("topic")) > 0),
  ADD CONSTRAINT "teaching_demos_duration_check" CHECK ("duration_min" BETWEEN 1 AND 600),
  ADD CONSTRAINT "teaching_demos_self_score_check"
    CHECK ("self_score" IS NULL OR "self_score" BETWEEN 1 AND 5);

ALTER TABLE "publications"
  ADD CONSTRAINT "publications_title_check" CHECK (length(btrim("title")) > 0),
  -- Anything past writing has been submitted somewhere.
  ADD CONSTRAINT "publications_submitted_on_check"
    CHECK ("status" IN ('IDEA', 'WRITING') OR "submitted_on" IS NOT NULL);

ALTER TABLE "viva_questions"
  ADD CONSTRAINT "viva_questions_question_check" CHECK (length(btrim("question")) > 0),
  ADD CONSTRAINT "viva_questions_review_stage_check" CHECK ("review_stage" >= 0);
