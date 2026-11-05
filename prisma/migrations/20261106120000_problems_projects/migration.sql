-- CreateEnum
CREATE TYPE "problem_platform" AS ENUM ('LEETCODE', 'CODEFORCES', 'HACKERRANK', 'ATCODER', 'GEEKSFORGEEKS', 'CODECHEF', 'OTHER');

-- CreateEnum
CREATE TYPE "problem_difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "problem_status" AS ENUM ('TODO', 'ATTEMPTED', 'SOLVED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('PLANNING', 'BUILDING', 'SHIPPED', 'PAUSED');

-- CreateTable
CREATE TABLE "problems" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "topic_id" UUID,
    "title" TEXT NOT NULL,
    "platform" "problem_platform" NOT NULL DEFAULT 'LEETCODE',
    "url" TEXT,
    "difficulty" "problem_difficulty" NOT NULL DEFAULT 'MEDIUM',
    "status" "problem_status" NOT NULL DEFAULT 'TODO',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "time_spent_min" INTEGER NOT NULL DEFAULT 0,
    "solved_at" TIMESTAMPTZ(3),
    "notes_md" TEXT NOT NULL DEFAULT '',
    "next_review_on" DATE,
    "review_stage" SMALLINT NOT NULL DEFAULT 0,
    "last_reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_tags" (
    "problem_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "problem_tags_pkey" PRIMARY KEY ("problem_id","tag_id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "repo_url" TEXT,
    "live_url" TEXT,
    "stack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "project_status" NOT NULL DEFAULT 'BUILDING',
    "notes_md" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "problems_user_id_status_idx" ON "problems"("user_id", "status");

-- CreateIndex
CREATE INDEX "problems_user_id_next_review_on_idx" ON "problems"("user_id", "next_review_on");

-- CreateIndex
CREATE INDEX "problems_topic_id_idx" ON "problems"("topic_id");

-- CreateIndex
CREATE INDEX "problem_tags_tag_id_idx" ON "problem_tags"("tag_id");

-- CreateIndex
CREATE INDEX "projects_user_id_sort_order_idx" ON "projects"("user_id", "sort_order");

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_tags" ADD CONSTRAINT "problem_tags_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_tags" ADD CONSTRAINT "problem_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Hand-written constraints (not expressible in schema.prisma) ───────────

ALTER TABLE "problems"
  ADD CONSTRAINT "problems_title_check" CHECK (length(btrim("title")) > 0),
  ADD CONSTRAINT "problems_counts_check"
    CHECK ("attempts" >= 0 AND "time_spent_min" >= 0 AND "review_stage" >= 0),
  -- A solved (or needs-revision) problem knows when it was first solved.
  ADD CONSTRAINT "problems_solved_at_check"
    CHECK ("status" NOT IN ('SOLVED', 'NEEDS_REVISION') OR "solved_at" IS NOT NULL);

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_name_check" CHECK (length(btrim("name")) > 0);
