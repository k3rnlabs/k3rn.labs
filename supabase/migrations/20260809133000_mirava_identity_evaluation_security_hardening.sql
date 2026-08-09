ALTER TABLE public."StudioIdentityEvaluation"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."StudioIdentityEvaluation"
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public."StudioIdentityEvaluation"
  TO service_role;
