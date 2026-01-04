import { supabase } from './supabase';

/**
 * Fetches free/busy information from Google Calendar API.
 * 
 * @param {string} accessToken - Valid Google OAuth Access Token
 * @param {string} email - The user's Google email address
 * @param {Date} start - Start date for the query
 * @param {Date} end - End date for the query
 */
export async function fetchGoogleAvailability(accessToken, email, start, end) {
    console.log("Fetching Google Availability for", email);

    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                items: [{ id: 'primary' }]
            })
        });

        if (!response.ok) {
            console.error("Google API Error", response.status, await response.text());
            throw new Error("Failed to fetch Google Calendar data");
        }

        const data = await response.json();
        const busyRanges = data.calendars.primary.busy;

        // Normalize to our standard "busy" format for Supabase
        const normalizedSlots = busyRanges.map(slot => ({
            start: { dateTime: slot.start }, // Match Graph API shape for easier reuse
            end: { dateTime: slot.end }
        }));

        console.log(`Found ${normalizedSlots.length} busy slots from Google.`);
        return normalizedSlots;

    } catch (error) {
        console.error("Google Fetch Error:", error);
        return [];
    }
}

/**
 * Creates an event on the user's primary Google Calendar.
 */
export async function createGoogleEvent(accessToken, subject, description, start, end, attendees) {
    console.log("Creating Google Event:", subject);

    const event = {
        summary: subject,
        description: description,
        start: {
            dateTime: start,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
            dateTime: end,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: attendees.map(email => ({ email })),
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
    });

    if (!response.ok) {
        throw new Error("Failed to create Google Event: " + await response.text());
    }

    return await response.json();
}
