-- CreateTable
CREATE TABLE "signup_attempts" (
    "id" UUID NOT NULL,
    "ip" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signup_attempts_ip_created_at_idx" ON "signup_attempts"("ip", "created_at");

