-- Add attachment columns to support_messages
ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_mime TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  false,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: tenant members can upload to their own ticket folders
CREATE POLICY "Tenant members can upload ticket attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND (
      -- master admin can upload anywhere
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'master_admin'
      )
      OR
      -- tenant members can upload to their own ticket folders (path: {tenant_id}/...)
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
          AND tenant_id = (string_to_array(name, '/'))[1]::uuid
      )
    )
  );

-- RLS: tenant members can read attachments for their own tickets
CREATE POLICY "Tenant members can read own ticket attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'master_admin'
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
          AND tenant_id = (string_to_array(name, '/'))[1]::uuid
      )
    )
  );
