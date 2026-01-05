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
 * Creates an event on the user's primary Google Calendar and sends invites to all attendees.
 * 
 * CRITICAL: The `sendUpdates=all` parameter is what triggers Google to send email invitations.
 * Without it, the event is created but attendees receive nothing.
 * 
 * Note: The organizer (caller) automatically gets the event on their calendar.
 * To ensure they also receive an email confirmation, we include them in attendees.
 */
export async function createGoogleEvent(accessToken, subject, description, start, end, attendees, organizerEmail = null) {
    console.log("Creating Google Event with invites:", subject, "Attendees:", attendees, "Organizer:", organizerEmail);

    // Build attendee list - organizer is automatically the owner
    // Include all attendees including organizer so everyone gets email notifications
    const attendeeList = attendees.map(email => ({ 
        email,
        responseStatus: 'needsAction'
    }));

    const event = {
        summary: subject,
        description: description + "\n\n---\nScheduled with Humane Calendar 📅",
        start: {
            dateTime: start,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
            dateTime: end,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: attendeeList,
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: true,
        // Add Google Meet link automatically
        conferenceData: {
            createRequest: {
                requestId: `humane-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        },
        // Ensure reminders are set
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 60 },
                { method: 'popup', minutes: 15 }
            ]
        }
    };

    // CRITICAL: sendUpdates=all sends email invitations to all attendees
    // conferenceDataVersion=1 enables Google Meet creation
    const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Event Creation Failed:", errorText);
        console.error("This usually means:");
        console.error("  1. Your Google OAuth token expired - try logging out and back in");
        console.error("  2. Calendar API is not enabled in Google Cloud Console");
        console.error("  3. Missing calendar.events scope");
        throw new Error("Failed to create Google Event: " + errorText);
    }

    const result = await response.json();
    console.log("=== GOOGLE EVENT CREATED SUCCESSFULLY ===");
    console.log("Event Link:", result.htmlLink);
    console.log("Organizer:", result.organizer?.email || 'You');
    console.log("Attendees:", result.attendees?.map(a => a.email).join(', '));
    console.log("Meet Link:", result.conferenceData?.entryPoints?.[0]?.uri || 'None');
    console.log("==========================================");
    return result;
}
