-- MIRAVA: resumable external image-provider task state.
ALTER TABLE "StudioJob"
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "providerTaskId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerState" TEXT,
  ADD COLUMN IF NOT EXISTS "providerFrameIndex" INTEGER;
