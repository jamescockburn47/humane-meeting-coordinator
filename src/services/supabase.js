import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
// We expect these to be in .env, but for now we'll handle gracefully if missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Upserts a user profile.
 * @param {string} email - User email
 * @param {string} name - Display name
 * @param {string} timezone - User's timezone
 * @param {string} startLocal - Legacy: humane start time
 * @param {string} endLocal - Legacy: humane end time
 * @param {Array} windows - Availability windows
 * @param {boolean} nightOwl - Allow midnight-6am slots
 */
export async function updateProfile(email, name, timezone, startLocal, endLocal, windows = [], nightOwl = false) {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            email,
            display_name: name,
            timezone,
            humane_start_local: startLocal,
            humane_end_local: endLocal,
            humane_windows: windows,
            night_owl: nightOwl,
            last_synced_at: new Date().toISOString()
        }, { onConflict: 'email' })
        .select();

    if (error) console.error("Profile update failed", error);
    return data;
}

export async function getProfile(email) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) return null;
    return data;
}

/**
 * Check if a user is approved for the beta program.
 * Returns: { approved: boolean, pending: boolean, rejected: boolean, limitReached: boolean }
 */
export async function checkApprovalStatus(email) {
    const profile = await getProfile(email);
    
    if (!profile) {
        // User doesn't exist yet - check if limits would allow them
        return { approved: false, pending: false, rejected: false, newUser: true };
    }
    
    return {
        approved: profile.is_approved === true,
        pending: profile.is_approved === null,
        rejected: profile.is_approved === false,
        newUser: false
    };
}

/**
 * Check beta limits for a specific provider
 */
export async function checkBetaLimits() {
    const GOOGLE_LIMIT = 50;
    const MICROSOFT_LIMIT = 50;
    
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('email, is_approved');
    
    if (error) return { googleFull: false, microsoftFull: false };
    
    let googleApproved = 0;
    let microsoftApproved = 0;
    
    profiles.forEach(p => {
        if (p.is_approved !== true) return;
        const email = p.email?.toLowerCase() || '';
        if (email.includes('@gmail.com') || email.includes('@googlemail.com')) {
            googleApproved++;
        } else if (email.includes('@outlook.') || email.includes('@hotmail.') || 
                   email.includes('@live.') || email.includes('@msn.')) {
            microsoftApproved++;
        }
    });
    
    return {
        googleApproved,
        microsoftApproved,
        googleFull: googleApproved >= GOOGLE_LIMIT,
        microsoftFull: microsoftApproved >= MICROSOFT_LIMIT,
        googleLimit: GOOGLE_LIMIT,
        microsoftLimit: MICROSOFT_LIMIT
    };
}

/**
 * Generates a short, readable invite code (6 characters)
 */
function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I,O,0,1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Creates a new group with a short invite code.
 */
export async function createGroup(name, creatorEmail) {
    const inviteCode = generateInviteCode();
    
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{ 
            name, 
            created_by: creatorEmail,
            invite_code: inviteCode 
        }])
        .select()
        .single();

    if (groupError) {
        console.error("Error creating group:", groupError);
        alert("Database Error: " + groupError.message);
        return null;
    }

    const { error: joinError } = await joinGroup(group.id, creatorEmail);
    if (joinError) {
        console.error("Join after create failed", joinError);
    }

    return group;
}

/**
 * Updates group meeting request settings (date range, duration).
 * These persist so users see the same settings when they return.
 */
export async function updateGroupMeetingSettings(groupId, settings) {
    const { data, error } = await supabase
        .from('groups')
        .update({
            meeting_date_from: settings.dateFrom,
            meeting_date_to: settings.dateTo,
            meeting_duration: settings.duration,
            updated_at: new Date().toISOString()
        })
        .eq('id', groupId)
        .select()
        .single();

    if (error) {
        console.error("Failed to update group settings:", error);
        return null;
    }
    return data;
}

/**
 * Gets a group by its short invite code OR UUID (for backwards compatibility)
 */
export async function getGroupByInviteCode(inviteCode) {
    // First, try to find by short invite code
    const { data: byCode, error: codeError } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

    if (byCode) {
        return byCode;
    }

    // Fallback: try to find by UUID (for old links)
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inviteCode);
    
    if (isUUID) {
        const { data: byId, error: idError } = await supabase
            .from('groups')
            .select('*')
            .eq('id', inviteCode)
            .single();

        if (byId) {
            console.log("Found group by UUID (legacy link):", byId.name);
            return byId;
        }
    }

    console.error("Group not found by invite code or UUID:", inviteCode);
    return null;
}

/**
 * Joins a group using invite code (not UUID)
 */
export async function joinGroupByCode(inviteCode, email) {
    // First find the group by invite code
    const group = await getGroupByInviteCode(inviteCode);
    if (!group) {
        return { error: { message: 'Invalid invite code. Please check and try again.' } };
    }

    // Check if already a member
    const { data: existing } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', group.id)
        .eq('profile_email', email)
        .single();

    if (existing) {
        return { error: null, group, alreadyMember: true };
    }

    // Join the group
    const { error } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, profile_email: email });

    if (error) {
        console.error("Join group failed", error);
        return { error };
    }

    return { error: null, group };
}

/**
 * Joins an existing group.
 */
export async function joinGroup(groupId, email) {
    const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, profile_email: email });

    if (error) {
        console.error("Join group failed", error);
        if (error.code === '23503') {
            alert("Error: Your User Profile was not found.\n\nPlease log out and log back in to sync your profile.");
        } else {
            alert("Start joining group failed: " + error.message);
        }
        return { error };
    }
    return { error: null };
}

/**
 * Syncs busy slots to the cache.
 * @param {string} email 
 * @param {Array<{start: {dateTime: string}, end: {dateTime: string}}>} busySlots 
 */
export async function syncAvailability(email, busySlots) {
    // 1. Delete old future slots for this user to avoid duplicates
    // In a real app, we'd be more surgical, but wiping future cache is safe enough
    const now = new Date().toISOString();
    await supabase
        .from('availability_cache')
        .delete()
        .eq('profile_email', email)
        .gt('start_time', now);

    // 2. Insert new slots
    if (!busySlots || busySlots.length === 0) return;

    const rows = busySlots.map(slot => ({
        profile_email: email,
        start_time: new Date(slot.start.dateTime + "Z").toISOString(), // Ensure UTC
        end_time: new Date(slot.end.dateTime + "Z").toISOString()
    }));

    const { error } = await supabase
        .from('availability_cache')
        .insert(rows);

    if (error) console.error("Sync availability failed", error);
}

/**
 * Fetches group members and their operational windows.
 */
export async function getGroupMembers(groupId) {
    const { data, error } = await supabase
        .from('group_members')
        .select(`
            profile_email,
            is_admin,
            profiles (
                email,
                display_name,
                humane_start_local,
                humane_end_local,
                humane_windows,
                timezone
            )
        `)
        .eq('group_id', groupId);

    if (error) return [];
    // Merge is_admin into the profile object for easier consumption
    const members = data.map(d => ({ ...d.profiles, is_admin: d.is_admin }));
    return members;
}

export async function removeMember(groupId, email) {
    const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('profile_email', email);
    return { error };
}

/**
 * Deletes a group and all its memberships (CASCADE should handle members)
 */
export async function deleteGroup(groupId) {
    // First delete all memberships
    await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

    // Then delete the group
    const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

    return { error };
}

export async function makeAdmin(groupId, email) {
    const { error } = await supabase
        .from('group_members')
        .update({ is_admin: true })
        .eq('group_id', groupId)
        .eq('profile_email', email);
    return { error };
}

/**
 * Fetches busy slots for all emails in list for a given range.
 */
export async function getBusySlotsForUsers(emails, start, end) {
    const { data, error } = await supabase
        .from('availability_cache')
        .select('*')
        .in('profile_email', emails)
        .gte('end_time', start.toISOString())
        .lte('start_time', end.toISOString());

    if (error) return [];
    return data;
}

export async function getGroupDetails(groupId) {
    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
    if (error) return null;
    return data;
}

/**
 * Deletes all user data (GDPR Right to Erasure)
 * This removes: profile, group memberships, and availability cache
 */
export async function deleteAllUserData(email) {
    console.log("Deleting all data for:", email);
    
    // 1. Delete availability cache
    const { error: cacheError } = await supabase
        .from('availability_cache')
        .delete()
        .eq('profile_email', email);
    
    if (cacheError) console.error("Error deleting availability cache:", cacheError);

    // 2. Delete group memberships
    const { error: memberError } = await supabase
        .from('group_members')
        .delete()
        .eq('profile_email', email);
    
    if (memberError) console.error("Error deleting group memberships:", memberError);

    // 3. Delete profile
    const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email);
    
    if (profileError) console.error("Error deleting profile:", profileError);

    return { 
        success: !cacheError && !memberError && !profileError,
        errors: { cacheError, memberError, profileError }
    };
}

/**
 * Export user data (GDPR Right to Portability)
 */
export async function exportUserData(email) {
    const profile = await getProfile(email);
    
    const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id, is_admin, groups(name)')
        .eq('profile_email', email);

    const { data: availability } = await supabase
        .from('availability_cache')
        .select('start_time, end_time, created_at')
        .eq('profile_email', email);

    return {
        exportDate: new Date().toISOString(),
        profile: profile ? {
            email: profile.email,
            display_name: profile.display_name,
            timezone: profile.timezone,
            humane_windows: profile.humane_windows,
            last_synced_at: profile.last_synced_at
        } : null,
        groupMemberships: memberships || [],
        availabilitySlots: availability || []
    };
}