-- Seed data for local development
-- NOTE: In a real Supabase setup, users are created via auth.users.
-- This seed assumes you have created test users via the Supabase dashboard
-- and replaced the UUIDs below.

-- Example UUIDs (replace with real auth.users IDs after signup)
-- User A (Admin):  00000000-0000-0000-0000-000000000001
-- User B (Member): 00000000-0000-0000-0000-000000000002

-- Create a demo group
INSERT INTO groups (id, name, invite_code, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'הבית שלי', 'demo123abc',
   '00000000-0000-0000-0000-000000000001');

-- Add members
INSERT INTO group_members (group_id, user_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin'),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'member');

-- Create demo locks
INSERT INTO locks (id, group_id, name, nfc_tag_id, created_by) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'דלת כניסה', 'NFC-TAG-001', '00000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'מחסן', 'NFC-TAG-002', '00000000-0000-0000-0000-000000000001');

-- Create demo events
INSERT INTO events (lock_id, user_id, action, source) VALUES
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'lock', 'manual'),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'unlock', 'nfc');
