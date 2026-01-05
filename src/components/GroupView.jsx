import React, { useState, useEffect } from 'react';
import { BookingModal } from './BookingModal';
import { SmartSuggestions } from './SmartSuggestions';
import { getGroupMembers, removeMember, makeAdmin, getGroupDetails, deleteGroup } from '../services/supabase';

// Invite Link Card Component - Focused on sharing links with optional date range
function InviteLinkCard({ groupName, inviteCode, groupId, startDate, endDate, duration }) {
    const [copied, setCopied] = useState(false);
    // Use invite_code if available, otherwise fall back to group UUID
    const code = inviteCode || groupId;
    
    // Build URL with optional date range parameters
    let inviteUrl = `${window.location.origin}/join/${code}`;
    const params = new URLSearchParams();
    if (startDate) params.set('from', startDate);
    if (endDate) params.set('to', endDate);
    if (duration && duration !== 60) params.set('dur', duration);
    if (params.toString()) {
        inviteUrl += `?${params.toString()}`;
    }

    // Format date range for messages
    const formatDateRange = () => {
        if (!startDate || !endDate) return '';
        const start = new Date(startDate);
        const end = new Date(endDate);
        const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
        return ` (${formatter.format(start)} - ${formatter.format(end)})`;
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        const dateInfo = formatDateRange();
        const durationInfo = duration ? ` for a ${duration}-minute meeting` : '';
        const msg = `Hey! Join my scheduling group "${groupName}"${durationInfo}${dateInfo}:\n\n${inviteUrl}\n\nSet your availability so we can find a time that works for everyone.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleEmail = () => {
        const dateInfo = formatDateRange();
        const durationInfo = duration ? `${duration}-minute ` : '';
        const subject = `Join my scheduling group: ${groupName}`;
        const body = `Hi!\n\nI'm inviting you to join my Humane Calendar group "${groupName}" to schedule a ${durationInfo}meeting${dateInfo}.\n\nJust click the link below to join and set your availability:\n\n${inviteUrl}\n\nThis helps us find a time that works for everyone!`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Join ${groupName}`,
                    text: `Join my Humane Calendar group to find a meeting time!`,
                    url: inviteUrl
                });
            } catch (e) {
                // User cancelled or error
                handleCopy();
            }
        } else {
            handleCopy();
        }
    };

    return (
        <div className="invite-link-card">
            <div className="invite-link-header">
                <div>
                    <h4>Invite Link</h4>
                    <p>Share this link with anyone you want to join</p>
                </div>
            </div>

            {/* Show date range info if set */}
            {startDate && endDate && (
                <div className="invite-date-range">
                    <span className="date-range-label">📆 Looking for availability:</span>
                    <span className="date-range-value">
                        {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                        {' → '}
                        {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {duration && <span className="duration-tag"> • {duration} min</span>}
                    </span>
                </div>
            )}

            <div className="invite-url-box">
                <input 
                    type="text" 
                    value={inviteUrl} 
                    readOnly 
                    onClick={(e) => e.target.select()}
                />
                <button 
                    className={`btn-copy-link ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>

            <div className="share-buttons-row">
                <button className="btn-share-icon btn-whatsapp" onClick={handleWhatsApp}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                </button>
                <button className="btn-share-icon btn-email-share" onClick={handleEmail}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    Email
                </button>
                <button className="btn-share-icon" onClick={handleShare}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                    Share
                </button>
            </div>

            <p className="invite-note">
                Each person can use the same link to join.
            </p>
        </div>
    );
}

// Slot Card Component - Shows available time with attendance info
function SlotCard({ slot, onClick, members, showPartial = false }) {
    const date = new Date(slot.start);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const totalMembers = members?.length || slot.availableMembers?.length + slot.unavailableMembers?.length || 0;
    const availableCount = slot.availableMembers?.length || totalMembers;
    
    const isPartial = !slot.isFullMatch;
    const borderColor = isPartial ? 'var(--warning, #f59e0b)' : 'var(--primary)';
    
    return (
        <div
            className={`card slot-card ${isPartial ? 'partial' : 'full'}`}
            style={{ borderLeft: `4px solid ${borderColor}`, cursor: 'pointer' }}
            onClick={onClick}
            title="Click to Book"
        >
            <div className="slot-header">
                <div className="slot-time">{timeString}</div>
                {totalMembers > 0 && (
                    <div className={`attendance-badge ${isPartial ? 'partial' : 'full'}`}>
                        {availableCount}/{totalMembers}
                    </div>
                )}
            </div>
            <div className="slot-date">
                {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            
            {/* Show who's available/unavailable for partial matches */}
            {showPartial && slot.unavailableMembers?.length > 0 && (
                <div className="slot-attendance-detail">
                    <div className="unavailable-list">
                        <span className="label">Can't attend:</span>
                        {slot.unavailableMembers.map((m, i) => (
                            <span key={i} className="member-chip unavailable" title={m.reason}>
                                {m.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="slot-timezone">
                Shown in: {timeZone}
            </div>
        </div>
    );
}

export function GroupView({ group, currentUser, onFindTimes, suggestions, loading, onBack, onBook, onDeleteGroup, onMembersLoaded, onOpenAssistant }) {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0]);
    const [duration, setDuration] = useState(60); // Default 60 minutes
    const [bookingSlot, setBookingSlot] = useState(null);
    const [bookingProcessing, setBookingProcessing] = useState(false);

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
        if (onMembersLoaded) onMembersLoaded(mems);
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

    const handleDeleteGroup = async () => {
        if (!confirm(`Are you sure you want to DELETE the group "${group.name}"?\n\nThis cannot be undone.`)) return;
        if (!confirm(`FINAL WARNING: All members will be removed and this group will be permanently deleted.`)) return;
        
        const { error } = await deleteGroup(group.id);
        if (error) {
            alert('Failed to delete group: ' + error.message);
        } else {
            alert('Group deleted successfully.');
            if (onDeleteGroup) onDeleteGroup(group.id);
        }
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
                    hostProvider={currentUser?.provider}
                    hostEmail={currentUser?.username}
                    hostName={currentUser?.name}
                    processing={bookingProcessing}
                    onConfirm={async (subj, desc, membersToInvite) => {
                        setBookingProcessing(true);
                        try {
                            await onBook(group.id, bookingSlot, subj, desc, membersToInvite);
                            setBookingSlot(null);
                        } catch (err) {
                            console.error(err);
                        } finally {
                            setBookingProcessing(false);
                        }
                    }}
                    onCancel={() => !bookingProcessing && setBookingSlot(null)}
                />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button onClick={onBack} className="btn-ghost" style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}>←</button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0 }}>{fullGroupDetails?.name || group.name}</h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {group.id}</div>
                </div>
                {canManage && (
                    <button 
                        onClick={handleDeleteGroup} 
                        className="btn-danger"
                        title="Delete this group"
                    >
                        🗑️ Delete Group
                    </button>
                )}
            </div>

            <div className="grid-cols-2" style={{ gap: '2rem', marginBottom: '2rem' }}>
                {/* --- Search Availability --- */}
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>Find Humane Times</h3>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: '120px' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>From</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div style={{ minWidth: '120px' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>To</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div style={{ minWidth: '100px' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration</label>
                            <select 
                                value={duration} 
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="duration-select"
                            >
                                <option value={15}>15 min</option>
                                <option value={30}>30 min</option>
                                <option value={45}>45 min</option>
                                <option value={60}>1 hour</option>
                                <option value={90}>1.5 hours</option>
                                <option value={120}>2 hours</option>
                                <option value={180}>3 hours</option>
                                <option value={240}>4 hours</option>
                            </select>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={() => onFindTimes(group.id, startDate, endDate, duration)}
                            disabled={loading}
                            style={{ minWidth: '100px' }}
                        >
                            {loading ? 'Scanning...' : 'Search'}
                        </button>
                    </div>
                </div>

                {/* --- Member Management --- */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Members ({members.length})</h3>
                    </div>

                    {/* Invite Link Section - Only visible to organizer */}
                    {canManage && (
                        <InviteLinkCard 
                            groupName={fullGroupDetails?.name || group.name}
                            inviteCode={fullGroupDetails?.invite_code || group.invite_code}
                            groupId={group.id}
                            startDate={startDate}
                            endDate={endDate}
                            duration={duration}
                        />
                    )}

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

            {/* Smart Suggestions - Show when no full matches but partial matches exist */}
            {suggestions.length > 0 && suggestions.filter(s => s.isFullMatch).length === 0 && (
                <SmartSuggestions 
                    suggestions={suggestions}
                    members={members}
                    currentUserEmail={currentUser?.username}
                    onOpenAssistant={onOpenAssistant}
                />
            )}

            {/* Full Match Section */}
            {suggestions.filter(s => s.isFullMatch).length > 0 && (
                <div className="slots-section">
                    <h4 className="slots-section-title">
                        Everyone Available ({suggestions.filter(s => s.isFullMatch).length} times)
                    </h4>
                    <div className="grid-cols-2">
                        {suggestions.filter(s => s.isFullMatch).slice(0, 10).map((slot, i) => (
                            <SlotCard key={`full-${i}`} slot={slot} onClick={() => setBookingSlot(slot)} members={members} />
                        ))}
                    </div>
                </div>
            )}

            {/* Partial Match Section - Only show if no full matches or explicitly viewing */}
            {suggestions.filter(s => !s.isFullMatch).length > 0 && (
                <div className="slots-section partial-section">
                    <h4 className="slots-section-title">
                        Partial Availability ({suggestions.filter(s => !s.isFullMatch).length} times)
                        <span className="section-subtitle">Some members unavailable</span>
                    </h4>
                    <div className="grid-cols-2">
                        {suggestions.filter(s => !s.isFullMatch).slice(0, 10).map((slot, i) => (
                            <SlotCard key={`partial-${i}`} slot={slot} onClick={() => setBookingSlot(slot)} members={members} showPartial />
                        ))}
                    </div>
                </div>
            )}

            {!loading && suggestions.length === 0 && (
                <div className="no-slots-found">
                    <div className="no-slots-icon">🔍</div>
                    <h4>No matching times found</h4>
                    <p>This could mean:</p>
                    <ul>
                        <li>Members' availability windows don't overlap</li>
                        <li>All overlapping times are during busy periods</li>
                        <li>Members haven't set their availability windows yet</li>
                    </ul>
                    <div className="no-slots-actions">
                        <button 
                            className="btn-secondary"
                            onClick={() => {
                                // Expand date range
                                const newEnd = new Date(endDate);
                                newEnd.setDate(newEnd.getDate() + 7);
                                setEndDate(newEnd.toISOString().split('T')[0]);
                            }}
                        >
                            Expand Date Range (+7 days)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
