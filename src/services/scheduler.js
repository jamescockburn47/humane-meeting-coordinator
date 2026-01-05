import { toZonedTime } from 'date-fns-tz';
import { addMinutes } from 'date-fns';

/**
 * The Core Algorithm: Find intersection of "Humane Windows" minus "Busy Slots".
 * 
 * This function finds time slots that:
 * 1. Fall within EVERY member's availability windows (in their local timezone)
 * 2. Don't overlap with any member's busy times
 */
export function findCommonHumaneSlots(members, busySlots, rangeStartStr, rangeEndStr, durationMinutes) {
    console.log("=== SCHEDULER DEBUG ===");
    console.log("Range:", rangeStartStr, "to", rangeEndStr);
    console.log("Duration:", durationMinutes, "minutes");
    console.log("Members:", members.length);
    
    // Log each member's windows
    members.forEach((m, i) => {
        console.log(`Member ${i + 1}: ${m.email}`);
        console.log(`  Timezone: ${m.timezone || 'NOT SET (using UTC)'}`);
        console.log(`  Windows:`, m.humane_windows);
    });

    console.log("Busy slots:", busySlots.length);

    // Parse dates - ensure we work in UTC to avoid timezone issues
    // rangeStartStr format: '2025-01-06'
    const [startYear, startMonth, startDay] = rangeStartStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = rangeEndStr.split('-').map(Number);
    
    // Create UTC dates for scanning
    const startScan = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0));
    const endScan = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 0));

    console.log("Scan range (UTC):", startScan.toISOString(), "to", endScan.toISOString());

    const candidates = [];
    const step = 30; // Check every 30 minutes
    let currentTime = new Date(startScan);
    let slotsChecked = 0;
    let rejectedByHumane = 0;
    let rejectedByBusy = 0;

    while (currentTime < endScan) {
        const slotEnd = addMinutes(currentTime, durationMinutes);
        slotsChecked++;

        // Check 1: Is this slot "Humane" for everyone?
        let allHumane = true;

        for (const member of members) {
            const result = isHumane(currentTime, slotEnd, member);
            if (!result.humane) {
                allHumane = false;
                break;
            }
        }

        if (!allHumane) {
            rejectedByHumane++;
            currentTime = addMinutes(currentTime, step);
            continue;
        }

        // Check 2: Is anyone busy?
        let anyoneBusy = false;
        for (const member of members) {
            if (isBusy(currentTime, slotEnd, member.email, busySlots)) {
                anyoneBusy = true;
                break;
            }
        }

        if (anyoneBusy) {
            rejectedByBusy++;
            currentTime = addMinutes(currentTime, step);
            continue;
        }

        // This slot works for everyone!
        candidates.push({
            start: currentTime.toISOString(),
            end: slotEnd.toISOString(),
            confidence: 1.0
        });

        currentTime = addMinutes(currentTime, step);
    }

    console.log("=== SCHEDULER RESULTS ===");
    console.log(`Slots checked: ${slotsChecked}`);
    console.log(`Rejected (not humane): ${rejectedByHumane}`);
    console.log(`Rejected (someone busy): ${rejectedByBusy}`);
    console.log(`Valid candidates: ${candidates.length}`);

    return candidates;
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
