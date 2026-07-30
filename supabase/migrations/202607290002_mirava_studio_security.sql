-- MIRAVA Studio data is server-owned. No direct browser access is permitted.

ALTER TABLE IF EXISTS public."StudioCreation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."StudioAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."StudioConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."StudioJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."StudioCreditLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."StudioCreditLot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."StudioCreditAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."StudioSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."StudioPushSubscription" ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.apply_studio_credit_delta(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_mirava_credit_lot(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_mirava_credit(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_mirava_credit_reservation(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.debit_mirava_credit_reservation(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rollover_mirava_subscription_credits(TEXT, TEXT, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_mirava_credit_lots() FROM PUBLIC, anon, authenticated;
