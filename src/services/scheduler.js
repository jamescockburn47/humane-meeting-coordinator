import { toZonedTime } from 'date-fns-tz';
import { addMinutes } from 'date-fns';

/**
 * The Core Algorithm: Find intersection of "Humane Windows" minus "Busy Slots".
 * 
 * This function finds time slots that:
 * 1. Fall within members' availability windows (in their local timezone)
 * 2. Don't overlap with members' busy times
 * 
 * NEW: Also returns partial attendance info for groups > 2 people
 */
export function findCommonHumaneSlots(members, busySlots, rangeStartStr, rangeEndStr, durationMinutes, options = {}) {
    const { includePartial = true, minAttendees = 2 } = options;
    
    console.log("=== SCHEDULER DEBUG ===");
    console.log("Range:", rangeStartStr, "to", rangeEndStr);
    console.log("Duration:", durationMinutes, "minutes");
    console.log("Members:", members.length);
    console.log("Include partial:", includePartial, "Min attendees:", minAttendees);
    
    // Log each member's windows
    members.forEach((m, i) => {
        console.log(`Member ${i + 1}: ${m.email}`);
        console.log(`  Timezone: ${m.timezone || 'NOT SET (using UTC)'}`);
        console.log(`  Windows:`, m.humane_windows);
    });

    console.log("Busy slots:", busySlots.length);

    // Parse dates - ensure we work in UTC to avoid timezone issues
    const [startYear, startMonth, startDay] = rangeStartStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = rangeEndStr.split('-').map(Number);
    
    // Create UTC dates for scanning
    const startScan = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0));
    const endScan = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 0));

    console.log("Scan range (UTC):", startScan.toISOString(), "to", endScan.toISOString());

    const fullMatchCandidates = [];
    const partialMatchCandidates = [];
    const step = 30; // Check every 30 minutes
    let currentTime = new Date(startScan);
    let slotsChecked = 0;

    while (currentTime < endScan) {
        const slotEnd = addMinutes(currentTime, durationMinutes);
        slotsChecked++;

        // Check each member's availability for this slot
        const availableMembers = [];
        const unavailableMembers = [];

        for (const member of members) {
            const humaneResult = isHumane(currentTime, slotEnd, member);
            const busyResult = isBusy(currentTime, slotEnd, member.email, busySlots);
            
            if (humaneResult.humane && !busyResult) {
                availableMembers.push({
                    email: member.email,
                    name: member.name || member.email.split('@')[0]
                });
            } else {
                unavailableMembers.push({
                    email: member.email,
                    name: member.name || member.email.split('@')[0],
                    reason: !humaneResult.humane ? 'Outside humane hours' : 'Busy'
                });
            }
        }

        const attendanceRatio = availableMembers.length / members.length;

        // Full match - everyone available
        if (availableMembers.length === members.length) {
            fullMatchCandidates.push({
                start: currentTime.toISOString(),
                end: slotEnd.toISOString(),
                confidence: 1.0,
                availableMembers,
                unavailableMembers: [],
                attendanceRatio: 1.0,
                isFullMatch: true
            });
        }
        // Partial match - at least minAttendees available
        else if (includePartial && availableMembers.length >= minAttendees) {
            partialMatchCandidates.push({
                start: currentTime.toISOString(),
                end: slotEnd.toISOString(),
                confidence: attendanceRatio,
                availableMembers,
                unavailableMembers,
                attendanceRatio,
                isFullMatch: false
            });
        }

        currentTime = addMinutes(currentTime, step);
    }

    console.log("=== SCHEDULER RESULTS ===");
    console.log(`Slots checked: ${slotsChecked}`);
    console.log(`Full matches (everyone): ${fullMatchCandidates.length}`);
    console.log(`Partial matches: ${partialMatchCandidates.length}`);

    // Return full matches first, then partial matches sorted by attendance ratio
    const results = [
        ...fullMatchCandidates,
        ...partialMatchCandidates.sort((a, b) => b.attendanceRatio - a.attendanceRatio)
    ];

    // Deduplicate consecutive similar slots
    const dedupedResults = deduplicateSlots(results);
    
    console.log(`After dedup: ${dedupedResults.length}`);
    
    return dedupedResults;
}

/**
 * Remove redundant consecutive slots that have the same attendance
 */
function deduplicateSlots(slots) {
    if (slots.length <= 1) return slots;
    
    const result = [];
    let lastSlot = null;
    
    for (const slot of slots) {
        // Keep if it's the first slot, or if attendance changed
        if (!lastSlot || 
            slot.isFullMatch !== lastSlot.isFullMatch ||
            slot.attendanceRatio !== lastSlot.attendanceRatio ||
            new Date(slot.start).toDateString() !== new Date(lastSlot.start).toDateString()) {
            result.push(slot);
            lastSlot = slot;
        }
    }
    
    return result;
}

/**
 * Check if a time slot falls within a member's availability windows.
 * 
 * @param {Date} startUtc - Slot start time (UTC)
 * @param {Date} endUtc - Slot end time (UTC)
 * @param {Object} member - Member with timezone and humane_windows
 * @returns {{ humane: boolean, reason: string }}
 */
function isHumane(startUtc, endUtc, member) {
    const zone = member.timezone || 'UTC';
    
    // Convert UTC times to member's local timezone
    let localStart, localEnd;
    try {
        localStart = toZonedTime(startUtc, zone);
        localEnd = toZonedTime(endUtc, zone);
    } catch (e) {
        console.error(`Invalid timezone for ${member.email}: ${zone}, using UTC`);
        localStart = new Date(startUtc);
        localEnd = new Date(endUtc);
    }

    // Extract local time components
    const startHour = localStart.getHours() + (localStart.getMinutes() / 60);
    const endHour = localEnd.getHours() + (localEnd.getMinutes() / 60);
    const day = localStart.getDay(); // 0=Sun, 6=Sat
    
    // Handle slots that cross midnight (endHour would be less than startHour)
    // These should be rejected as they span two days
    if (endHour < startHour) {
        return { humane: false, reason: 'Slot crosses midnight' };
    }

    // Check if member has defined windows
    const windows = member.humane_windows;
    
    if (windows && Array.isArray(windows) && windows.length > 0) {
        for (const win of windows) {
            // Check if this day type matches
            if (!checkDayType(win.type, day)) {
                continue;
            }

            // Parse window times
            const [hS, mS] = (win.start || "09:00").split(':').map(Number);
            const windowStart = hS + (mS / 60);
            const [hE, mE] = (win.end || "17:00").split(':').map(Number);
            const windowEnd = hE + (mE / 60);

            // Check if the ENTIRE slot fits within this window
            // Both start AND end must be within the window
            if (startHour >= windowStart && endHour <= windowEnd) {
                return { humane: true, reason: `Fits ${win.start}-${win.end}` };
            }
        }
        
        // Slot didn't fit any window
        return { 
            humane: false, 
            reason: `${startHour.toFixed(1)}-${endHour.toFixed(1)} outside windows` 
        };
    }

    // Fallback: Use legacy single window (humane_start_local / humane_end_local)
    // Default to 9-17 weekday if nothing is set
    const isWeekend = (day === 0 || day === 6);
    if (isWeekend) {
        return { humane: false, reason: 'Weekend (no window set)' };
    }

    const [legacyHS, legacyMS] = (member.humane_start_local || "09:00").split(':').map(Number);
    const legacyStart = legacyHS + (legacyMS / 60);
    const [legacyHE, legacyME] = (member.humane_end_local || "17:00").split(':').map(Number);
    const legacyEnd = legacyHE + (legacyME / 60);

    if (startHour >= legacyStart && endHour <= legacyEnd) {
        return { humane: true, reason: 'Fits legacy window' };
    }

    return { 
        humane: false, 
        reason: `${startHour.toFixed(1)}-${endHour.toFixed(1)} outside ${legacyStart}-${legacyEnd}` 
    };
}

/**
 * Check if the day matches the window type
 */
function checkDayType(type, day) {
    // day: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const isWeekend = (day === 0 || day === 6);
    const isMEWeekend = (day === 5 || day === 6); // Friday-Saturday for Middle East

    switch (type) {
        case 'weekday':
            return !isWeekend; // Mon-Fri
        case 'weekend':
            return isWeekend; // Sat-Sun
        case 'me_workday':
            return !isMEWeekend; // Sun-Thu
        case 'me_weekend':
            return isMEWeekend; // Fri-Sat
        case 'everyday':
        default:
            return true;
    }
}

/**
 * Check if a member is busy during a time slot
 */
function isBusy(slotStart, slotEnd, email, allBusySlots) {
    const userSlots = allBusySlots.filter(s => s.profile_email === email);

    for (const busy of userSlots) {
        const busyStart = new Date(busy.start_time);
        const busyEnd = new Date(busy.end_time);

        // Check for overlap
        if (slotStart < busyEnd && slotEnd > busyStart) {
            return true;
        }
    }
    return false;
}
