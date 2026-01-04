import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
// We expect these to be in .env, but for now we'll handle gracefully if missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Upserts a user profile.
 */
export async function updateProfile(email, name, timezone, startLocal, endLocal, windows = []) {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            email,
            display_name: name,
            timezone,
            humane_start_local: startLocal,
            humane_end_local: endLocal,
            humane_windows: windows,
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
 * Creates a new group.
 */
export async function createGroup(name, creatorEmail) {
    // Reverted to simple insert as 'created_by' column does not exist in simplified schema
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{ name }])
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
        // Alert handled inside joinGroup now
    }

    return group;
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
    return data.map(d => ({ ...d.profiles, is_admin: d.is_admin }));
}

export async function removeMember(groupId, email) {
    const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('profile_email', email);
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
