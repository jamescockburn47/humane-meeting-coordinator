-- =====================================================
-- HUMANE CALENDAR - MIGRATION: January 2026
-- Run these statements in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD NIGHT_OWL PREFERENCE TO PROFILES
-- Allows users to opt-in to midnight-6am slots
-- =====================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS night_owl BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 2. ADD MEETING SETTINGS TO GROUPS
-- Persists date range and duration preferences
-- =====================================================
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS meeting_date_from DATE,
ADD COLUMN IF NOT EXISTS meeting_date_to DATE,
ADD COLUMN IF NOT EXISTS meeting_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 3. INDEX FOR FASTER GROUP LOOKUPS
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);

-- =====================================================
-- 4. VERIFY CHANGES
-- Run these to confirm the migration worked:
-- =====================================================
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'night_owl';

-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'groups' 
-- AND column_name IN ('meeting_date_from', 'meeting_date_to', 'meeting_duration', 'updated_at');
