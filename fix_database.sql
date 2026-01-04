-- =====================================================
-- HUMANE CALENDAR - DATABASE FIX SCRIPT
-- Run this in Supabase SQL Editor to fix missing columns
-- =====================================================

-- 1. Fix PROFILES table - add missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS humane_windows JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS humane_start_local TEXT DEFAULT '09:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS humane_end_local TEXT DEFAULT '17:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 2. Fix GROUPS table - add missing columns
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 3. Generate invite codes for existing groups that don't have them
UPDATE groups 
SET invite_code = UPPER(substr(md5(random()::text), 0, 7))
WHERE invite_code IS NULL;

-- 4. Create index for invite code lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);

-- 5. Verify the fix worked
SELECT 
    'profiles' as table_name,
    COUNT(*) as row_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'profiles') as column_count
UNION ALL
SELECT 
    'groups' as table_name,
    COUNT(*) as row_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'groups') as column_count
FROM profiles;

-- 6. Show profiles table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
