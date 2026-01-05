import { generateText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

/**
 * AI Scheduling Agent - A proper AI agent with tools for timezone analysis,
 * member suggestions, and message generation
 */

// Tool implementations that work with the context
function analyzeTimezoneOverlap(context) {
    if (!context?.members?.length) {
        return { error: 'No group members to analyze' };
    }

    const members = context.members;
    
    // Get UTC offsets for each member
    const memberTimezones = members.map(m => {
        const name = m.name || 'Unknown';
        const tz = m.timezone || 'UTC';
        
        // Estimate offset from timezone name
        const offset = estimateTimezoneOffset(tz);
        
        return { name, timezone: tz, offset, windows: m.windows || [] };
    });

    // Sort by offset
    const sortedByOffset = [...memberTimezones].sort((a, b) => a.offset - b.offset);
    const minOffset = sortedByOffset[0]?.offset || 0;
    const maxOffset = sortedByOffset[sortedByOffset.length - 1]?.offset || 0;
    const timezoneSpread = Math.abs(maxOffset - minOffset);

    // Find best hours (UTC) where everyone is in reasonable hours
    const hourAnalysis = [];
    for (let utcHour = 0; utcHour < 24; utcHour++) {
        let totalScore = 0;
        const memberHours = [];
        
        for (const member of memberTimezones) {
            const localHour = (utcHour + member.offset + 24) % 24;
            const score = getHourScore(localHour);
            totalScore += score;
            memberHours.push({
                name: member.name,
                localHour: Math.round(localHour),
                score,
                timeDescription: describeLocalTime(localHour)
            });
        }
        
        hourAnalysis.push({
            utcHour,
            avgScore: totalScore / members.length,
            isGolden: memberHours.every(m => m.score <= 1),
            memberHours
        });
    }

    // Get best hours
    const goldenHours = hourAnalysis.filter(h => h.isGolden);
    const bestHours = [...hourAnalysis].sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);

    // Generate insights
    let insight = '';
    if (goldenHours.length > 0) {
        insight = `Good news! There are ${goldenHours.length} hour(s) when everyone is in reasonable hours (7am-10pm). Best times are around ${goldenHours.slice(0, 3).map(h => formatUTCHour(h.utcHour)).join(', ')} UTC.`;
    } else {
        insight = `Your group spans ${timezoneSpread} hours across timezones. No time puts everyone in standard hours, but the least disruptive options are around ${bestHours.slice(0, 2).map(h => formatUTCHour(h.utcHour)).join(' or ')} UTC.`;
    }

    // Who would need to adjust
    const adjustments = [];
    if (bestHours.length > 0) {
        const best = bestHours[0];
        for (const mh of best.memberHours) {
            if (mh.score > 1) {
                adjustments.push({
                    member: mh.name,
                    wouldNeedToMeet: `${formatHour(mh.localHour)} (${mh.timeDescription})`,
                    suggestion: getSuggestionForHour(mh.localHour)
                });
            }
        }
    }

    return {
        timezoneSpread: `${timezoneSpread} hours`,
        spreadDescription: describeSpread(timezoneSpread),
        members: memberTimezones.map(m => ({ name: m.name, timezone: m.timezone })),
        goldenWindowExists: goldenHours.length > 0,
        goldenHoursUTC: goldenHours.map(h => formatUTCHour(h.utcHour)),
        bestHoursUTC: bestHours.slice(0, 3).map(h => ({
            time: formatUTCHour(h.utcHour),
            memberTimes: h.memberHours.map(m => `${m.name}: ${formatHour(m.localHour)} (${m.timeDescription})`)
        })),
        insight,
        adjustmentsNeeded: adjustments
    };
}

function suggestChangesForMember(context, memberName, targetTimeUTC) {
    const members = context?.members || [];
    const member = members.find(m => 
        m.name?.toLowerCase().includes(memberName.toLowerCase())
    );
    
    if (!member) {
        return { error: `Could not find member "${memberName}"` };
    }

    const offset = estimateTimezoneOffset(member.timezone || 'UTC');
    const targetHour = targetTimeUTC ? parseInt(targetTimeUTC) : 9;
    const localHour = (targetHour + offset + 24) % 24;
    
    // What window would they need
    const startHour = Math.floor(localHour);
    const endHour = startHour + 1;
    
    const suggestion = {
        memberName: member.name,
        timezone: member.timezone,
        currentWindows: member.windows || [],
        targetTimeUTC: formatUTCHour(targetHour),
        theirLocalTime: `${formatHour(localHour)} (${describeLocalTime(localHour)})`,
        suggestion: getSuggestionForHour(localHour),
        windowToAdd: `${startHour.toString().padStart(2, '0')}:00-${(endHour + 1).toString().padStart(2, '0')}:00`
    };

    return suggestion;
}

function generateMessageForMember(context, memberName, messageType, specificSuggestion) {
    const members = context?.members || [];
    const groupName = context?.group?.name || 'our meeting';
    const organiser = context?.user?.name || 'the organiser';
    
    const member = members.find(m => 
        m.name?.toLowerCase().includes(memberName.toLowerCase())
    );
    
    const firstName = member?.name?.split(' ')[0] || memberName;
    const otherMembers = members.filter(m => m.name !== member?.name).map(m => m.name);
    const othersText = otherMembers.length > 0 
        ? `with ${otherMembers.slice(0, 2).join(' and ')}${otherMembers.length > 2 ? ` and ${otherMembers.length - 2} others` : ''}`
        : '';

    let message = '';
    
    switch (messageType) {
        case 'expand_hours':
            message = `Hi ${firstName}!

We're trying to find a time for ${groupName}${othersText ? ' ' + othersText : ''}. The timezone spread is a bit tricky!

${specificSuggestion || 'Would you be able to add some flexibility to your availability hours?'} That would open up some options that work for everyone.

No pressure if that doesn't work for you - just let me know and we'll figure something else out.

Thanks!
${organiser}`;
            break;

        case 'try_date':
            message = `Hi ${firstName}!

We're looking at some dates for ${groupName}${othersText ? ' ' + othersText : ''}.

${specificSuggestion || 'Could you check your availability for the suggested dates?'}

Thanks!
${organiser}`;
            break;

        default:
            message = `Hi ${firstName}!

We're scheduling ${groupName}${othersText ? ' ' + othersText : ''} and could use your input on times.

${specificSuggestion || 'Let me know what works for you!'}

Thanks!
${organiser}`;
    }

    return {
        recipientName: firstName,
        messageType,
        message: message.trim(),
        copyButtonText: 'Copy message'
    };
}

// Helper functions
function estimateTimezoneOffset(tz) {
    // Common timezone offsets
    const offsets = {
        'UTC': 0, 'GMT': 0,
        'Europe/London': 0, 'Europe/Dublin': 0,
        'Europe/Paris': 1, 'Europe/Berlin': 1, 'Europe/Rome': 1, 'Europe/Madrid': 1,
        'Europe/Moscow': 3, 'Europe/Istanbul': 3,
        'Asia/Dubai': 4,
        'Asia/Kolkata': 5.5, 'Asia/Mumbai': 5.5,
        'Asia/Bangkok': 7, 'Asia/Jakarta': 7,
        'Asia/Singapore': 8, 'Asia/Hong_Kong': 8, 'Asia/Shanghai': 8, 'Asia/Taipei': 8,
        'Asia/Tokyo': 9, 'Asia/Seoul': 9,
        'Australia/Sydney': 10, 'Australia/Melbourne': 10,
        'Pacific/Auckland': 12, 'NZ': 12,
        'America/New_York': -5, 'America/Toronto': -5, 'US/Eastern': -5,
        'America/Chicago': -6, 'US/Central': -6,
        'America/Denver': -7, 'US/Mountain': -7,
        'America/Los_Angeles': -8, 'US/Pacific': -8, 'America/Vancouver': -8,
        'America/Anchorage': -9,
        'Pacific/Honolulu': -10
    };
    
    return offsets[tz] || 0;
}

function getHourScore(hour) {
    if (hour >= 9 && hour <= 17) return 0;      // Core hours
    if (hour >= 8 && hour <= 18) return 0.5;    // Extended
    if (hour >= 7 && hour <= 21) return 1;      // Early/late but ok
    if (hour >= 6 && hour <= 22) return 2;      // Stretch
    return 5;                                    // Unsociable
}

function describeLocalTime(hour) {
    if (hour >= 0 && hour < 6) return 'night';
    if (hour >= 6 && hour < 9) return 'early morning';
    if (hour >= 9 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 14) return 'midday';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'late night';
}

function formatHour(hour) {
    const h = Math.round(hour);
    const period = h >= 12 ? 'pm' : 'am';
    const displayHour = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${displayHour}${period}`;
}

function formatUTCHour(hour) {
    return `${hour.toString().padStart(2, '0')}:00 UTC`;
}

function describeSpread(hours) {
    if (hours <= 3) return 'narrow - easy to find overlap';
    if (hours <= 6) return 'moderate - some flexibility needed';
    if (hours <= 10) return 'wide - limited windows';
    if (hours <= 14) return 'very wide - challenging';
    return 'extreme - nearly opposite sides of the world';
}

function getSuggestionForHour(localHour) {
    if (localHour >= 22 || localHour < 6) {
        return 'Would need to add a late night or very early morning slot';
    }
    if (localHour >= 6 && localHour < 8) {
        return 'Would need to add an early morning slot (before 8am)';
    }
    if (localHour >= 20 && localHour < 22) {
        return 'Would need to add an evening slot (after 8pm)';
    }
    return 'Should be able to accommodate with minor adjustments';
}

// Build enhanced system prompt
function buildSystemPrompt(context) {
    let prompt = `You are an advanced AI scheduling agent for Humane Calendar. You help organisers coordinate meetings across timezones.

## YOUR TOOLS
You have powerful tools - USE THEM:
1. **summarize_group** - Get overview of members, timezones, search status. Use this first!
2. **analyze_timezone_overlap** - Deep analysis of timezone spread and optimal hours
3. **suggest_member_changes** - Specific suggestions for what a member should change
4. **get_member_details** - Look up a specific member's timezone and availability
5. **generate_message** - Create a copy-paste message to send to a member
6. **suggest_meeting_format** - Alternative formats (async, split groups, rotating times)
7. **get_invite_link** - Get the link to invite new members

## WHEN TO USE TOOLS

**"Why can't we find a time?"** → Use analyze_timezone_overlap, then explain clearly

**"What should Sarah do?"** → Use suggest_member_changes with their name

**"Write a message for Mike"** → Use generate_message with friendly tone

**"What are our options?"** → Use suggest_meeting_format for alternatives

**"Who's in the group?"** → Use summarize_group for overview

**"How do I invite someone?"** → Use get_invite_link

## RESPONSE STYLE
1. Be direct and actionable - organisers are busy
2. Use British English
3. When you generate a message, format it clearly for easy copying
4. Don't suggest midnight-6am times
5. Be fair - rotate who takes inconvenient times
6. If stuck, suggest alternative meeting formats

## CONTEXT`;

    if (context?.user) {
        prompt += `\n\nCurrent User: ${context.user.name || 'Unknown'} (${context.user.timezone || 'Unknown timezone'})`;
    }

    if (context?.group) {
        prompt += `\nGroup: "${context.group.name}" with ${context.group.memberCount} members`;
    }

    if (context?.members?.length > 0) {
        prompt += `\n\nGroup Members:`;
        context.members.forEach((m, i) => {
            prompt += `\n${i + 1}. ${m.name} - ${m.timezone || 'Unknown timezone'}`;
        });
    }

    if (context?.suggestions?.length > 0) {
        const fullMatches = context.suggestions.filter(s => s.isFullMatch);
        if (fullMatches.length > 0) {
            prompt += `\n\nSearch Results: ${fullMatches.length} times found when everyone is available!`;
        } else {
            prompt += `\n\nSearch Results: No times when everyone is available. ${context.suggestions.length} partial matches found.`;
        }
    }

    // Include busy slot info if available
    if (context?.busySlots?.length > 0) {
        prompt += `\n\nCalendar Data: ${context.busySlots.length} busy slots from synced calendars are being considered.`;
        prompt += `\nThe scheduling algorithm already excludes times when people are busy.`;
        prompt += `\nIf someone hasn't synced their calendar, they may have conflicts we don't know about.`;
    }

    return prompt;
}

// Additional tool implementations

function getMemberDetails(context, memberName) {
    const members = context?.members || [];
    const member = members.find(m => 
        m.name?.toLowerCase().includes(memberName.toLowerCase())
    );
    
    if (!member) {
        return { error: `Could not find member "${memberName}"` };
    }

    const offset = estimateTimezoneOffset(member.timezone || 'UTC');
    
    return {
        name: member.name,
        email: member.email,
        timezone: member.timezone,
        utcOffset: `UTC${offset >= 0 ? '+' : ''}${offset}`,
        availabilityWindows: member.windows || [],
        currentLocalTime: `Approximately ${formatHour((new Date().getUTCHours() + offset + 24) % 24)}`
    };
}

function suggestMeetingFormat(context) {
    const members = context?.members || [];
    const suggestions = context?.suggestions || [];
    const fullMatches = suggestions.filter(s => s.isFullMatch);
    
    const formats = [];
    
    if (fullMatches.length > 0) {
        formats.push({
            format: 'Standard meeting',
            recommendation: 'Recommended',
            reason: `${fullMatches.length} times work for everyone. Pick one and send the invite.`
        });
    }
    
    if (members.length > 3 && fullMatches.length === 0) {
        formats.push({
            format: 'Split into smaller groups',
            recommendation: 'Consider',
            reason: 'Large groups across timezones are hard. Consider regional sub-meetings.'
        });
    }
    
    // Check timezone spread
    const offsets = members.map(m => estimateTimezoneOffset(m.timezone || 'UTC'));
    const spread = Math.max(...offsets) - Math.min(...offsets);
    
    if (spread > 10) {
        formats.push({
            format: 'Rotating meeting times',
            recommendation: 'Consider',
            reason: `With ${spread}+ hour spread, rotating who takes the inconvenient slot is fairer.`
        });
        
        formats.push({
            format: 'Async update + short sync',
            recommendation: 'Consider', 
            reason: 'Record a video update, then have a shorter live sync with key decisions only.'
        });
    }
    
    if (fullMatches.length === 0 && suggestions.length > 0) {
        const bestPartial = suggestions.reduce((best, s) => 
            (s.availableCount > (best?.availableCount || 0)) ? s : best, null);
        
        if (bestPartial && bestPartial.availableCount >= members.length - 1) {
            formats.push({
                format: 'Proceed without one person',
                recommendation: 'Option',
                reason: `${bestPartial.availableCount}/${members.length} can make the best slot. Record for the absent member.`
            });
        }
    }
    
    return { formats, memberCount: members.length, timezoneSpread: spread };
}

function getInviteLink(context) {
    const group = context?.group;
    if (!group) {
        return { error: 'No group selected' };
    }
    
    // The invite code should be passed in context
    const code = context.inviteCode || group.invite_code || group.id;
    const baseUrl = 'https://www.humanecalendar.com';
    
    return {
        inviteLink: `${baseUrl}/join/${code}`,
        groupName: group.name,
        memberCount: group.memberCount,
        instruction: 'Share this link with people you want to invite. They can set their availability without creating an account.'
    };
}

function summarizeGroup(context) {
    const members = context?.members || [];
    const suggestions = context?.suggestions || [];
    const group = context?.group;
    const busySlots = context?.busySlots || [];
    
    const fullMatches = suggestions.filter(s => s.isFullMatch);
    const partialMatches = suggestions.filter(s => !s.isFullMatch);
    
    // Timezone analysis
    const timezones = members.map(m => ({
        name: m.name,
        tz: m.timezone,
        offset: estimateTimezoneOffset(m.timezone || 'UTC')
    }));
    
    const sortedByTz = [...timezones].sort((a, b) => a.offset - b.offset);
    const spread = sortedByTz.length > 0 
        ? sortedByTz[sortedByTz.length - 1].offset - sortedByTz[0].offset 
        : 0;

    // Calendar sync status
    const membersWithCalendar = new Set(busySlots.map(s => s.email));
    const calendarStatus = members.map(m => ({
        name: m.name,
        hasSyncedCalendar: membersWithCalendar.has(m.email)
    }));
    
    return {
        groupName: group?.name || 'Unknown',
        memberCount: members.length,
        members: members.map(m => `${m.name} (${m.timezone || 'Unknown'})`),
        timezoneSpread: `${spread} hours`,
        easternmost: sortedByTz[sortedByTz.length - 1]?.name,
        westernmost: sortedByTz[0]?.name,
        calendarData: {
            totalBusySlots: busySlots.length,
            membersWithSyncedCalendar: calendarStatus.filter(c => c.hasSyncedCalendar).map(c => c.name),
            membersWithoutCalendar: calendarStatus.filter(c => !c.hasSyncedCalendar).map(c => c.name)
        },
        searchResults: {
            fullMatches: fullMatches.length,
            partialMatches: partialMatches.length,
            status: fullMatches.length > 0 ? 'Ready to book!' : 
                    partialMatches.length > 0 ? 'No perfect time, but options exist' : 
                    'No search run yet'
        }
    };
}

function checkCalendarConflicts(context, timeSlotISO) {
    const busySlots = context?.busySlots || [];
    const members = context?.members || [];
    
    if (!timeSlotISO) {
        return { error: 'No time slot specified' };
    }
    
    const checkTime = new Date(timeSlotISO);
    const checkEnd = new Date(checkTime.getTime() + 60 * 60 * 1000); // Assume 1 hour
    
    const conflicts = [];
    const clear = [];
    const unknown = [];
    
    // Group busy slots by email
    const busyByEmail = {};
    for (const slot of busySlots) {
        if (!busyByEmail[slot.email]) busyByEmail[slot.email] = [];
        busyByEmail[slot.email].push(slot);
    }
    
    for (const member of members) {
        const memberBusy = busyByEmail[member.email] || [];
        
        if (memberBusy.length === 0) {
            // No calendar data for this member
            unknown.push({
                name: member.name,
                reason: 'No calendar synced'
            });
            continue;
        }
        
        // Check if any busy slot conflicts
        let hasConflict = false;
        for (const busy of memberBusy) {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            
            if (checkTime < busyEnd && checkEnd > busyStart) {
                conflicts.push({
                    name: member.name,
                    busyFrom: busyStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    busyUntil: busyEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                });
                hasConflict = true;
                break;
            }
        }
        
        if (!hasConflict) {
            clear.push({ name: member.name });
        }
    }
    
    return {
        timeChecked: checkTime.toISOString(),
        conflicts,
        clear,
        unknown,
        summary: conflicts.length === 0 && unknown.length === 0
            ? 'Everyone is free at this time!'
            : conflicts.length > 0
                ? `${conflicts.length} calendar conflict(s) found`
                : `${unknown.length} member(s) haven't synced their calendar`
    };
}

// Define tools using Vercel AI SDK format
const tools = {
    analyze_timezone_overlap: tool({
        description: 'Analyze the timezone overlap for the current group. Use this when the user asks why there is no overlap, what times would work, or how to find a meeting time.',
        parameters: z.object({}),
        execute: async () => {
            return { needsContext: true };
        }
    }),
    
    suggest_member_changes: tool({
        description: 'Get specific suggestions for what changes a particular member should make to their availability.',
        parameters: z.object({
            memberName: z.string().describe('The name of the member to get suggestions for'),
            targetTimeUTC: z.string().optional().describe('Optional target time in UTC (e.g., "14" for 2pm UTC)')
        }),
        execute: async () => {
            return { needsContext: true };
        }
    }),
    
    generate_message: tool({
        description: 'Generate a friendly copy-paste message to send to a group member asking them to adjust their availability.',
        parameters: z.object({
            memberName: z.string().describe('The name of the member to write the message for'),
            messageType: z.enum(['expand_hours', 'try_date', 'general']).describe('Type of message: expand_hours (ask to add hours), try_date (check specific dates), or general'),
            specificSuggestion: z.string().optional().describe('Optional specific suggestion to include in the message')
        }),
        execute: async () => {
            return { needsContext: true };
        }
    }),
    
    get_member_details: tool({
        description: 'Get detailed information about a specific group member including their timezone, availability windows, and current local time.',
        parameters: z.object({
            memberName: z.string().describe('The name of the member to look up')
        }),
        execute: async () => {
            return { needsContext: true };
        }
    }),
    
    suggest_meeting_format: tool({
        description: 'Suggest alternative meeting formats when a standard meeting is hard to schedule. Good for large groups or extreme timezone spreads.',
        parameters: z.object({}),
        execute: async () => {
            return { needsContext: true };
        }
    }),
    
    get_invite_link: tool({
        description: 'Get the invite link to share with new members so they can join the group and set their availability.',
        parameters: z.object({}),
        execute: async () => {
            return { needsContext: true };
        }
    }),
    
    summarize_group: tool({
        description: 'Get a summary of the current group including members, timezones, calendar sync status, and search results.',
        parameters: z.object({}),
        execute: async () => {
            return { needsContext: true };
        }
    }),
    
    check_calendar_conflicts: tool({
        description: 'Check if a specific time slot has calendar conflicts for any member. Use when discussing a particular meeting time.',
        parameters: z.object({
            timeSlot: z.string().describe('The time slot to check in ISO format (e.g., "2025-01-10T14:00:00Z")')
        }),
        execute: async () => {
            return { needsContext: true };
        }
    })
};

// Simpler system prompt for attendees (no complex analysis needed)
function buildAttendeeSystemPrompt(context) {
    let prompt = `You are a helpful scheduling assistant for Humane Calendar. You're helping an attendee (invitee) understand and set their availability.

## YOUR ROLE
You help attendees:
- Understand what times are being considered for the meeting
- Set their availability windows appropriately
- Understand timezone differences
- Know what happens next

## RULES
1. Be friendly and concise (2-3 sentences max)
2. Use British English
3. Only discuss scheduling topics
4. Don't suggest times between midnight-6am unless asked
5. Explain things simply - attendees don't need complex analysis

## HOW TO CHANGE AVAILABILITY
Tell attendees: "To change your available times, scroll to 'My Available Times' and add or edit your windows. Click 'Save' when done."

## CONTEXT`;

    if (context?.user) {
        prompt += `\n\nYou: ${context.user.name || 'Attendee'} (${context.user.timezone || 'Unknown timezone'})`;
    }

    if (context?.group) {
        prompt += `\nMeeting: "${context.group.name}" with ${context.group.memberCount} people`;
    }

    if (context?.members?.length > 0) {
        const timezones = [...new Set(context.members.map(m => m.timezone).filter(Boolean))];
        if (timezones.length > 1) {
            prompt += `\nTimezones in group: ${timezones.join(', ')}`;
        }
    }

    if (context?.suggestions?.length > 0) {
        const fullMatches = context.suggestions.filter(s => s.isFullMatch);
        if (fullMatches.length > 0) {
            prompt += `\n\nGood news: ${fullMatches.length} times work for everyone!`;
        } else {
            prompt += `\n\nNo times work for everyone yet. The organiser may ask people to adjust.`;
        }
    }

    return prompt;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, context, role = 'attendee' } = req.body;
        
        // Determine if this is an organiser (full agent) or attendee (simple chat)
        const isOrganiser = role === 'organiser';

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("No API key found");
            return res.status(500).json({ error: "API key not configured" });
        }

        const conversationMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        if (isOrganiser) {
            // ORGANISER: Full AI Agent with Gemini 3 Flash and tools
            const systemPrompt = buildSystemPrompt(context);

            const result = await generateText({
                model: google('gemini-3-flash', { apiKey }), // Gemini 3 Flash - latest, fast, supports tools
                system: systemPrompt,
                messages: conversationMessages,
                tools,
                toolChoice: 'auto',
                maxSteps: 5
            });

            // Collect tool results - execute tools with context
            const toolResults = [];
            if (result.steps) {
                for (const step of result.steps) {
                    if (step.toolCalls) {
                        for (const tc of step.toolCalls) {
                            let toolResult;
                            
                            // Safely get args with fallback
                            const args = tc.args || {};
                            
                            switch (tc.toolName) {
                                case 'analyze_timezone_overlap':
                                    toolResult = analyzeTimezoneOverlap(context);
                                    break;
                                case 'suggest_member_changes':
                                    if (!args.memberName) {
                                        toolResult = { error: 'Member name required' };
                                    } else {
                                        toolResult = suggestChangesForMember(context, args.memberName, args.targetTimeUTC);
                                    }
                                    break;
                                case 'generate_message':
                                    if (!args.memberName) {
                                        toolResult = { error: 'Member name required' };
                                    } else {
                                        toolResult = generateMessageForMember(context, args.memberName, args.messageType || 'general', args.specificSuggestion);
                                    }
                                    break;
                                case 'get_member_details':
                                    if (!args.memberName) {
                                        toolResult = { error: 'Member name required' };
                                    } else {
                                        toolResult = getMemberDetails(context, args.memberName);
                                    }
                                    break;
                                case 'suggest_meeting_format':
                                    toolResult = suggestMeetingFormat(context);
                                    break;
                                case 'get_invite_link':
                                    toolResult = getInviteLink(context);
                                    break;
                                case 'summarize_group':
                                    toolResult = summarizeGroup(context);
                                    break;
                                case 'check_calendar_conflicts':
                                    if (!args.timeSlot) {
                                        toolResult = { error: 'Time slot required' };
                                    } else {
                                        toolResult = checkCalendarConflicts(context, args.timeSlot);
                                    }
                                    break;
                            }
                            
                            if (toolResult) {
                                toolResults.push({ tool: tc.toolName, result: toolResult });
                            }
                        }
                    }
                }
            }

            return res.status(200).json({ 
                response: result.text,
                toolResults: toolResults.length > 0 ? toolResults : undefined
            });

        } else {
            // ATTENDEE: Simple chat with Gemini 3 Flash (same model for consistency)
            const systemPrompt = buildAttendeeSystemPrompt(context);

            const result = await generateText({
                model: google('gemini-3-flash', { apiKey }), // Gemini 3 Flash for attendees too
                system: systemPrompt,
                messages: conversationMessages
                // No tools for attendees - simpler experience
            });

            return res.status(200).json({ response: result.text });
        }

    } catch (error) {
        console.error("Chat API error:", error);
        
        const errorMessage = error.message || String(error);
        
        if (errorMessage.includes('API key') || errorMessage.includes('API_KEY')) {
            return res.status(500).json({ error: "Invalid API key" });
        }
        if (errorMessage.includes('quota') || errorMessage.includes('429')) {
            return res.status(429).json({ error: "API quota exceeded" });
        }
        
        return res.status(500).json({ error: errorMessage });
    }
}
