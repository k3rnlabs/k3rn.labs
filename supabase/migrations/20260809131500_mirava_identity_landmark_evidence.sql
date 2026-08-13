ALTER TABLE public."StudioIdentityEvaluation"
  ADD COLUMN IF NOT EXISTS "landmarkResidual" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "landmarkThreshold" DOUBLE PRECISION;
