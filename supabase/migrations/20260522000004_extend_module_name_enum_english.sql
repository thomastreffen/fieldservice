-- Five platform_modules slugs use English names that were not in the enum.
-- Adds them so tenant module toggles work for all registered modules.

ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'assets';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'el_certificates';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'jobs';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'service_agreements';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'warranties';
