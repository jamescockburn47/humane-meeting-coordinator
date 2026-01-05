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
    let prompt = `You are an AI scheduling agent for Humane Calendar. You help people find meeting times across timezones.

## YOUR CAPABILITIES
You have access to tools that can:
1. **analyze_timezone_overlap** - Analyze the group's timezone spread and find optimal meeting hours
2. **suggest_member_changes** - Get specific suggestions for what a member should change
3. **generate_message** - Create a copy-paste message to send to a member

## HOW TO RESPOND

When someone asks about finding times or why there's no overlap:
1. ALWAYS use the analyze_timezone_overlap tool first
2. Explain the timezone situation clearly
3. If someone needs to adjust, offer to generate a message for them

When someone asks for a message:
1. Use generate_message tool
2. Present the message in a copyable format
3. Keep tone friendly and non-demanding

## RULES
1. ONLY discuss scheduling topics. Redirect other questions politely.
2. Be concise - 2-3 sentences for simple questions
3. Use British English
4. Never suggest times between midnight-6am unless specifically asked
5. Be fair - don't always ask the same person to adjust
6. When presenting messages, format them clearly so they're easy to copy

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

    return prompt;
}

// Define tools using Vercel AI SDK format
const tools = {
    analyze_timezone_overlap: tool({
        description: 'Analyze the timezone overlap for the current group. Use this when the user asks why there is no overlap, what times would work, or how to find a meeting time.',
        parameters: z.object({}),
        execute: async (params, { context }) => {
            return analyzeTimezoneOverlap(context);
        }
    }),
    
    suggest_member_changes: tool({
        description: 'Get specific suggestions for what changes a particular member should make to their availability.',
        parameters: z.object({
            memberName: z.string().describe('The name of the member to get suggestions for'),
            targetTimeUTC: z.string().optional().describe('Optional target time in UTC (e.g., "14" for 2pm UTC)')
        }),
        execute: async ({ memberName, targetTimeUTC }, { context }) => {
            return suggestChangesForMember(context, memberName, targetTimeUTC);
        }
    }),
    
    generate_message: tool({
        description: 'Generate a friendly copy-paste message to send to a group member asking them to adjust their availability.',
        parameters: z.object({
            memberName: z.string().describe('The name of the member to write the message for'),
            messageType: z.enum(['expand_hours', 'try_date', 'general']).describe('Type of message: expand_hours (ask to add hours), try_date (check specific dates), or general'),
            specificSuggestion: z.string().optional().describe('Optional specific suggestion to include in the message')
        }),
        execute: async ({ memberName, messageType, specificSuggestion }, { context }) => {
            return generateMessageForMember(context, memberName, messageType, specificSuggestion);
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
                model: google('gemini-2.0-flash-001', { apiKey }), // Using 2.0 as 3.0 may not be stable
                system: systemPrompt,
                messages: conversationMessages,
                tools,
                toolChoice: 'auto',
                maxSteps: 5
            });

            // Collect tool results
            const toolResults = [];
            if (result.steps) {
                for (const step of result.steps) {
                    if (step.toolCalls) {
                        for (const tc of step.toolCalls) {
                            let toolResult;
                            if (tc.toolName === 'analyze_timezone_overlap') {
                                toolResult = analyzeTimezoneOverlap(context);
                            } else if (tc.toolName === 'suggest_member_changes') {
                                toolResult = suggestChangesForMember(context, tc.args.memberName, tc.args.targetTimeUTC);
                            } else if (tc.toolName === 'generate_message') {
                                toolResult = generateMessageForMember(context, tc.args.memberName, tc.args.messageType, tc.args.specificSuggestion);
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
            // ATTENDEE: Simple chat with Gemini 1.5 Flash (cheaper, faster)
            const systemPrompt = buildAttendeeSystemPrompt(context);

            const result = await generateText({
                model: google('gemini-1.5-flash', { apiKey }), // Cheaper model for attendees
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
