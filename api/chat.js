import { GoogleGenAI } from "@google/genai";

// Build system prompt with context
function buildSystemPrompt(context) {
    let prompt = `You are a scheduling assistant for Humane Calendar. You ONLY help with:
- Understanding how the app works
- Finding meeting times that work for everyone
- Explaining timezone differences
- Suggesting availability changes
- Privacy questions about the app

STRICT RULES:
1. DO NOT discuss topics unrelated to scheduling or this app
2. If asked about anything else, politely redirect: "I can only help with scheduling. What would you like to know about finding a meeting time?"
3. Keep responses SHORT (2-3 sentences max unless explaining a specific process)
4. Be direct and actionable
5. Use British English

## How Humane Calendar Works
- Each person sets their available times (in their own timezone)
- The app finds where everyone overlaps
- The organiser picks a slot and sends a calendar invite
- Invites include a Google Meet or Teams video link

## Key Concepts
- "Humane Windows": The hours someone is willing to meet (e.g., 9am-5pm weekdays)
- "Full Match": A time when EVERYONE in the group is available
- "Partial Match": A time when some but not all members are available
- Timezones: Each person's times are converted to find true overlaps`;

    // Add user context if available
    if (context?.user) {
        prompt += `\n\n## Current User
- Name: ${context.user.name || 'Unknown'}
- Timezone: ${context.user.timezone || 'Unknown'}
- Their availability windows: ${JSON.stringify(context.user.humaneWindows || [])}`;
    }

    // Add group context if available
    if (context?.group) {
        prompt += `\n\n## Current Group: "${context.group.name}"
- ${context.group.memberCount} members`;
    }

    // Add member details
    if (context?.members?.length > 0) {
        prompt += `\n\n## Group Members`;
        context.members.forEach((m, i) => {
            prompt += `\n${i + 1}. ${m.name} (${m.timezone || 'Unknown timezone'})`;
            if (m.windows?.length > 0) {
                const windowDesc = m.windows.map(w => `${w.start}-${w.end} ${w.type}`).join(', ');
                prompt += ` - Available: ${windowDesc}`;
            }
        });
    }

    // Add suggestion analysis
    if (context?.suggestions?.length > 0) {
        const fullMatches = context.suggestions.filter(s => s.isFullMatch);
        const partialMatches = context.suggestions.filter(s => !s.isFullMatch);

        prompt += `\n\n## Current Search Results`;
        
        if (fullMatches.length > 0) {
            prompt += `\n\nFULL MATCHES (everyone available): ${fullMatches.length} times found`;
            fullMatches.slice(0, 3).forEach(s => {
                const date = new Date(s.start);
                prompt += `\n- ${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
            });
        } else {
            prompt += `\n\nNO FULL MATCHES - no time works for everyone`;
        }

        if (partialMatches.length > 0) {
            prompt += `\n\nPARTIAL MATCHES: ${partialMatches.length} times where some people are available`;
            
            // Analyze who is blocking
            const blockerCount = {};
            partialMatches.forEach(s => {
                (s.unavailable || []).forEach(name => {
                    blockerCount[name] = (blockerCount[name] || 0) + 1;
                });
            });
            
            const sortedBlockers = Object.entries(blockerCount).sort((a, b) => b[1] - a[1]);
            if (sortedBlockers.length > 0) {
                prompt += `\n\nWho is unavailable most often:`;
                sortedBlockers.forEach(([name, count]) => {
                    prompt += `\n- ${name}: unavailable for ${count} of ${partialMatches.length} partial slots`;
                });
            }
        }

        // Suggest actions based on analysis
        prompt += `\n\n## What You Should Suggest`;
        if (fullMatches.length > 0) {
            prompt += `\n- Encourage them to pick a full match slot and send the invite`;
            prompt += `\n- Explain they can click on a time slot to see the booking form`;
        } else if (partialMatches.length > 0) {
            prompt += `\n- Explain that no time works for everyone`;
            if (Object.keys(blockerCount || {}).length > 0) {
                const topBlocker = sortedBlockers[0];
                prompt += `\n- Suggest asking ${topBlocker[0]} if they can adjust their availability`;
                prompt += `\n- Or suggest the organiser expands the date range`;
            }
            prompt += `\n- They can still send an invite to a partial slot if needed`;
        } else {
            prompt += `\n- Suggest clicking "Search" to find available times`;
            prompt += `\n- Make sure the date range covers enough days`;
        }
    }

    prompt += `\n\n## Changing Availability
To change availability:
1. Click on your profile/settings
2. Add or edit "Humane Windows" (the hours you're willing to meet)
3. You can set different times for weekdays vs weekends
4. Save changes and search again

If someone else needs to change their availability, they should revisit their invite link or log in and update their settings.`;

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
        const { messages, context } = req.body;

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("No GEMINI_API_KEY found in environment");
            return res.status(500).json({ error: "API key not configured" });
        }

        const ai = new GoogleGenAI({ apiKey });

        // Build dynamic system prompt with context
        const systemPrompt = buildSystemPrompt(context);

        // Build conversation for Gemini
        let conversationText = systemPrompt + "\n\n---\n\nConversation:\n";

        for (const msg of messages) {
            const role = msg.role === "user" ? "User" : "Assistant";
            conversationText += `${role}: ${msg.content}\n`;
        }

        conversationText += "Assistant:";

        // Try models in order of preference (cheapest/fastest first)
        const modelNames = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ];

        let response = null;
        let lastError = null;

        for (const modelName of modelNames) {
            try {
                console.log(`Trying model: ${modelName}`);
                response = await ai.models.generateContent({
                    model: modelName,
                    contents: conversationText,
                });
                console.log(`Success with model: ${modelName}`);
                break;
            } catch (err) {
                console.error(`Model ${modelName} failed:`, err.message);
                lastError = err;
            }
        }

        if (!response) {
            throw lastError || new Error("All models failed");
        }

        const text = response.text || "";

        return res.status(200).json({ response: text });
    } catch (error) {
        console.error("Chat API error:", error.message);
        return res.status(500).json({
            error: error.message || "Unknown error occurred"
        });
    }
}
