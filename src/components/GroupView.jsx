import React, { useState, useEffect, useCallback } from 'react';
import { BookingModal } from './BookingModal';
import { SmartSuggestions } from './SmartSuggestions';
import { AICommandCenter } from './AICommandCenter';
import { getGroupMembers, removeMember, makeAdmin, getGroupDetails, deleteGroup, updateGroupMeetingSettings, supabase, getBookedMeetings } from '../services/supabase';

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
            } catch {
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
                    <span className="date-range-label">Looking for availability:</span>
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

// Results Summary Component - Smart, clean display of scheduling results
function ResultsSummary({ suggestions, members, onSelectSlot }) {
    const [showAll, setShowAll] = useState(false);
    
    const fullMatches = suggestions.filter(s => s.isFullMatch);
    const partialMatches = suggestions.filter(s => !s.isFullMatch);
    
    // Group full matches by day for cleaner display
    const fullByDay = {};
    fullMatches.forEach(slot => {
        const dayKey = new Date(slot.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (!fullByDay[dayKey]) fullByDay[dayKey] = [];
        fullByDay[dayKey].push(slot);
    });
    
    // Get best partial matches (highest attendance)
    const bestPartials = partialMatches.slice(0, showAll ? 10 : 3);
    
    const hasFullMatches = fullMatches.length > 0;
    const totalOptions = fullMatches.length + partialMatches.length;

    return (
        <div className="results-summary">
            {/* Header with stats */}
            <div className="results-header">
                <div className="results-stats">
                    {hasFullMatches ? (
                        <>
                            <span className="stat-highlight">✓ {fullMatches.length} times</span> when everyone can meet
                        </>
                    ) : (
                        <>
                            <span className="stat-warning">No times when everyone is free</span>
                            {partialMatches.length > 0 && (
                                <span className="stat-muted"> — {partialMatches.length} partial options below</span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Full matches - grouped by day */}
            {hasFullMatches && (
                <div className="results-section results-full">
                    <h4>Best Times (Everyone Available)</h4>
                    <div className="day-groups">
                        {Object.entries(fullByDay).slice(0, showAll ? undefined : 3).map(([day, slots]) => (
                            <div key={day} className="day-group">
                                <div className="day-label">{day}</div>
                                <div className="time-chips">
                                    {slots.slice(0, showAll ? 5 : 2).map((slot, i) => (
                                        <button
                                            key={i}
                                            className="time-chip full"
                                            onClick={() => onSelectSlot(slot)}
                                        >
                                            {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </button>
                                    ))}
                                    {slots.length > (showAll ? 5 : 2) && (
                                        <span className="more-times">+{slots.length - (showAll ? 5 : 2)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {Object.keys(fullByDay).length > 3 && !showAll && (
                        <button className="show-more-btn" onClick={() => setShowAll(true)}>
                            Show all {fullMatches.length} options
                        </button>
                    )}
                </div>
            )}

            {/* Partial matches - only if no full matches OR user wants to see more */}
            {(!hasFullMatches || showAll) && partialMatches.length > 0 && (
                <div className="results-section results-partial">
                    <h4>
                        Partial Availability
                        <span className="section-note">Some members can't make these times</span>
                    </h4>
                    <div className="partial-list">
                        {bestPartials.map((slot, i) => {
                            const available = slot.availableMembers?.length || 0;
                            const total = members.length;
                            const unavailable = slot.unavailableMembers || [];
                            
                            return (
                                <div 
                                    key={i} 
                                    className="partial-option"
                                    onClick={() => onSelectSlot(slot)}
                                >
                                    <div className="partial-time">
                                        <span className="time">{new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="date">{new Date(slot.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <div className="partial-attendance">
                                        <span className="ratio">{available}/{total}</span>
                                        <span className="who-cant">
                                            {unavailable.slice(0, 2).map(m => m.name).join(', ')}
                                            {unavailable.length > 2 && ` +${unavailable.length - 2}`}
                                        </span>
                                    </div>
                                    <button className="btn-book-partial">Book</button>
                                </div>
                            );
                        })}
                    </div>
                    {partialMatches.length > 3 && !showAll && (
                        <button className="show-more-btn" onClick={() => setShowAll(true)}>
                            Show all {partialMatches.length} partial options
                        </button>
                    )}
                </div>
            )}

            {/* Collapse button */}
            {showAll && totalOptions > 6 && (
                <button className="show-more-btn" onClick={() => setShowAll(false)}>
                    Show less
                </button>
            )}
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
    // Meeting search settings - loaded from group, with fallback to defaults
    const getDefaultStartDate = () => new Date().toISOString().split('T')[0];
    const getDefaultEndDate = () => new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0];
    
    const [startDate, setStartDate] = useState(group.meeting_date_from || getDefaultStartDate());
    const [endDate, setEndDate] = useState(group.meeting_date_to || getDefaultEndDate());
    const [duration, setDuration] = useState(group.meeting_duration || 60);
    const [bookingSlot, setBookingSlot] = useState(null);
    const [bookingProcessing, setBookingProcessing] = useState(false);
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // Admin State
    const [members, setMembers] = useState([]);
    const [fullGroupDetails, setFullGroupDetails] = useState(group);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [bookedMeetings, setBookedMeetings] = useState([]);

    // Track previous member count to detect new joins
    const [prevMemberCount, setPrevMemberCount] = useState(0);
    const [hasAutoSearched, setHasAutoSearched] = useState(false);

    // Load group data and saved meeting settings
    useEffect(() => {
        const loadData = async () => {
            const mems = await getGroupMembers(group.id);
            setMembers(mems);
            if (onMembersLoaded) onMembersLoaded(mems);
            const details = await getGroupDetails(group.id);
            if (details) {
                setFullGroupDetails(details);
                // Load saved meeting settings if they exist (only on first load)
                if (!settingsLoaded) {
                    if (details.meeting_date_from) setStartDate(details.meeting_date_from);
                    if (details.meeting_date_to) setEndDate(details.meeting_date_to);
                    if (details.meeting_duration) setDuration(details.meeting_duration);
                    setSettingsLoaded(true);
                }
            }
            // Fetch booked meetings
            const meetings = await getBookedMeetings(group.id);
            setBookedMeetings(meetings);
        };
        loadData();
    }, [group.id, refreshTrigger, settingsLoaded, onMembersLoaded]);
    
    // AUTO-SEARCH: Run search automatically when viewing group or when members change
    useEffect(() => {
        // Need at least 2 members and settings loaded before auto-searching
        if (members.length < 2 || !settingsLoaded || loading) return;
        
        const shouldSearch = !hasAutoSearched || (prevMemberCount > 0 && members.length !== prevMemberCount);
        
        if (shouldSearch) {
            console.log(`Auto-searching: ${hasAutoSearched ? 'member count changed' : 'initial load'} (${prevMemberCount} → ${members.length})`);
            onFindTimes(group.id, startDate, endDate, duration);
            setHasAutoSearched(true);
        }
        
        setPrevMemberCount(members.length);
    }, [members.length, settingsLoaded, hasAutoSearched, prevMemberCount, loading, onFindTimes, group.id, startDate, endDate, duration]);

    // REAL-TIME: Subscribe to member changes (new joins, availability updates)
    useEffect(() => {
        // Subscribe to changes in group_members table for this group
        const channel = supabase
            .channel(`group-${group.id}-members`)
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'group_members',
                    filter: `group_id=eq.${group.id}`
                },
                (payload) => {
                    console.log('Member change detected:', payload.eventType);
                    // Trigger refresh to reload members and re-search
                    setRefreshTrigger(p => p + 1);
                    setHasAutoSearched(false); // Force re-search
                }
            )
            .subscribe();

        // Also subscribe to profile changes (availability updates)
        const profileChannel = supabase
            .channel(`group-${group.id}-profiles`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    // Check if this profile is a member of our group
                    const updatedEmail = payload.new?.email;
                    if (members.some(m => m.email === updatedEmail)) {
                        console.log('Member availability updated:', updatedEmail);
                        setRefreshTrigger(p => p + 1);
                        setHasAutoSearched(false); // Force re-search
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(profileChannel);
        };
    }, [group.id, members]);

    // Save meeting settings when they change (debounced)
    const saveMeetingSettings = useCallback(async (newStartDate, newEndDate, newDuration) => {
        // Only save if we're the creator
        if (fullGroupDetails?.created_by !== currentUser?.username) return;
        
        await updateGroupMeetingSettings(group.id, {
            dateFrom: newStartDate,
            dateTo: newEndDate,
            duration: newDuration
        });
    }, [group.id, fullGroupDetails?.created_by, currentUser?.username]);

    // Auto-save settings when changed
    useEffect(() => {
        if (!settingsLoaded) return; // Don't save on initial load
        
        const timer = setTimeout(() => {
            saveMeetingSettings(startDate, endDate, duration);
        }, 1000); // Debounce 1 second
        
        return () => clearTimeout(timer);
    }, [startDate, endDate, duration, settingsLoaded, saveMeetingSettings]);

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
                            // Refresh to show the new booked meeting
                            setRefreshTrigger(p => p + 1);
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
                        Delete Group
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

            {/* Booked Meetings - Show scheduled meetings for this group */}
            {bookedMeetings.length > 0 && (
                <div className="booked-meetings-section">
                    <h3>📅 Scheduled Meetings</h3>
                    <div className="booked-meetings-list">
                        {bookedMeetings.map(meeting => {
                            const startDate = new Date(meeting.start_time);
                            const endDate = new Date(meeting.end_time);
                            const isPast = startDate < new Date();
                            const isUpcoming = !isPast && startDate - new Date() < 24 * 60 * 60 * 1000; // Within 24 hours
                            
                            return (
                                <div 
                                    key={meeting.id} 
                                    className={`booked-meeting-card ${isPast ? 'past' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                                >
                                    <div className="meeting-datetime">
                                        <div className="meeting-date">
                                            {startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="meeting-time">
                                            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                                            {' – '}
                                            {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="meeting-details">
                                        <div className="meeting-subject">{meeting.subject}</div>
                                        {meeting.attendees && (
                                            <div className="meeting-attendees">
                                                {meeting.attendees.length} attendees
                                            </div>
                                        )}
                                    </div>
                                    <div className="meeting-actions">
                                        {meeting.meeting_link && (
                                            <a 
                                                href={meeting.meeting_link} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="btn-join-meeting"
                                            >
                                                Join
                                            </a>
                                        )}
                                        {isUpcoming && (
                                            <span className="upcoming-badge">Upcoming</span>
                                        )}
                                        {isPast && (
                                            <span className="past-badge">Completed</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* AI Command Center - Prominent AI assistant with action buttons */}
            <AICommandCenter
                currentUser={currentUser}
                currentGroup={fullGroupDetails}
                groupMembers={members}
                suggestions={suggestions}
                isOrganiser={isCreator}
                onBookMeeting={(slot) => setBookingSlot(slot)}
            />

            {/* Smart Suggestions - Show when no full matches but partial matches exist */}
            {suggestions.length > 0 && suggestions.filter(s => s.isFullMatch).length === 0 && (
                <SmartSuggestions 
                    suggestions={suggestions}
                    members={members}
                    currentUserEmail={currentUser?.username}
                    onOpenAssistant={onOpenAssistant}
                />
            )}

            {/* Results Summary */}
            {suggestions.length > 0 && (
                <ResultsSummary 
                    suggestions={suggestions} 
                    members={members}
                    onSelectSlot={(slot) => setBookingSlot(slot)}
                />
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
