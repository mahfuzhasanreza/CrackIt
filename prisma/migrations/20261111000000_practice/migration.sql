-- Replace the lecturer-only features with track-agnostic practice:
--   viva_questions → practice_questions, teaching_demos → presentations (data kept);
--   courses and publications are removed.
-- Questions and demos that belonged to the lecturer workflow are attached to the user's
-- "University Lecturer" track when they have one (course links can't carry over).

-- ─── Questions ───────────────────────────────────────────────────────────────
ALTER TABLE "viva_questions" RENAME TO "practice_questions";
ALTER TABLE "practice_questions" RENAME CONSTRAINT "viva_questions_pkey" TO "practice_questions_pkey";
ALTER TABLE "practice_questions" RENAME CONSTRAINT "viva_questions_user_id_fkey" TO "practice_questions_user_id_fkey";
ALTER TABLE "practice_questions" RENAME CONSTRAINT "viva_questions_question_check" TO "practice_questions_question_check";
ALTER TABLE "practice_questions" RENAME CONSTRAINT "viva_questions_review_stage_check" TO "practice_questions_review_stage_check";
ALTER INDEX "viva_questions_user_id_next_review_on_idx" RENAME TO "practice_questions_user_id_next_review_on_idx";

ALTER TABLE "practice_questions" ADD COLUMN "track_id" UUID;
UPDATE "practice_questions" q
SET "track_id" = t."id"
FROM "tracks" t
WHERE t."user_id" = q."user_id" AND t."name" = 'University Lecturer';

ALTER TABLE "practice_questions" DROP CONSTRAINT "viva_questions_course_id_fkey";
DROP INDEX "viva_questions_course_id_idx";
ALTER TABLE "practice_questions" DROP COLUMN "course_id";

CREATE INDEX "practice_questions_track_id_idx" ON "practice_questions"("track_id");
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_track_id_fkey"
  FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Presentations ───────────────────────────────────────────────────────────
ALTER TYPE "demo_audience" RENAME TO "presentation_audience";
ALTER TYPE "presentation_audience" RENAME VALUE 'LIVE_CLASS' TO 'LIVE';

ALTER TABLE "teaching_demos" RENAME TO "presentations";
ALTER TABLE "presentations" RENAME COLUMN "topic" TO "title";
ALTER TABLE "presentations" RENAME CONSTRAINT "teaching_demos_pkey" TO "presentations_pkey";
ALTER TABLE "presentations" RENAME CONSTRAINT "teaching_demos_user_id_fkey" TO "presentations_user_id_fkey";
ALTER TABLE "presentations" RENAME CONSTRAINT "teaching_demos_topic_check" TO "presentations_title_check";
ALTER TABLE "presentations" RENAME CONSTRAINT "teaching_demos_duration_check" TO "presentations_duration_check";
ALTER TABLE "presentations" RENAME CONSTRAINT "teaching_demos_self_score_check" TO "presentations_self_score_check";
ALTER INDEX "teaching_demos_user_id_date_idx" RENAME TO "presentations_user_id_date_idx";

ALTER TABLE "presentations" ADD COLUMN "track_id" UUID;
UPDATE "presentations" p
SET "track_id" = t."id"
FROM "tracks" t
WHERE t."user_id" = p."user_id" AND t."name" = 'University Lecturer';

ALTER TABLE "presentations" DROP CONSTRAINT "teaching_demos_course_id_fkey";
DROP INDEX "teaching_demos_course_id_idx";
ALTER TABLE "presentations" DROP COLUMN "course_id";

CREATE INDEX "presentations_track_id_idx" ON "presentations"("track_id");
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_track_id_fkey"
  FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Removed: courses, publications ─────────────────────────────────────────
DROP TABLE "publications";
DROP TABLE "courses";
DROP TYPE "publication_status";
