-- Add vertical_ids and addon_modules columns to saas_plans
ALTER TABLE saas_plans
  ADD COLUMN IF NOT EXISTS vertical_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS addon_modules TEXT[] DEFAULT '{}';
