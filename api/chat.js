import { GoogleGenAI } from "@google/genai";

// System prompt with Humane Calendar knowledge
const SYSTEM_PROMPT = `You are the Humane Calendar Assistant. You help users understand how to use the app and answer questions about scheduling across timezones.

## About Humane Calendar

Humane Calendar is a scheduling tool designed for global teams and side projects. Unlike other tools:

- **Each person picks their own available times** in their own timezone
- **The organiser sees the overlap** and sends the invite (it doesn't auto-book)
- **Respects personal boundaries** - only times people actively offer are considered
- **Privacy-first** - we only see busy/free times, never event details

## How It Works

1. **Create a Group**: The organiser creates a scheduling group
2. **Share the Link**: Send the invite link to participants
3. **Everyone Sets Availability**: Each person selects when they're genuinely free (in their local timezone)
4. **Find the Overlap**: The system shows where everyone's schedules align
5. **Send the Invite**: The organiser picks a slot and sends a calendar invite with video link

## Key Features

- **Multi-timezone Support**: Each person's times are shown in their local timezone
- **Humane Windows**: Define your general availability (e.g., "9am-5pm weekdays")
- **Guest Mode**: Participants don't need an account - just click the link and set times
- **Calendar Overlay** (Optional): Connect Google/Microsoft to see your busy times
- **One-Click Invite**: Sends Google Calendar/Outlook invite with Meet/Teams link

## Privacy

- We only access busy/free times, never event titles or details
- Guest mode requires zero data access
- Availability data auto-deletes after 30 days
- No third-party data sharing

## Common Questions

**Q: Do invitees need to create an account?**
A: No. They can use Guest Mode - just enter name, email, and select available times.

**Q: Does it book the meeting automatically?**
A: No. It shows the overlap, then the organiser decides and clicks to send the invite.

**Q: What calendar systems are supported?**
A: Google Calendar and Microsoft Outlook/365. Apple Calendar users can download .ics files.

**Q: How do timezones work?**
A: Each person sets their availability in their local timezone. The system converts and finds true overlaps.

**Q: Is my calendar data safe?**
A: Yes. We only see busy/free status, never event names, descriptions, or attendees.

## Your Role

- Answer questions about how to use Humane Calendar
- Help users understand the scheduling flow
- Explain privacy and data handling
- Suggest best practices for scheduling across timezones
- Be friendly, concise, and helpful
- Use British English spelling

Keep responses brief (2-3 sentences for simple questions, more for complex ones).`;

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
        const { messages } = req.body;

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("No GEMINI_API_KEY found in environment");
            return res.status(500).json({ error: "API key not configured" });
        }

        const ai = new GoogleGenAI({ apiKey });

        // Build conversation for Gemini
        let conversationText = SYSTEM_PROMPT + "\n\n---\n\nConversation:\n";

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
