/**
 * iCalendar (.ics) file generation for Apple Calendar and other calendar apps.
 * 
 * This is the universal fallback for calendars that don't have a REST API,
 * including Apple Calendar, Outlook desktop, and others.
 */

/**
 * Generates an iCalendar (.ics) file content
 * 
 * @param {string} subject - Event title
 * @param {string} description - Event description
 * @param {string} startTime - ISO datetime string
 * @param {string} endTime - ISO datetime string
 * @param {string[]} attendees - Array of email addresses
 * @param {string} organizerEmail - Organizer's email
 * @param {string} organizerName - Organizer's name
 * @returns {string} - iCalendar file content
 */
export function generateICS(subject, description, startTime, endTime, attendees, organizerEmail, organizerName) {
    // Convert to iCalendar date format: YYYYMMDDTHHMMSSZ
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const uid = `humane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@humanecalendar.com`;
    const now = formatDate(new Date().toISOString());
    const start = formatDate(startTime);
    const end = formatDate(endTime);

    // Build attendee lines
    const attendeeLines = attendees.map(email => 
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`
    ).join('\r\n');

    // Escape special characters in text fields
    const escapeText = (text) => {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    };

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Humane Calendar//humanecalendar.com//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeText(subject)}`,
        `DESCRIPTION:${escapeText(description || 'Meeting scheduled via Humane Calendar')}`,
        `ORGANIZER;CN=${escapeText(organizerName)}:mailto:${organizerEmail}`,
        attendeeLines,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Reminder',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].filter(line => line).join('\r\n');

    return icsContent;
}

/**
 * Downloads an .ics file to the user's device
 */
export function downloadICS(subject, description, startTime, endTime, attendees, organizerEmail, organizerName) {
    const icsContent = generateICS(subject, description, startTime, endTime, attendees, organizerEmail, organizerName);
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${subject.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    return true;
}

/**
 * Opens the .ics file directly (for mobile devices)
 */
export function openICS(subject, description, startTime, endTime, attendees, organizerEmail, organizerName) {
    const icsContent = generateICS(subject, description, startTime, endTime, attendees, organizerEmail, organizerName);
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // On iOS, this will prompt to add to Calendar
    window.open(url, '_blank');
    
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    
    return true;
}
