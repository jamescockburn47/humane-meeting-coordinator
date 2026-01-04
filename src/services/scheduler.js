import { toZonedTime, format } from 'date-fns-tz';
import { addMinutes, isWithinInterval, parseISO } from 'date-fns';

/**
 * The Core Algorithm: Find intersection of "Humane Windows" minus "Busy Slots".
 */
export function findCommonHumaneSlots(members, busySlots, rangeStartStr, rangeEndStr, durationMinutes) {
    // Define the Global Search Window based on input range
    const startScan = new Date(rangeStartStr);
    startScan.setHours(0, 0, 0, 0);

    const endScan = new Date(rangeEndStr);
    endScan.setHours(23, 59, 0, 0);

    const candidates = [];
    const step = 30; // Check every 30 minutes

    let currentTime = new Date(startScan);

    while (currentTime < endScan) {
        const slotEnd = addMinutes(currentTime, durationMinutes);

        // Check 1: Is this slot "Humane" for everyone?
        let allHumane = true;

        for (const member of members) {
            if (!isHumane(currentTime, slotEnd, member)) {
                allHumane = false;
                break;
            }
        }

        // Check 2: Is anyone busy?
        if (allHumane) {
            let anyoneBusy = false;
            for (const member of members) {
                if (isBusy(currentTime, slotEnd, member.email, busySlots)) {
                    anyoneBusy = true;
                    break;
                }
            }

            if (!anyoneBusy) {
                candidates.push({
                    start: new Date(currentTime),
                    end: new Date(slotEnd),
                    confidence: 1.0
                });
            }
        }

        currentTime = addMinutes(currentTime, step);
    }

    return candidates;
}

function isHumane(startUtc, endUtc, member) {
    // Convert UTC slot to User's Local Time
    const zone = member.timezone || 'UTC';
    const localStart = toZonedTime(startUtc, zone);
    const localEnd = toZonedTime(endUtc, zone);

    const startHour = localStart.getHours() + (localStart.getMinutes() / 60);
    const endHour = localEnd.getHours() + (localEnd.getMinutes() / 60);

    // Check Day of Week (0=Sun, 6=Sat)
    const day = localStart.getDay();

    // 1. New "Multi-Window" Logic
    if (member.humane_windows && Array.isArray(member.humane_windows) && member.humane_windows.length > 0) {
        // Return TRUE if slot fits faithfully inside ANY of the windows
        return member.humane_windows.some(win => {
            // Check Day Type (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat)
            const isStandardWeekend = (day === 0 || day === 6);
            const isMEWeekend = (day === 5 || day === 6);

            if (win.type === 'weekday' && isStandardWeekend) return false;
            if (win.type === 'weekend' && !isStandardWeekend) return false;

            if (win.type === 'me_workday' && isMEWeekend) return false; // Sun-Thu
            if (win.type === 'me_weekend' && !isMEWeekend) return false; // Fri-Sat

            // 'everyday' passes all checks

            // Check Time
            const [hS, mS] = win.start.split(':').map(Number);
            const wStart = hS + (mS / 60);
            const [hE, mE] = win.end.split(':').map(Number);
            const wEnd = hE + (mE / 60);

            return startHour >= wStart && endHour <= wEnd;
        });
    }

    // 2. Fallback to Legacy Single Window
    // Hard check for weekends in legacy mode
    if (day === 0 || day === 6) return false;

    const [hS, mS] = (member.humane_start_local || "09:00").split(':').map(Number);
    const prefStart = hS + (mS / 60);

    const [hE, mE] = (member.humane_end_local || "17:00").split(':').map(Number);
    const prefEnd = hE + (mE / 60);

    return startHour >= prefStart && endHour <= prefEnd;
}

function isBusy(slotStart, slotEnd, email, allBusySlots) {
    // Filter slots for this user
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
