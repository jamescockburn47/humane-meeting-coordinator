import React, { useState } from 'react';

export function BookingModal({ slot, members, onConfirm, onCancel, processing, hostProvider }) {
    const [subject, setSubject] = useState("Team Sync");
    const [description, setDescription] = useState("");

    if (!slot) return null;

    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);
    const duration = Math.round((endDate - startDate) / (1000 * 60)); // minutes

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(subject, description);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content booking-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onCancel} disabled={processing}>×</button>
                
                <h2>📅 Send Meeting Invites</h2>
                
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
                        <label>Inviting {members.length} {members.length === 1 ? 'Person' : 'People'}</label>
                        <div className="attendee-list">
                            {members.map(m => (
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
                        <button 
                            type="submit" 
                            className="btn-primary send-btn" 
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <span className="spinner"></span>
                                    Sending Invites...
                                </>
                            ) : (
                                <>📤 Send Invites</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
