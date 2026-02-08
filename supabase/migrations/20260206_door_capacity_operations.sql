-- Migration: Door & Capacity Operations
-- Tables: check_in_logs, guest_list_entries
-- Columns: venue_capacity on events (note: total_capacity already exists)

-- Check-in scan logs (audit trail for every scan attempt)
CREATE TABLE IF NOT EXISTS check_in_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id),
  order_id UUID REFERENCES orders(id),
  event_id UUID REFERENCES events(id) NOT NULL,
  scanned_by UUID REFERENCES admin_users(id),
  scanned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  scan_result TEXT CHECK (scan_result IN ('valid', 'duplicate', 'invalid', 'expired')) NOT NULL,
  device_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guest list entries
CREATE TABLE IF NOT EXISTS guest_list_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  plus_count INTEGER DEFAULT 0,
  added_by UUID REFERENCES admin_users(id),
  added_by_name TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'checked_in', 'no_show')) DEFAULT 'pending',
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES admin_users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add venue_capacity column to events if not exists (separate from total_capacity which is ticket capacity)
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_capacity INTEGER;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_check_in_logs_event ON check_in_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_ticket ON check_in_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_order ON check_in_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_scanned_at ON check_in_logs(event_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_list_event ON guest_list_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_list_status ON guest_list_entries(event_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_list_name ON guest_list_entries(event_id, name);

-- Enable RLS on new tables
ALTER TABLE check_in_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_list_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for check_in_logs (admin/staff can read/write)
CREATE POLICY "Admin users can read check_in_logs" ON check_in_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin users can insert check_in_logs" ON check_in_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );

-- RLS policies for guest_list_entries (admin/staff can CRUD)
CREATE POLICY "Admin users can read guest_list_entries" ON guest_list_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin users can insert guest_list_entries" ON guest_list_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin users can update guest_list_entries" ON guest_list_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin users can delete guest_list_entries" ON guest_list_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );
