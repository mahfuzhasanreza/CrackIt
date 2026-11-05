-- CreateEnum
CREATE TYPE "checklist_type" AS ENUM ('ROADMAP', 'ONE_OFF', 'HABIT');

-- CreateEnum
CREATE TYPE "recurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "checklists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "track_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "checklist_type" NOT NULL,
    "recurrence" "recurrence" NOT NULL DEFAULT 'NONE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "checklist_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "due_on" DATE,
    "priority" SMALLINT NOT NULL DEFAULT 0,
    "done_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_item_completions" (
    "item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_item_completions_pkey" PRIMARY KEY ("item_id","period")
);

-- CreateIndex
CREATE INDEX "checklists_user_id_sort_order_idx" ON "checklists"("user_id", "sort_order");

-- CreateIndex
CREATE INDEX "checklists_track_id_idx" ON "checklists"("track_id");

-- CreateIndex
CREATE INDEX "checklist_items_checklist_id_sort_order_idx" ON "checklist_items"("checklist_id", "sort_order");

-- CreateIndex
CREATE INDEX "checklist_items_user_id_due_on_idx" ON "checklist_items"("user_id", "due_on");

-- CreateIndex
CREATE INDEX "checklist_item_completions_user_id_period_idx" ON "checklist_item_completions"("user_id", "period");

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_completions" ADD CONSTRAINT "checklist_item_completions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_completions" ADD CONSTRAINT "checklist_item_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Hand-written constraints (not expressible in schema.prisma) ───────────

ALTER TABLE "checklists"
  -- Habits recur; other lists don't.
  ADD CONSTRAINT "checklists_recurrence_check"
    CHECK (("type" = 'HABIT') = ("recurrence" <> 'NONE')),
  ADD CONSTRAINT "checklists_title_check" CHECK (length(btrim("title")) > 0);

ALTER TABLE "checklist_items"
  ADD CONSTRAINT "checklist_items_priority_check" CHECK ("priority" BETWEEN 0 AND 2),
  ADD CONSTRAINT "checklist_items_title_check" CHECK (length(btrim("title")) > 0);
