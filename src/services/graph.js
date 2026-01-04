import { graphConfig } from "../authConfig";

/**
 * Attaches a given access token to a MS Graph API call. Returns information about the user
 * @param accessToken 
 */
export async function callMsGraph(accessToken) {
    const headers = new Headers();
    const bearer = `Bearer ${accessToken}`;

    headers.append("Authorization", bearer);

    const options = {
        method: "GET",
        headers: headers
    };

    return fetch(graphConfig.graphMeEndpoint, options)
        .then(response => response.json())
        .catch(error => console.log(error));
}

/**
 * Finds meeting times
 * @param {string} accessToken 
 * @param {string[]} attendees - List of email addresses
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {number} durationMinutes 
 */
export async function findMeetingTimes(accessToken, attendees, startDate, endDate, durationMinutes = 60) {
    const headers = new Headers();
    const bearer = `Bearer ${accessToken}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");
    headers.append("Prefer", 'outlook.timezone="UTC"'); // Request internal calculation in UTC, we convert to local on display

    // Format duration as ISO 8601 duration (e.g., PT1H)
    const duration = `PT${durationMinutes}M`;

    const body = {
        attendees: attendees.map(email => ({
            type: "required",
            emailAddress: {
                address: email
            }
        })),
        timeConstraint: {
            activityDomain: "work", // Crucial for "Humane" times
            timeSlots: [
                {
                    start: {
                        dateTime: startDate.toISOString(),
                        timeZone: "UTC"
                    },
                    end: {
                        dateTime: endDate.toISOString(),
                        timeZone: "UTC"
                    }
                }
            ]
        },
        meetingDuration: duration,
        returnSuggestionReasons: true,
        minimumAttendeePercentage: 100 // We want everyone to be there
    };

    const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    };

    return fetch(graphConfig.graphFindMeetingTimesEndpoint, options)
        .then(response => response.json())
        .catch(error => console.log(error));
}

/**
 * Creates a meeting on the user's calendar and sends invites to all attendees.
 * 
 * Microsoft Graph automatically sends email invitations when attendees are present.
 * Setting isOnlineMeeting creates a Teams link automatically.
 * 
 * Note: The organizer automatically has the event on their calendar.
 * All attendees (including organizer if in the list) receive email invitations.
 */
export async function createMeeting(accessToken, subject, description, startTime, endTime, attendees, organizerEmail = null, isPersonalAccount = false) {
    console.log("Creating Microsoft Event:", {
        subject,
        attendees,
        organizerEmail,
        isPersonalAccount,
        startTime,
        endTime
    });
    
    const headers = new Headers();
    const bearer = `Bearer ${accessToken}`;

    headers.append("Authorization", bearer);
    headers.append("Content-Type", "application/json");

    // Build attendee list - everyone gets an invite
    // Note: The organizer doesn't receive an email invite (they're the owner)
    // but the event appears on their calendar
    const attendeeList = attendees
        .filter(email => email !== organizerEmail) // Don't include organizer as attendee
        .map(email => ({
            emailAddress: {
                address: email,
                name: email
            },
            type: "required"
        }));

    // Determine Teams provider based on account type
    // Personal Microsoft accounts use "teamsForConsumer"
    // Work/School accounts use "teamsForBusiness"
    const teamsProvider = isPersonalAccount ? "teamsForConsumer" : "teamsForBusiness";
    console.log("Using Teams provider:", teamsProvider);

    const event = {
        subject: subject,
        body: {
            contentType: "HTML",
            content: `${description || "You've been invited to a meeting."}<br><br><hr><small>Scheduled with Humane Calendar 📅</small>`
        },
        start: {
            dateTime: startTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
            dateTime: endTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: attendeeList,
        // Request responses from attendees
        responseRequested: true,
        // Create a Teams meeting link automatically
        isOnlineMeeting: true,
        onlineMeetingProvider: teamsProvider,
        // Allow attendees to propose new times
        allowNewTimeProposals: true,
        // Reminder 15 minutes before
        reminderMinutesBeforeStart: 15,
        // Show as busy
        showAs: "busy",
        // Importance
        importance: "normal"
    };

    const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(event)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Microsoft Event Creation Failed:", errorText);
        throw new Error("Failed to create meeting: " + errorText);
    }

    const result = await response.json();
    console.log("Microsoft Event Created:", result.webLink);
    return result;
}
