-- Migration: Promo Codes & Promoter System

-- Promoters table
CREATE TABLE IF NOT EXISTS promoters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  total_sales INTEGER DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  total_commission NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  event_id UUID REFERENCES events(id),
  promoter_id UUID REFERENCES promoters(id),
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(code, event_id)
);

-- Add promoter_id to orders for attribution
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promoter_id UUID REFERENCES promoters(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_event ON promo_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_promoter ON promo_codes(promoter_id);
CREATE INDEX IF NOT EXISTS idx_promoters_status ON promoters(status);
CREATE INDEX IF NOT EXISTS idx_orders_promoter ON orders(promoter_id);
CREATE INDEX IF NOT EXISTS idx_orders_promo_code ON orders(promo_code_id);

-- Enable RLS
ALTER TABLE promoters ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for promoters
CREATE POLICY "Admin users can read promoters" ON promoters
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admin users can insert promoters" ON promoters
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admin users can update promoters" ON promoters
  FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admin users can delete promoters" ON promoters
  FOR DELETE USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));

-- RLS policies for promo_codes
CREATE POLICY "Admin users can read promo_codes" ON promo_codes
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admin users can insert promo_codes" ON promo_codes
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admin users can update promo_codes" ON promo_codes
  FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admin users can delete promo_codes" ON promo_codes
  FOR DELETE USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));

-- Allow public read of active promo codes (for checkout validation)
CREATE POLICY "Public can read active promo_codes" ON promo_codes
  FOR SELECT USING (is_active = true);
