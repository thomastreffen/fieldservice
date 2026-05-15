-- Ensure register_trial_tenant is callable by authenticated users.
-- The main registration flow now only calls this function when a session
-- is established, so authenticated is the primary role needed.
-- Anon grant is retained for any legacy/fallback callers.
GRANT EXECUTE ON FUNCTION public.register_trial_tenant(TEXT, TEXT, UUID, TEXT, TEXT, TEXT[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_trial_tenant(TEXT, TEXT, UUID, TEXT, TEXT, TEXT[], UUID) TO anon;
