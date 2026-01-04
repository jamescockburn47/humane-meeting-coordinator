import React, { useState, useEffect } from 'react';
import { BookingModal } from './BookingModal';
import { getGroupMembers, removeMember, makeAdmin, getGroupDetails } from '../services/supabase';

export function GroupView({ group, currentUser, onFindTimes, suggestions, loading, onBack, onBook }) {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0]);
    const [bookingSlot, setBookingSlot] = useState(null);

    // Admin State
    const [members, setMembers] = useState([]);
    const [fullGroupDetails, setFullGroupDetails] = useState(group);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        loadData();
    }, [group.id, refreshTrigger]);

    const loadData = async () => {
        const mems = await getGroupMembers(group.id);
        setMembers(mems);
        const details = await getGroupDetails(group.id);
        if (details) setFullGroupDetails(details);
    };

    const handleRemove = async (email) => {
        if (!confirm(`Are you sure you want to remove ${email}?`)) return;
        await removeMember(group.id, email);
        setRefreshTrigger(p => p + 1);
    };

    const handleMakeAdmin = async (email) => {
        if (!confirm(`Promote ${email} to Admin?`)) return;
        await makeAdmin(group.id, email);
        setRefreshTrigger(p => p + 1);
    };

    // Determine if Current User is Admin or Creator
    const isCreator = fullGroupDetails?.created_by === currentUser?.username;
    // const amIAdmin = members.find(m => m.email === currentUser?.username)?.is_admin; 
    // ^ Logic depends on if we want "Admins" to promote others. For now, let's say Creator is Super Admin.
    const canManage = isCreator; // Only Creator can kick/promote for safety in V1

    return (
        <div className="animate-fade-in">
            {bookingSlot && (
                <BookingModal
                    slot={bookingSlot}
                    members={members}
                    onConfirm={(subj, desc) => {
                        onBook(group.id, bookingSlot, subj, desc);
                        setBookingSlot(null);
                    }}
                    onCancel={() => setBookingSlot(null)}
                />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button onClick={onBack} className="btn-ghost" style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}>←</button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0 }}>{fullGroupDetails?.name || group.name}</h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {group.id}</div>
                </div>
            </div>

            <div className="grid-cols-2" style={{ gap: '2rem', marginBottom: '2rem' }}>
                {/* --- Search Availability --- */}
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>Find Humane Times</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '130px' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>From</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '130px' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>To</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn-primary"
                            onClick={() => onFindTimes(group.id, startDate, endDate)}
                            disabled={loading}
                            style={{ minWidth: '120px' }}
                        >
                            {loading ? 'Scanning...' : 'Search'}
                        </button>
                    </div>
                </div>

                {/* --- Member Management --- */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Members ({members.length})</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className="btn-ghost"
                                style={{ fontSize: '0.8rem', color: '#25D366' }}
                                onClick={() => {
                                    const msg = `Join my Humane Scheduling group! Code: ${group.id}`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                            >
                                Whatsapp
                            </button>
                            <button className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => {
                                window.location.href = `mailto:?subject=Join Group&body=Code: ${group.id}`;
                            }}>Email</button>
                        </div>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {members.map(m => (
                            <div key={m.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                        {m.display_name || m.email}
                                        {m.email === fullGroupDetails?.created_by && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'var(--primary)', color: 'black', padding: '2px 6px', borderRadius: '4px' }}>OWNER</span>}
                                        {m.is_admin && m.email !== fullGroupDetails?.created_by && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>ADMIN</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.timezone}</div>
                                </div>

                                {canManage && m.email !== currentUser?.username && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {!m.is_admin && (
                                            <button
                                                className="btn-ghost"
                                                style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                                                onClick={() => handleMakeAdmin(m.email)}
                                            >
                                                Promote
                                            </button>
                                        )}
                                        <button
                                            className="btn-ghost"
                                            style={{ fontSize: '0.7rem', padding: '2px 6px', color: '#ff4444' }}
                                            onClick={() => handleRemove(m.email)}
                                        >
                                            Kick
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid-cols-2">
                {suggestions.map((slot, i) => {
                    const date = new Date(slot.start);
                    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

                    return (
                        <div
                            key={i}
                            className="card slot-card"
                            style={{ borderLeft: '4px solid var(--primary)', cursor: 'pointer' }}
                            onClick={() => setBookingSlot(slot)}
                            title="Click to Book"
                        >
                            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                {timeString}
                            </div>
                            <div style={{ color: 'var(--text-muted)' }}>
                                {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--primary)', fontStyle: 'italic' }}>
                                Shown in: {timeZone}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!loading && suggestions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    No slots found. Try a wider date range or check everyone's Humane Hours.
                </div>
            )}
        </div>
    );
}
