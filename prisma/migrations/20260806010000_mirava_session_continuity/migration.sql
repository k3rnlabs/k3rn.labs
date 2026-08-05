-- CreateTable
CREATE TABLE "StudioSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studioProfileId" TEXT,
    "identityProfileId" TEXT,
    "presetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSession_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StudioCreation"
ADD COLUMN "sessionId" TEXT,
ADD COLUMN "parentCreationId" TEXT,
ADD COLUMN "shotIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "shotIntent" TEXT,
ADD COLUMN "sourceResultIndex" INTEGER;

-- CreateIndex
CREATE INDEX "StudioSession_userId_createdAt_idx"
ON "StudioSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StudioCreation_sessionId_shotIndex_idx"
ON "StudioCreation"("sessionId", "shotIndex");

-- CreateIndex
CREATE INDEX "StudioCreation_parentCreationId_idx"
ON "StudioCreation"("parentCreationId");

-- AddForeignKey
ALTER TABLE "StudioSession"
ADD CONSTRAINT "StudioSession_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioCreation"
ADD CONSTRAINT "StudioCreation_sessionId_fkey"
FOREIGN KEY ("sessionId")
REFERENCES "StudioSession"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioCreation"
ADD CONSTRAINT "StudioCreation_parentCreationId_fkey"
FOREIGN KEY ("parentCreationId")
REFERENCES "StudioCreation"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
