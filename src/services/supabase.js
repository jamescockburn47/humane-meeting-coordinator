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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4dc5cdbe-3266-4cd2-814b-44e3842cd6c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:updateProfile:entry',message:'updateProfile called',data:{email,name,timezone,startLocal,endLocal,windows},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{});
    // #endregion
    
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4dc5cdbe-3266-4cd2-814b-44e3842cd6c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:updateProfile:result',message:'updateProfile result',data:{success:!error,error:error?.message,data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4dc5cdbe-3266-4cd2-814b-44e3842cd6c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:getGroupMembers:entry',message:'getGroupMembers called',data:{groupId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4dc5cdbe-3266-4cd2-814b-44e3842cd6c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:getGroupMembers:result',message:'getGroupMembers result',data:{error:error?.message,rawData:data,memberCount:data?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H5'})}).catch(()=>{});
    // #endregion

    if (error) return [];
    // Merge is_admin into the profile object for easier consumption
    const members = data.map(d => ({ ...d.profiles, is_admin: d.is_admin }));
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4dc5cdbe-3266-4cd2-814b-44e3842cd6c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:getGroupMembers:mapped',message:'Members after mapping',data:{members:members.map(m=>({email:m?.email,hasWindows:!!m?.humane_windows,windowsLength:m?.humane_windows?.length,timezone:m?.timezone}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H5'})}).catch(()=>{});
    // #endregion

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