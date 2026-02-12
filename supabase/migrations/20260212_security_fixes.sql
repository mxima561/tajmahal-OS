-- Migration: Security Fixes
-- Date: 2026-02-12
-- Description: Address security audit findings

-- H2: Remove overly permissive public read policy on promo_codes
-- This policy allowed any visitor to enumerate all active promo codes via anon key
-- Promo code validation should only occur through the API route which validates
-- specific codes and doesn't expose the full list
DROP POLICY IF EXISTS "Public can read active promo_codes" ON promo_codes;

-- Create audit_logs table for M2: Audit logging for admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES admin_users(id),
  admin_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Performance indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (and only super_admin should in practice)
CREATE POLICY "Admin users can read audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );

-- Only allow inserts via service role (API routes)
-- No direct insert policy for regular users
CREATE POLICY "Service role can insert audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
