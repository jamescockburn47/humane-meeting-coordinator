import React, { useState } from 'react';
import { downloadICS } from '../services/ical';

export function BookingModal({ slot, members, onConfirm, onCancel, processing, hostProvider, hostEmail, hostName }) {
    const [subject, setSubject] = useState("Team Sync");
    const [description, setDescription] = useState("");
    const [inviteUnavailable, setInviteUnavailable] = useState(true); // Invite everyone by default

    if (!slot) return null;

    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);
    const duration = Math.round((endDate - startDate) / (1000 * 60)); // minutes
    
    // Check if this is a partial match
    const isPartialMatch = slot.isFullMatch === false;
    const availableMembers = slot.availableMembers || members.map(m => ({ email: m.email, name: m.display_name || m.email }));
    const unavailableMembers = slot.unavailableMembers || [];
    
    // Determine who to invite based on user choice
    const membersToInvite = inviteUnavailable 
        ? members 
        : members.filter(m => availableMembers.some(am => am.email === m.email));

    const handleSubmit = (e) => {
        e.preventDefault();
        // Pass the filtered members list if partial
        onConfirm(subject, description, membersToInvite);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content booking-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onCancel} disabled={processing}>×</button>
                
                <h2>Send Meeting Invites</h2>
                
                {/* Partial Match Warning */}
                {isPartialMatch && (
                    <div className="partial-match-warning">
                        <div className="warning-header">
                            <span>Not everyone is available at this time</span>
                        </div>
                        <div className="availability-summary">
                            <div className="available-group">
                                <span className="group-label">Available ({availableMembers.length}):</span>
                                <div className="member-chips">
                                    {availableMembers.map((m, i) => (
                                        <span key={i} className="mini-chip available">{m.name}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="unavailable-group">
                                <span className="group-label">Unavailable ({unavailableMembers.length}):</span>
                                <div className="member-chips">
                                    {unavailableMembers.map((m, i) => (
                                        <span key={i} className="mini-chip unavailable" title={m.reason}>
                                            {m.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="invite-choice">
                            <label className="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={inviteUnavailable}
                                    onChange={(e) => setInviteUnavailable(e.target.checked)}
                                />
                                <span>Send invites to unavailable members anyway</span>
                                <span className="checkbox-hint">(They can decline or propose a new time)</span>
                            </label>
                        </div>
                    </div>
                )}
                
                <div className="booking-time-display">
                    <div className="time-slot">
                        <span className="time-value">
                            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="time-separator">→</span>
                        <span className="time-value">
                            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="duration-badge">{duration} min</span>
                    </div>
                    <div className="date-display">
                        {startDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Meeting Title</label>
                        <input 
                            type="text" 
                            value={subject} 
                            onChange={e => setSubject(e.target.value)}
                            placeholder="e.g., Weekly Standup"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description (Optional)</label>
                        <textarea 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add any notes or agenda items..."
                            rows={3}
                            style={{
                                width: '100%',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-main)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.95rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            Inviting {membersToInvite.length} {membersToInvite.length === 1 ? 'Person' : 'People'}
                            {isPartialMatch && !inviteUnavailable && (
                                <span className="invite-note"> (available only)</span>
                            )}
                        </label>
                        <div className="attendee-list">
                            {membersToInvite.map(m => (
                                <div key={m.email} className="attendee-chip">
                                    <span className="attendee-avatar">
                                        {(m.display_name || m.email).substring(0, 2).toUpperCase()}
                                    </span>
                                    <div className="attendee-info">
                                        <span className="attendee-name">{m.display_name || m.email.split('@')[0]}</span>
                                        <span className="attendee-email">{m.email}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="booking-info-box">
                        <div className="info-icon">✉️</div>
                        <div className="info-text">
                            <strong>What happens next:</strong>
                            <p>
                                {hostProvider === 'google' 
                                    ? 'A Google Calendar invite with a Meet link will be sent to all attendees.'
                                    : hostProvider === 'microsoft'
                                    ? 'An Outlook invite with a Teams link will be sent to all attendees.'
                                    : 'A calendar invite will be sent to all attendees.'
                                }
                            </p>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button 
                            type="button" 
                            className="btn-ghost" 
                            onClick={onCancel} 
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        
                        {/* Apple Calendar / Download .ics option */}
                        <button 
                            type="button" 
                            className="btn-ghost apple-btn"
                            onClick={() => {
                                const memberEmails = membersToInvite.map(m => m.email);
                                downloadICS(
                                    subject,
                                    description,
                                    slot.start,
                                    slot.end,
                                    memberEmails,
                                    hostEmail || 'organizer@humanecalendar.com',
                                    hostName || 'Organizer'
                                );
                            }}
                            disabled={processing}
                            title="Download .ics file for Apple Calendar or other apps"
                        >
                            🍎 Download .ics
                        </button>

                        {/* Google/Microsoft send invites */}
                        {(hostProvider === 'google' || hostProvider === 'microsoft') && (
                            <button 
                                type="submit" 
                                className="btn-primary send-btn" 
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <span className="spinner"></span>
                                        Sending...
                                    </>
                                ) : (
                                    <>📤 Send Invites</>
                                )}
                            </button>
                        )}
                    </div>

                    {hostProvider === 'guest' && (
                        <div className="guest-booking-note">
                            <span>As a guest, download the .ics file and share it with attendees, or connect your Google/Microsoft calendar to send invites directly.</span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
