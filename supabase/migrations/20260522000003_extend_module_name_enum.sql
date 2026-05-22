-- Extend module_name enum with all current and upcoming module slugs.
-- Existing values: 'postkontoret', 'ressursplanlegger', 'crm'
-- ADD VALUE IF NOT EXISTS is safe to re-run and cannot be rolled back (DDL).

ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'hms';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'hms_hr';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'order_forms';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'garantisaker';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'el_sertifikater';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'serviceavtaler';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'anlegg';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'jobber';
ALTER TYPE public.module_name ADD VALUE IF NOT EXISTS 'postkontor';
