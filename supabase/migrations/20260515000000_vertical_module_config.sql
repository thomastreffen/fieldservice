-- Add per-vertical module configuration columns
ALTER TABLE public.vertical_modules
  ADD COLUMN IF NOT EXISTS is_core       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
