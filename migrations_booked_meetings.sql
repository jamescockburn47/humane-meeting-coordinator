-- Migration: Add booked_meetings table to track scheduled meetings
-- Run this in Supabase SQL Editor

-- Create booked_meetings table
CREATE TABLE IF NOT EXISTS booked_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    organizer_email TEXT NOT NULL,
    attendees JSONB DEFAULT '[]'::jsonb, -- Array of {email, name}
    meeting_link TEXT, -- Google Meet / Teams link if available
    calendar_event_id TEXT, -- ID from Google/Microsoft for reference
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'confirmed' -- confirmed, cancelled
);

-- Create index for quick group lookups
CREATE INDEX IF NOT EXISTS idx_booked_meetings_group ON booked_meetings(group_id);
CREATE INDEX IF NOT EXISTS idx_booked_meetings_start ON booked_meetings(start_time);

-- Enable Row Level Security
ALTER TABLE booked_meetings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read meetings (for group members to see scheduled meetings)
CREATE POLICY "Anyone can read booked meetings" ON booked_meetings
    FOR SELECT USING (true);

-- Policy: Authenticated users can insert meetings
CREATE POLICY "Authenticated can insert booked meetings" ON booked_meetings
    FOR INSERT WITH CHECK (true);

-- Policy: Organizer can update/delete their meetings
CREATE POLICY "Organizer can manage their meetings" ON booked_meetings
    FOR ALL USING (organizer_email = current_setting('request.jwt.claims', true)::json->>'email');
