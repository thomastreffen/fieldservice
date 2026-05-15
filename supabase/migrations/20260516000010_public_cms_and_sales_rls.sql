-- CMS: anon can read platform_settings (for public marketing pages)
CREATE POLICY "public_read_platform_settings"
  ON platform_settings FOR SELECT
  TO anon
  USING (true);

-- Sales leads: anon can insert support tickets with no tenant (contact form)
CREATE POLICY "public_insert_sales_tickets"
  ON support_tickets FOR INSERT
  TO anon
  WITH CHECK (tenant_id IS NULL AND category = 'salg');
