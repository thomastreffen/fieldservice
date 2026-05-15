-- verticals: public read for active verticals
CREATE POLICY "public_read_active_verticals"
  ON verticals FOR SELECT
  TO anon
  USING (is_active = true);

-- saas_plans: public read for active + visible plans
CREATE POLICY "public_read_visible_plans"
  ON saas_plans FOR SELECT
  TO anon
  USING (is_active = true AND is_visible = true);

-- platform_modules: public read
CREATE POLICY "public_read_platform_modules"
  ON platform_modules FOR SELECT
  TO anon
  USING (true);
