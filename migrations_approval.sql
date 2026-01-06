-- Migration: Add approval system for beta testers
-- Run this in Supabase SQL Editor

-- Add approval status to profiles
-- is_approved: NULL = pending, TRUE = approved, FALSE = rejected
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- Create index for quick filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);

-- View for pending approvals
CREATE OR REPLACE VIEW pending_approvals AS
SELECT 
    email,
    display_name,
    timezone,
    created_at,
    CASE 
        WHEN email LIKE '%@gmail.com' OR email LIKE '%@googlemail.com' THEN 'Google'
        WHEN email LIKE '%@outlook.%' OR email LIKE '%@hotmail.%' OR email LIKE '%@live.%' OR email LIKE '%@msn.%' THEN 'Microsoft'
        ELSE 'Other'
    END as provider
FROM profiles
WHERE is_approved IS NULL
ORDER BY created_at DESC;

-- View for approved users count by provider
CREATE OR REPLACE VIEW beta_counts AS
SELECT 
    CASE 
        WHEN email LIKE '%@gmail.com' OR email LIKE '%@googlemail.com' THEN 'Google'
        WHEN email LIKE '%@outlook.%' OR email LIKE '%@hotmail.%' OR email LIKE '%@live.%' OR email LIKE '%@msn.%' THEN 'Microsoft'
        ELSE 'Other'
    END as provider,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_approved = TRUE) as approved,
    COUNT(*) FILTER (WHERE is_approved IS NULL) as pending,
    COUNT(*) FILTER (WHERE is_approved = FALSE) as rejected
FROM profiles
GROUP BY 1;

-- Auto-approve existing users who have already used the system
-- (they have groups or have synced availability)
UPDATE profiles 
SET is_approved = TRUE, 
    approved_at = NOW(), 
    approved_by = 'auto-migration'
WHERE email IN (
    SELECT DISTINCT profile_email FROM group_members
    UNION
    SELECT DISTINCT profile_email FROM availability_cache
);

-- Comment: New users will have is_approved = NULL (pending)
-- Admin can approve (is_approved = TRUE) or reject (is_approved = FALSE)
