import React, { useState } from 'react';

export function BookingModal({ slot, members, onConfirm, onCancel, processing }) {
    const [subject, setSubject] = useState("Team Sync");
    const [description, setDescription] = useState("Discussing project updates.");

    if (!slot) return null;

    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ background: 'var(--bg-app)', border: '1px solid var(--primary)', maxWidth: '500px', width: '100%' }}>
                <h2 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Book Meeting</h2>

                <div style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                        {startDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label>Subject</label>
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label>Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label>Attendees ({members.length})</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {members.map(m => (
                            <span key={m.email} style={{
                                background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                            }}>
                                {m.display_name || m.email}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button className="btn-ghost" onClick={onCancel} disabled={processing}>Cancel</button>
                    <button className="btn-primary" onClick={() => onConfirm(subject, description)} disabled={processing}>
                        {processing ? 'Sending Invites...' : 'Send Invites'}
                    </button>
                </div>
            </div>
        </div>
    );
}
