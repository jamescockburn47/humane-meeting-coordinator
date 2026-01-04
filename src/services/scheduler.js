import { toZonedTime } from 'date-fns-tz';
import { addMinutes } from 'date-fns';

/**
 * The Core Algorithm: Find intersection of "Humane Windows" minus "Busy Slots".
 * 
 * This function finds time slots that:
 * 1. Fall within EVERY member's availability windows
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
        console.log(`  Legacy start/end:`, m.humane_start_local, m.humane_end_local);
    });

    console.log("Busy slots:", busySlots.length);

    // Define the Global Search Window
    const startScan = new Date(rangeStartStr);
    startScan.setHours(0, 0, 0, 0);

    const endScan = new Date(rangeEndStr);
    endScan.setHours(23, 59, 0, 0);

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
        let rejectReason = null;

        for (const member of members) {
            const result = isHumane(currentTime, slotEnd, member);
            if (!result.humane) {
                allHumane = false;
                rejectReason = `${member.email}: ${result.reason}`;
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
    
    if (candidates.length > 0) {
        console.log("First 5 candidates:");
        candidates.slice(0, 5).forEach(c => {
            console.log(`  ${new Date(c.start).toLocaleString()} - ${new Date(c.end).toLocaleString()}`);
        });
    }

    return candidates;
}

/**
 * Check if a time slot falls within a member's availability windows.
 * Returns { humane: boolean, reason: string }
 */
function isHumane(startUtc, endUtc, member) {
    // Convert UTC slot to User's Local Time
    const zone = member.timezone || 'UTC';
    
    let localStart, localEnd;
    try {
        localStart = toZonedTime(startUtc, zone);
        localEnd = toZonedTime(endUtc, zone);
    } catch (e) {
        console.error(`Invalid timezone for ${member.email}: ${zone}`);
        localStart = startUtc;
        localEnd = endUtc;
    }

    const startHour = localStart.getHours() + (localStart.getMinutes() / 60);
    const endHour = localEnd.getHours() + (localEnd.getMinutes() / 60);
    const day = localStart.getDay(); // 0=Sun, 6=Sat

    // Check Multi-Window Logic
    const windows = member.humane_windows;
    
    if (windows && Array.isArray(windows) && windows.length > 0) {
        for (const win of windows) {
            // Parse window times
            const [hS, mS] = (win.start || "09:00").split(':').map(Number);
            const wStart = hS + (mS / 60);
            const [hE, mE] = (win.end || "17:00").split(':').map(Number);
            const wEnd = hE + (mE / 60);

            // Check day type
            const isWeekend = (day === 0 || day === 6);
            const dayMatches = checkDayType(win.type, day);
            
            if (!dayMatches) continue;

            // Check if slot fits within this window
            if (startHour >= wStart && endHour <= wEnd) {
                return { humane: true, reason: `Fits in window ${win.start}-${win.end}` };
            }
        }
        
        return { 
            humane: false, 
            reason: `${startHour.toFixed(1)}-${endHour.toFixed(1)} outside windows on day ${day}` 
        };
    }

    // Fallback to Legacy Single Window
    if (day === 0 || day === 6) {
        return { humane: false, reason: `Weekend (day ${day})` };
    }

    const [hS, mS] = (member.humane_start_local || "09:00").split(':').map(Number);
    const prefStart = hS + (mS / 60);
    const [hE, mE] = (member.humane_end_local || "17:00").split(':').map(Number);
    const prefEnd = hE + (mE / 60);

    if (startHour >= prefStart && endHour <= prefEnd) {
        return { humane: true, reason: 'Fits legacy window' };
    }

    return { 
        humane: false, 
        reason: `${startHour.toFixed(1)}-${endHour.toFixed(1)} outside ${prefStart}-${prefEnd}` 
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

        // Check for overlap: slot overlaps if it starts before busy ends AND ends after busy starts
        if (slotStart < busyEnd && slotEnd > busyStart) {
            return true;
        }
    }
    return false;
}
