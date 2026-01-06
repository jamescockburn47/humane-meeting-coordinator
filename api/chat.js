import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * Simplified AI Scheduling Assistant
 * No complex tool calling - just smart prompts with pre-computed analysis
 */

// Helper to estimate timezone offset
function estimateTimezoneOffset(tz) {
    const offsets = {
        'UTC': 0, 'GMT': 0,
        'Europe/London': 0, 'Europe/Dublin': 0,
        'Europe/Paris': 1, 'Europe/Berlin': 1, 'Europe/Rome': 1,
        'Europe/Moscow': 3, 'Europe/Istanbul': 3,
        'Asia/Dubai': 4,
        'Asia/Kolkata': 5.5, 'Asia/Mumbai': 5.5,
        'Asia/Bangkok': 7, 'Asia/Jakarta': 7,
        'Asia/Singapore': 8, 'Asia/Hong_Kong': 8, 'Asia/Shanghai': 8,
        'Asia/Tokyo': 9, 'Asia/Seoul': 9,
        'Australia/Sydney': 10, 'Australia/Melbourne': 10,
        'Pacific/Auckland': 12, 'NZ': 12,
        'America/New_York': -5, 'America/Toronto': -5, 'US/Eastern': -5,
        'America/Chicago': -6, 'US/Central': -6,
        'America/Denver': -7, 'US/Mountain': -7,
        'America/Los_Angeles': -8, 'US/Pacific': -8,
        'Pacific/Honolulu': -10
    };
    return offsets[tz] || 0;
}

function formatHour(hour) {
    const h = Math.round(hour);
    const period = h >= 12 ? 'pm' : 'am';
    const displayHour = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${displayHour}${period}`;
}

// Analyze timezone overlap for the group
function analyzeGroup(context) {
    if (!context?.members?.length) return null;
    
    const members = context.members;
    const offsets = members.map(m => ({
        name: m.name,
        tz: m.timezone,
        offset: estimateTimezoneOffset(m.timezone || 'UTC')
    }));
    
    const sorted = [...offsets].sort((a, b) => a.offset - b.offset);
    const spread = sorted.length > 0 ? sorted[sorted.length - 1].offset - sorted[0].offset : 0;
    
    // Find best UTC hours
    const hourScores = [];
    for (let utc = 0; utc < 24; utc++) {
        let score = 0;
        const memberTimes = [];
        for (const m of offsets) {
            const local = (utc + m.offset + 24) % 24;
            // Score: 0 = great, higher = worse
            if (local >= 9 && local <= 17) score += 0;
            else if (local >= 7 && local <= 21) score += 1;
            else if (local >= 6 && local <= 22) score += 2;
            else score += 10; // Night
            memberTimes.push({ name: m.name, local: formatHour(local) });
        }
        hourScores.push({ utc, score, memberTimes });
    }
    
    hourScores.sort((a, b) => a.score - b.score);
    const best = hourScores.slice(0, 3);
    
    // Members without availability
    const noAvail = members.filter(m => !m.windows || m.windows.length === 0);
    
    return {
        memberCount: members.length,
        spread: `${spread} hours`,
        easternmost: sorted[sorted.length - 1]?.name,
        westernmost: sorted[0]?.name,
        bestTimes: best.map(h => ({
            utc: `${h.utc}:00 UTC`,
            times: h.memberTimes.map(t => `${t.name}: ${t.local}`).join(', ')
        })),
        pendingMembers: noAvail.map(m => m.name),
        hasFullMatch: context.suggestions?.some(s => s.isFullMatch),
        fullMatchCount: context.suggestions?.filter(s => s.isFullMatch).length || 0,
        partialMatchCount: context.suggestions?.filter(s => !s.isFullMatch).length || 0
    };
}

// Build context for the AI
function buildContext(context, analysis) {
    let info = '';
    
    if (context?.user) {
        info += `\nUser: ${context.user.name} (${context.user.timezone || 'Unknown'})`;
    }
    
    if (context?.group) {
        info += `\nGroup: "${context.group.name}"`;
    }
    
    if (analysis) {
        info += `\n\n## GROUP ANALYSIS`;
        info += `\nMembers: ${analysis.memberCount}`;
        info += `\nTimezone spread: ${analysis.spread}`;
        info += `\nWesternmost: ${analysis.westernmost}`;
        info += `\nEasternmost: ${analysis.easternmost}`;
        
        if (analysis.bestTimes?.length > 0) {
            info += `\n\nBest meeting times (everyone in reasonable hours):`;
            analysis.bestTimes.forEach((t, i) => {
                info += `\n${i + 1}. ${t.utc} → ${t.times}`;
            });
        }
        
        if (analysis.pendingMembers?.length > 0) {
            info += `\n\nWaiting on availability from: ${analysis.pendingMembers.join(', ')}`;
        }
        
        if (analysis.hasFullMatch) {
            info += `\n\n✅ ${analysis.fullMatchCount} time(s) work for everyone!`;
        } else if (analysis.partialMatchCount > 0) {
            info += `\n\n⚠️ No perfect match. ${analysis.partialMatchCount} partial matches found.`;
        }
    }
    
    if (context?.busySlots?.length > 0) {
        info += `\n\nCalendar busy slots are factored into the search.`;
    }
    
    return info;
}

function buildSystemPrompt(context, analysis, isOrganiser) {
    const baseRole = isOrganiser 
        ? `You are a scheduling assistant for Humane Calendar. You help organisers coordinate meetings across timezones.

Your capabilities:
- Analyze timezone overlaps and suggest best times
- Explain why certain times don't work
- Suggest what individual members could change
- Generate friendly messages to send to members
- Recommend alternative meeting formats (async, split groups, rotating times)

Response style:
- Be direct and actionable - 2-3 sentences unless detail is needed
- British English
- Don't suggest midnight-6am times
- If no perfect time exists, explain the tradeoff and who would need to stretch`

        : `You are a friendly scheduling assistant. You help meeting attendees set their availability.

Your role:
- Help them understand what times are being considered
- Explain timezone differences simply
- Guide them to set availability (tell them to scroll to "My Available Times")
- Answer basic questions about the meeting

Keep responses brief (1-2 sentences). British English.`;

    const contextInfo = buildContext(context, analysis);
    
    return `${baseRole}\n\n## CURRENT CONTEXT${contextInfo}`;
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { messages, context, role = 'attendee' } = req.body;
        const isOrganiser = role === 'organiser';

        // Check API keys
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!anthropicKey && !geminiKey) {
            return res.status(500).json({ 
                error: "No API key configured. Add ANTHROPIC_API_KEY or GEMINI_API_KEY to Vercel." 
            });
        }

        // Pre-analyze group
        const analysis = analyzeGroup(context);
        
        // Build prompt
        const systemPrompt = buildSystemPrompt(context, analysis, isOrganiser);

        // Format messages
        const conversationMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Try Claude first, fallback to Gemini
        let result;
        
        if (anthropicKey) {
            try {
                const anthropic = createAnthropic({ apiKey: anthropicKey });
                result = await generateText({
                    model: anthropic('claude-3-5-haiku-20241022'),
                    system: systemPrompt,
                    messages: conversationMessages
                });
            } catch (claudeErr) {
                console.error('Claude error:', claudeErr.message);
                // Fall through to Gemini
            }
        }
        
        if (!result && geminiKey) {
            try {
                const google = createGoogleGenerativeAI({ apiKey: geminiKey });
                result = await generateText({
                    model: google('gemini-2.0-flash-001'),
                    system: systemPrompt,
                    messages: conversationMessages
                });
            } catch (geminiErr) {
                console.error('Gemini error:', geminiErr.message);
            }
        }
        
        if (result?.text) {
            return res.status(200).json({ response: result.text });
        }
        
        // Ultimate fallback - provide analysis directly
        let fallback = "I'm having trouble with the AI service. ";
        if (analysis?.hasFullMatch) {
            fallback += `Good news: ${analysis.fullMatchCount} time(s) work for everyone! Check the results.`;
        } else if (analysis) {
            fallback += `Your group spans ${analysis.spread}. Best times would be around ${analysis.bestTimes?.[0]?.utc || 'midday UTC'}.`;
            if (analysis.pendingMembers?.length > 0) {
                fallback += ` Still waiting on: ${analysis.pendingMembers.join(', ')}.`;
            }
        }
        
        return res.status(200).json({ response: fallback });

    } catch (error) {
        console.error("Chat API error:", error);
        return res.status(500).json({ error: error.message || "Unknown error" });
    }
}
