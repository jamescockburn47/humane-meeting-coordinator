import { toZonedTime } from 'date-fns-tz';
import { addMinutes } from 'date-fns';

/**
 * The Core Algorithm: Find intersection of "Humane Windows" minus "Busy Slots".
 * 
 * This function finds time slots that:
 * 1. Fall within members' availability windows (in their local timezone)
 * 2. Don't overlap with members' busy times
 * 3. Respects "Night Protection" - no slots between midnight-6am unless user opts in
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
 * @param {Object} member - Member with timezone, humane_windows, and night_owl preference
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

    // NIGHT PROTECTION: Reject slots between midnight and 6am unless user has opted in
    // This prevents suggesting 3am meetings even if someone's window technically allows it
    const isNightTime = startHour < 6 || endHour < 6;
    const isNightOwl = member.night_owl === true;
    
    if (isNightTime && !isNightOwl) {
        return { 
            humane: false, 
            reason: `Night protection: ${startHour.toFixed(0)}:00 is between midnight-6am` 
        };
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

/**
 * Analyze scheduling results and generate smart suggestions
 * This helps users understand WHY there are no full matches and WHAT to do about it
 */
export function analyzeSchedulingResults(suggestions, members) {
    const analysis = {
        hasFullMatches: false,
        fullMatchCount: 0,
        partialMatchCount: 0,
        blockerAnalysis: [],
        suggestions: [],
        bestPartialSlot: null
    };

    if (!suggestions || suggestions.length === 0) {
        analysis.suggestions.push({
            type: 'no_results',
            message: 'No times found. Try expanding the date range or ask members to add more availability windows.'
        });
        return analysis;
    }

    const fullMatches = suggestions.filter(s => s.isFullMatch);
    const partialMatches = suggestions.filter(s => !s.isFullMatch);

    analysis.hasFullMatches = fullMatches.length > 0;
    analysis.fullMatchCount = fullMatches.length;
    analysis.partialMatchCount = partialMatches.length;

    if (fullMatches.length > 0) {
        analysis.suggestions.push({
            type: 'success',
            message: `Found ${fullMatches.length} times when everyone is available. Pick one and send the invite!`
        });
        return analysis;
    }

    // No full matches - analyze who is blocking
    if (partialMatches.length > 0) {
        const blockerCount = {};
        const blockerReasons = {};

        for (const slot of partialMatches) {
            for (const unavailable of slot.unavailableMembers || []) {
                const name = unavailable.name || unavailable.email?.split('@')[0] || 'Unknown';
                blockerCount[name] = (blockerCount[name] || 0) + 1;
                
                if (!blockerReasons[name]) {
                    blockerReasons[name] = unavailable.reason || 'Outside their hours';
                }
            }
        }

        // Sort by who blocks the most
        const sortedBlockers = Object.entries(blockerCount)
            .map(([name, count]) => ({
                name,
                blockCount: count,
                percentage: Math.round((count / partialMatches.length) * 100),
                reason: blockerReasons[name]
            }))
            .sort((a, b) => b.blockCount - a.blockCount);

        analysis.blockerAnalysis = sortedBlockers;

        // Best partial slot (highest attendance)
        const bestPartial = partialMatches.reduce((best, current) => 
            (current.attendanceRatio > (best?.attendanceRatio || 0)) ? current : best
        , null);
        analysis.bestPartialSlot = bestPartial;

        // Generate specific suggestions
        if (sortedBlockers.length > 0) {
            const topBlocker = sortedBlockers[0];
            
            if (topBlocker.percentage >= 80) {
                analysis.suggestions.push({
                    type: 'major_blocker',
                    member: topBlocker.name,
                    message: `${topBlocker.name} is unavailable for ${topBlocker.percentage}% of partial slots. They may need to expand their availability hours.`
                });
            } else if (sortedBlockers.length >= 2 && sortedBlockers[0].percentage >= 50 && sortedBlockers[1].percentage >= 50) {
                analysis.suggestions.push({
                    type: 'multiple_blockers',
                    members: [sortedBlockers[0].name, sortedBlockers[1].name],
                    message: `Both ${sortedBlockers[0].name} and ${sortedBlockers[1].name} have limited overlap. Consider finding a time that works for most and checking if others can join.`
                });
            }

            // Check for timezone spread issue
            const timezones = members.map(m => m.timezone).filter(Boolean);
            const uniqueTZ = [...new Set(timezones)];
            if (uniqueTZ.length >= 3) {
                analysis.suggestions.push({
                    type: 'timezone_spread',
                    message: `Your group spans ${uniqueTZ.length} timezones. Evening calls (17:00-21:00) in the middle timezone often create the best overlap.`
                });
            }
        }

        // Suggest using partial attendance
        if (bestPartial && bestPartial.availableMembers?.length >= 2) {
            const available = bestPartial.availableMembers.length;
            const total = members.length;
            analysis.suggestions.push({
                type: 'use_partial',
                message: `The best partial slot has ${available}/${total} members available. You can still send the invite and let others join if they can.`
            });
        }
    }

    return analysis;
}

/**
 * Calculate the theoretical timezone overlap window for a group
 * This finds when all members could potentially meet based on their timezones alone
 * (ignoring their specific availability windows)
 * 
 * @param {Array} members - Array of members with timezone info
 * @returns {Object} Analysis with golden window, fair times, and suggestions
 */
export function calculateTimezoneOverlap(members) {
    if (!members || members.length === 0) {
        return { error: 'No members provided' };
    }

    // Get UTC offsets for each member's timezone
    const memberTimezones = members.map(m => {
        const tz = m.timezone || 'UTC';
        const name = m.display_name || m.name || m.email?.split('@')[0] || 'Unknown';
        
        // Get current UTC offset for this timezone
        const now = new Date();
        let offset = 0;
        try {
            const localTime = toZonedTime(now, tz);
            // Calculate offset in hours
            const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
            const localHours = localTime.getHours() + localTime.getMinutes() / 60;
            offset = localHours - utcHours;
            // Handle day boundary
            if (offset > 12) offset -= 24;
            if (offset < -12) offset += 24;
        } catch (e) {
            console.error(`Error getting offset for ${tz}:`, e);
        }
        
        return { name, email: m.email, timezone: tz, offset, windows: m.humane_windows || [] };
    });

    // Sort by offset to understand timezone spread
    const sortedByOffset = [...memberTimezones].sort((a, b) => a.offset - b.offset);
    const minOffset = sortedByOffset[0].offset;
    const maxOffset = sortedByOffset[sortedByOffset.length - 1].offset;
    const timezoneSpread = maxOffset - minOffset;

    // Find the "golden window" - hours that are 7am-10pm for everyone
    // For each UTC hour (0-23), check what local time it is for each member
    const hourScores = [];
    for (let utcHour = 0; utcHour < 24; utcHour++) {
        let totalScore = 0;
        const memberHours = [];
        
        for (const member of memberTimezones) {
            let localHour = (utcHour + member.offset + 24) % 24;
            const score = calculateHourFairness(localHour);
            totalScore += score;
            memberHours.push({
                name: member.name,
                localHour,
                score,
                description: describeHour(localHour)
            });
        }
        
        hourScores.push({
            utcHour,
            averageScore: totalScore / members.length,
            totalScore,
            memberHours,
            isGolden: memberHours.every(m => m.score <= 1) // Everyone in reasonable hours
        });
    }

    // Sort by best (lowest) score
    const rankedHours = [...hourScores].sort((a, b) => a.averageScore - b.averageScore);
    const goldenHours = hourScores.filter(h => h.isGolden);
    const bestHours = rankedHours.slice(0, 5);

    // Generate human-readable analysis
    const analysis = {
        memberTimezones,
        timezoneSpread: {
            hours: timezoneSpread,
            description: describeTimezoneSpread(timezoneSpread),
            easternmost: sortedByOffset[sortedByOffset.length - 1],
            westernmost: sortedByOffset[0]
        },
        goldenWindow: goldenHours.length > 0 ? {
            exists: true,
            utcHours: goldenHours.map(h => h.utcHour),
            description: `${goldenHours.length} hour(s) when everyone is in reasonable hours (7am-10pm)`
        } : {
            exists: false,
            description: 'No time when everyone is in reasonable hours (7am-10pm)'
        },
        bestHours: bestHours.map(h => ({
            utcHour: h.utcHour,
            score: h.averageScore.toFixed(2),
            isGolden: h.isGolden,
            memberTimes: h.memberHours.map(m => `${m.name}: ${formatHour(m.localHour)} (${m.description})`)
        })),
        suggestions: generateTimezonesuggestions(memberTimezones, goldenHours, bestHours, timezoneSpread)
    };

    return analysis;
}

/**
 * Calculate fairness score for a specific hour (0 = perfect, higher = worse)
 */
function calculateHourFairness(hour) {
    if (hour >= 9 && hour <= 17) return 0;      // Core business hours - perfect
    if (hour >= 8 && hour <= 18) return 0.5;    // Extended business hours - good
    if (hour >= 7 && hour <= 21) return 1;      // Early morning/evening - acceptable
    if (hour >= 6 && hour <= 22) return 2;      // Early bird/night owl territory
    return 5;                                    // Unsociable hours (before 6am or after 10pm)
}

/**
 * Describe an hour in human terms
 */
function describeHour(hour) {
    if (hour >= 0 && hour < 6) return 'night';
    if (hour >= 6 && hour < 9) return 'early morning';
    if (hour >= 9 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 14) return 'midday';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'late night';
}

/**
 * Format hour as readable time
 */
function formatHour(hour) {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'pm' : 'am';
    const displayHour = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return m > 0 ? `${displayHour}:${m.toString().padStart(2, '0')}${period}` : `${displayHour}${period}`;
}

/**
 * Describe timezone spread
 */
function describeTimezoneSpread(hours) {
    if (hours <= 3) return 'Narrow spread - easy to find overlap';
    if (hours <= 6) return 'Moderate spread - some flexibility needed';
    if (hours <= 10) return 'Wide spread - limited overlap windows';
    if (hours <= 14) return 'Very wide spread - challenging, may need early/late times';
    return 'Extreme spread - nearly opposite sides of the world';
}

/**
 * Generate specific suggestions based on timezone analysis
 */
function generateTimezonesuggestions(members, goldenHours, bestHours, spread) {
    const suggestions = [];

    if (goldenHours.length === 0) {
        suggestions.push({
            type: 'no_golden',
            priority: 'high',
            message: 'No time works for everyone during normal hours. Someone will need to stretch their availability.'
        });

        // Identify who would need to adjust for the best hour
        if (bestHours.length > 0) {
            const best = bestHours[0];
            const whoNeedsToAdjust = best.memberHours
                .filter(m => m.score > 1)
                .map(m => ({
                    name: m.name,
                    wouldBe: `${formatHour(m.localHour)} (${m.description})`,
                    adjustment: suggestAdjustment(m.localHour)
                }));

            if (whoNeedsToAdjust.length > 0) {
                suggestions.push({
                    type: 'adjustment_needed',
                    priority: 'high',
                    forBestHour: formatHour(best.utcHour) + ' UTC',
                    adjustments: whoNeedsToAdjust
                });
            }
        }
    } else if (goldenHours.length <= 2) {
        suggestions.push({
            type: 'narrow_golden',
            priority: 'medium',
            message: `Only ${goldenHours.length} hour(s) work for everyone. Try to schedule within ${goldenHours.map(h => formatHour(h.utcHour) + ' UTC').join(' or ')}.`
        });
    }

    if (spread > 10) {
        suggestions.push({
            type: 'extreme_spread',
            priority: 'info',
            message: 'Your group spans ' + spread.toFixed(0) + ' hours. Consider rotating meeting times or splitting into regional sub-meetings.'
        });
    }

    return suggestions;
}

/**
 * Suggest what adjustment a member could make based on the hour they'd need to meet
 */
function suggestAdjustment(localHour) {
    if (localHour >= 22 || localHour < 6) {
        return `Would need to add a late night/early morning window`;
    }
    if (localHour >= 6 && localHour < 7) {
        return `Would need to add 6-7am to availability`;
    }
    if (localHour >= 21 && localHour < 22) {
        return `Would need to add 9-10pm to availability`;
    }
    return `Would need to adjust their hours`;
}

/**
 * Given a target meeting time, suggest what each unavailable member would need to change
 * 
 * @param {Array} members - All group members
 * @param {string} targetSlotISO - Target meeting time in ISO format
 * @param {number} duration - Meeting duration in minutes
 * @returns {Array} Suggestions for each member who can't make it
 */
export function suggestMemberAdjustments(members, targetSlotISO, duration = 60) {
    const targetTime = new Date(targetSlotISO);
    const suggestions = [];

    for (const member of members) {
        const tz = member.timezone || 'UTC';
        const name = member.display_name || member.name || member.email?.split('@')[0] || 'Unknown';
        
        // Convert target time to member's local timezone
        let localTime;
        try {
            localTime = toZonedTime(targetTime, tz);
        } catch (e) {
            localTime = new Date(targetTime);
        }

        const localHour = localTime.getHours();
        const localMinutes = localTime.getMinutes();
        const endHour = localHour + (duration / 60);
        const dayOfWeek = localTime.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Check if member has this time in their windows
        const windows = member.humane_windows || [];
        let canMakeIt = false;
        let matchingWindow = null;

        for (const win of windows) {
            if (!checkDayType(win.type, dayOfWeek)) continue;
            
            const [hS, mS] = (win.start || "09:00").split(':').map(Number);
            const [hE, mE] = (win.end || "17:00").split(':').map(Number);
            const winStart = hS + mS / 60;
            const winEnd = hE + mE / 60;
            
            const slotStart = localHour + localMinutes / 60;
            
            if (slotStart >= winStart && endHour <= winEnd) {
                canMakeIt = true;
                matchingWindow = win;
                break;
            }
        }

        if (canMakeIt) {
            suggestions.push({
                email: member.email,
                name,
                canMakeIt: true,
                localTime: formatTimeForDisplay(localTime),
                timezone: tz
            });
        } else {
            // Generate specific suggestion
            const localTimeStr = formatTimeForDisplay(localTime);
            const suggestion = generateSpecificSuggestion(localHour, endHour, isWeekend, windows);
            
            suggestions.push({
                email: member.email,
                name,
                canMakeIt: false,
                localTime: localTimeStr,
                timezone: tz,
                suggestion: suggestion.text,
                windowToAdd: suggestion.window,
                impact: suggestion.impact
            });
        }
    }

    return suggestions;
}

/**
 * Format a date for display
 */
function formatTimeForDisplay(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = dayNames[date.getDay()];
    const dateNum = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    
    const timeStr = minutes > 0 
        ? `${displayHour}:${minutes.toString().padStart(2, '0')}${period}`
        : `${displayHour}${period}`;
    
    return `${day} ${dateNum} ${month}, ${timeStr}`;
}

/**
 * Generate a specific suggestion for what window to add
 */
function generateSpecificSuggestion(startHour, endHour, isWeekend, existingWindows) {
    // Round to nice window boundaries
    const windowStart = Math.floor(startHour);
    const windowEnd = Math.ceil(endHour);
    
    const startStr = `${windowStart.toString().padStart(2, '0')}:00`;
    const endStr = `${windowEnd.toString().padStart(2, '0')}:00`;
    
    // Determine the right day type
    let dayType = isWeekend ? 'weekend' : 'weekday';
    
    // Check if they already have windows - suggest extending vs adding new
    const hasWindows = existingWindows && existingWindows.length > 0;
    
    let text, impact;
    
    if (startHour < 7) {
        text = `Add an early morning window (${startStr}-${endStr})`;
        impact = 'This is early but would enable this meeting time';
    } else if (startHour >= 21) {
        text = `Add a late evening window (${startStr}-${endStr})`;
        impact = 'This is late but would enable this meeting time';
    } else if (hasWindows) {
        text = `Extend your availability to include ${startStr}-${endStr}`;
        impact = 'A small adjustment that could open up new options';
    } else {
        text = `Add ${startStr}-${endStr} on ${isWeekend ? 'weekends' : 'weekdays'}`;
        impact = 'This would enable meetings at this time';
    }

    return {
        text,
        window: { start: startStr, end: endStr, type: dayType },
        impact
    };
}

/**
 * Find fair times across the group - times that minimize inconvenience for everyone
 * 
 * @param {Array} members - Group members with timezone info
 * @param {string} startDate - Start of date range (YYYY-MM-DD)
 * @param {string} endDate - End of date range (YYYY-MM-DD)
 * @param {number} duration - Meeting duration in minutes
 * @returns {Array} Ranked list of fair time slots
 */
export function findFairTimes(members, startDate, endDate, duration = 60) {
    if (!members || members.length === 0) return [];

    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    const startScan = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0));
    const endScan = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 0));

    const fairSlots = [];
    const step = 30; // Check every 30 minutes
    let currentTime = new Date(startScan);

    while (currentTime < endScan) {
        const slotEnd = addMinutes(currentTime, duration);
        
        // Calculate fairness score for this slot
        let totalInconvenience = 0;
        const memberDetails = [];
        let anyoneInUnsociableHours = false;

        for (const member of members) {
            const tz = member.timezone || 'UTC';
            const name = member.display_name || member.name || member.email?.split('@')[0] || 'Unknown';
            
            let localTime;
            try {
                localTime = toZonedTime(currentTime, tz);
            } catch (e) {
                localTime = new Date(currentTime);
            }

            const localHour = localTime.getHours() + localTime.getMinutes() / 60;
            const score = calculateHourFairness(localHour);
            
            if (score >= 5) anyoneInUnsociableHours = true;
            totalInconvenience += score;
            
            memberDetails.push({
                name,
                localTime: formatTimeForDisplay(localTime),
                localHour,
                score,
                description: describeHour(localHour)
            });
        }

        // Only include if no one is in truly unsociable hours (midnight-6am)
        if (!anyoneInUnsociableHours) {
            fairSlots.push({
                start: currentTime.toISOString(),
                end: slotEnd.toISOString(),
                fairnessScore: totalInconvenience / members.length,
                totalInconvenience,
                memberDetails,
                isOptimal: totalInconvenience === 0
            });
        }

        currentTime = addMinutes(currentTime, step);
    }

    // Sort by fairness score (lower is better) and return top 20
    return fairSlots
        .sort((a, b) => a.fairnessScore - b.fairnessScore)
        .slice(0, 20);
}

/**
 * Generate a copy-paste message for a specific member
 * 
 * @param {Object} params - Message parameters
 * @returns {string} Ready-to-send message
 */
export function generateMemberMessage(params) {
    const { 
        memberName, 
        groupName, 
        organiserName,
        suggestionType,
        specificSuggestion,
        inviteLink,
        otherMembers = []
    } = params;

    const firstName = memberName.split(' ')[0];
    const othersText = otherMembers.length > 0 
        ? `with ${otherMembers.slice(0, 2).join(', ')}${otherMembers.length > 2 ? ` and ${otherMembers.length - 2} others` : ''}`
        : '';

    switch (suggestionType) {
        case 'expand_hours':
            return `Hi ${firstName}!

We're trying to find a time for ${groupName || 'a meeting'}${othersText ? ' ' + othersText : ''}. The timezone spread is tricky!

${specificSuggestion || 'Would you be able to add some flexibility to your availability hours?'} That would open up some options that work for everyone.

No pressure if that doesn't work - let me know and we'll figure something else out.

${inviteLink ? `Update your times here: ${inviteLink}` : ''}

Thanks!
${organiserName || ''}`.trim();

        case 'try_date':
            return `Hi ${firstName}!

We're looking at some dates for ${groupName || 'our meeting'}${othersText ? ' ' + othersText : ''}.

${specificSuggestion || 'Could you check your availability for the suggested dates?'}

${inviteLink ? `Add your availability here: ${inviteLink}` : ''}

Thanks!
${organiserName || ''}`.trim();

        case 'general':
        default:
            return `Hi ${firstName}!

We're scheduling ${groupName || 'a meeting'}${othersText ? ' ' + othersText : ''} and could use your input on times that work for you.

${specificSuggestion || ''}

${inviteLink ? `You can set your availability here: ${inviteLink}` : ''}

Thanks!
${organiserName || ''}`.trim();
    }
}
