-- CreateTable
CREATE TABLE "daily_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "mood" SMALLINT,
    "energy" SMALLINT,
    "sleep_quality" SMALLINT,
    "bed_at" TIMESTAMPTZ(3),
    "wake_at" TIMESTAMPTZ(3),
    "plan_for_day" TEXT,
    "reflection" TEXT,
    "wins" TEXT,
    "blockers" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "track_id" UUID,
    "topic_id" UUID,
    "title" TEXT NOT NULL,
    "content_md" TEXT NOT NULL DEFAULT '',
    "source_url" TEXT,
    "confidence" SMALLINT,
    "revisit_on" DATE,
    "review_stage" SMALLINT NOT NULL DEFAULT 0,
    "last_reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "learning_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_entry_tags" (
    "learning_entry_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "learning_entry_tags_pkey" PRIMARY KEY ("learning_entry_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_user_id_date_key" ON "daily_logs"("user_id", "date");

-- CreateIndex
CREATE INDEX "learning_entries_user_id_date_idx" ON "learning_entries"("user_id", "date");

-- CreateIndex
CREATE INDEX "learning_entries_user_id_revisit_on_idx" ON "learning_entries"("user_id", "revisit_on");

-- CreateIndex
CREATE INDEX "learning_entries_track_id_idx" ON "learning_entries"("track_id");

-- CreateIndex
CREATE INDEX "learning_entries_topic_id_idx" ON "learning_entries"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags"("user_id", "name");

-- CreateIndex
CREATE INDEX "learning_entry_tags_tag_id_idx" ON "learning_entry_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_entries" ADD CONSTRAINT "learning_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_entries" ADD CONSTRAINT "learning_entries_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_entries" ADD CONSTRAINT "learning_entries_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_entry_tags" ADD CONSTRAINT "learning_entry_tags_learning_entry_id_fkey" FOREIGN KEY ("learning_entry_id") REFERENCES "learning_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_entry_tags" ADD CONSTRAINT "learning_entry_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Hand-written constraints (not expressible in schema.prisma) ───────────

ALTER TABLE "daily_logs"
  ADD CONSTRAINT "daily_logs_mood_check" CHECK ("mood" IS NULL OR "mood" BETWEEN 1 AND 5),
  ADD CONSTRAINT "daily_logs_energy_check" CHECK ("energy" IS NULL OR "energy" BETWEEN 1 AND 5),
  ADD CONSTRAINT "daily_logs_sleep_quality_check"
    CHECK ("sleep_quality" IS NULL OR "sleep_quality" BETWEEN 1 AND 5),
  -- A night's sleep: wake after bed, at most 24 hours.
  ADD CONSTRAINT "daily_logs_sleep_check"
    CHECK ("bed_at" IS NULL OR "wake_at" IS NULL
           OR ("wake_at" > "bed_at" AND "wake_at" - "bed_at" <= interval '24 hours'));

ALTER TABLE "learning_entries"
  ADD CONSTRAINT "learning_entries_confidence_check"
    CHECK ("confidence" IS NULL OR "confidence" BETWEEN 1 AND 5),
  ADD CONSTRAINT "learning_entries_review_stage_check" CHECK ("review_stage" >= 0),
  ADD CONSTRAINT "learning_entries_title_check" CHECK (length(btrim("title")) > 0);

-- Tags are stored lower-cased and trimmed so "React" and "react " are one tag.
ALTER TABLE "tags"
  ADD CONSTRAINT "tags_name_check" CHECK ("name" = lower(btrim("name")) AND length("name") > 0);
