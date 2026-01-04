import React, { useState, useEffect } from 'react';
import { getGroupByInviteCode, getGroupMembers, joinGroupByCode, updateProfile, getProfile } from '../services/supabase';

export function JoinGroupPage({ 
    inviteCode, 
    onClose, 
    onLoginMS, 
    onLoginGoogle, 
    currentUser,
    onJoinSuccess 
}) {
    const [loading, setLoading] = useState(true);
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [error, setError] = useState(null);
    const [joining, setJoining] = useState(false);
    const [isExistingMember, setIsExistingMember] = useState(false);
    const [showUpdateSettings, setShowUpdateSettings] = useState(false);

    // Guest form state
    const [guestMode, setGuestMode] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [windows, setWindows] = useState([
        { start: "09:00", end: "17:00", type: "weekday" }
    ]);

    useEffect(() => {
        loadGroupDetails();
    }, [inviteCode, currentUser]);

    const loadGroupDetails = async () => {
        setLoading(true);
        setError(null);

        const groupData = await getGroupByInviteCode(inviteCode);
        if (!groupData) {
            setError('Invalid invite code. This group may not exist.');
            setLoading(false);
            return;
        }

        setGroup(groupData);
        const memberList = await getGroupMembers(groupData.id);
        setMembers(memberList);

        // Check if current user is already a member
        if (currentUser) {
            const isMember = memberList.some(m => m.email === currentUser.username);
            setIsExistingMember(isMember);
            
            // Load their existing profile for editing
            if (isMember) {
                const profile = await getProfile(currentUser.username);
                if (profile) {
                    setGuestName(profile.display_name || '');
                    setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
                    if (profile.humane_windows && profile.humane_windows.length > 0) {
                        setWindows(profile.humane_windows);
                    }
                }
            }
        }

        // Also check localStorage for returning guests
        const savedGuestEmail = localStorage.getItem('guestEmail');
        if (savedGuestEmail && !currentUser) {
            const isMember = memberList.some(m => m.email === savedGuestEmail);
            if (isMember) {
                setIsExistingMember(true);
                setGuestEmail(savedGuestEmail);
                const profile = await getProfile(savedGuestEmail);
                if (profile) {
                    setGuestName(profile.display_name || '');
                    setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
                    if (profile.humane_windows && profile.humane_windows.length > 0) {
                        setWindows(profile.humane_windows);
                    }
                }
            }
        }

        setLoading(false);
    };

    const handleJoinAsUser = async () => {
        if (!currentUser) return;
        setJoining(true);

        const result = await joinGroupByCode(inviteCode, currentUser.username);
        
        if (result.error) {
            alert(result.error.message || 'Failed to join group');
        } else if (result.alreadyMember) {
            // Already a member - just go to the group
            onJoinSuccess(result.group);
        } else {
            onJoinSuccess(result.group);
        }
        setJoining(false);
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        setJoining(true);

        const email = currentUser?.username || guestEmail;
        
        await updateProfile(
            email,
            guestName,
            timezone,
            windows[0]?.start || "09:00",
            windows[0]?.end || "17:00",
            windows
        );

        alert('Settings updated! Your new availability will be used for future meetings.');
        onJoinSuccess(group, currentUser ? null : {
            username: guestEmail,
            name: guestName,
            provider: 'guest'
        });
        setJoining(false);
    };

    const handleJoinAsGuest = async (e) => {
        e.preventDefault();
        if (!guestName || !guestEmail) {
            alert('Please enter your name and email');
            return;
        }

        setJoining(true);

        // Create profile first
        await updateProfile(
            guestEmail,
            guestName,
            timezone,
            windows[0]?.start || "09:00",
            windows[0]?.end || "17:00",
            windows
        );

        // Then join group
        const result = await joinGroupByCode(inviteCode, guestEmail);
        
        if (result.error) {
            alert(result.error.message || 'Failed to join group');
            setJoining(false);
            return;
        }

        // Store guest session
        localStorage.setItem('guestEmail', guestEmail);
        
        onJoinSuccess(result.group, {
            username: guestEmail,
            name: guestName,
            provider: 'guest'
        });
        setJoining(false);
    };

    if (loading) {
        return (
            <div className="join-page">
                <div className="join-card">
                    <div className="join-loading">
                        <div className="spinner"></div>
                        <p>Loading group details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="join-page">
                <div className="join-card">
                    <div className="join-error">
                        <span className="error-icon">❌</span>
                        <h2>Link Not Found</h2>
                        <p>This invite link may have expired or the group no longer exists.</p>
                        <p className="error-suggestion">Please ask the group organizer to send you a new link.</p>
                        <details className="error-debug">
                            <summary>Technical Details</summary>
                            <p>Code: <code>{inviteCode}</code></p>
                            <p>Check browser console for more info.</p>
                        </details>
                        <button className="btn-primary" onClick={onClose}>Go to Dashboard</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="join-page">
            <div className="join-card">
                <div className="join-header">
                    <img src="/logo.png" alt="Humane Calendar" className="join-logo" />
                    <h1>{isExistingMember ? 'Welcome Back!' : "You're Invited!"}</h1>
                </div>

                <div className="group-preview">
                    <h2>{group.name}</h2>
                    <div className="group-meta">
                        <span>👥 {members.length} {members.length === 1 ? 'member' : 'members'}</span>
                        {group.created_by && <span>Created by {group.created_by.split('@')[0]}</span>}
                    </div>
                    {isExistingMember && (
                        <div className="member-status">
                            ✓ You're already a member of this group
                        </div>
                    )}
                    {members.length > 0 && !isExistingMember && (
                        <div className="member-preview">
                            {members.slice(0, 5).map(m => (
                                <div key={m.email} className="member-chip">
                                    {m.display_name || m.email.split('@')[0]}
                                </div>
                            ))}
                            {members.length > 5 && (
                                <div className="member-chip more">+{members.length - 5} more</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Existing member - show options to view group or update settings */}
                {isExistingMember && !showUpdateSettings ? (
                    <div className="existing-member-actions">
                        <button 
                            className="btn-primary btn-large" 
                            onClick={() => onJoinSuccess(group)}
                        >
                            📅 View Group & Meetings
                        </button>
                        <button 
                            className="btn-secondary btn-large" 
                            onClick={() => setShowUpdateSettings(true)}
                        >
                            ⚙️ Update My Availability
                        </button>
                    </div>
                ) : isExistingMember && showUpdateSettings ? (
                    // Settings update form for existing members
                    <form className="guest-join-form" onSubmit={handleUpdateSettings}>
                        <h3>Update Your Availability</h3>
                        <p className="form-subtitle">Changes apply to all future meetings in this group.</p>
                        
                        <div className="form-group">
                            <label>Display Name</label>
                            <input
                                type="text"
                                value={guestName}
                                onChange={e => setGuestName(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Timezone</label>
                            <select value={timezone} onChange={e => setTimezone(e.target.value)}>
                                {Intl.supportedValuesOf('timeZone').map(tz => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Your Availability</label>
                            {windows.map((win, idx) => (
                                <div key={idx} className="window-row-compact">
                                    <select 
                                        value={win.type} 
                                        onChange={e => {
                                            const newWins = [...windows];
                                            newWins[idx].type = e.target.value;
                                            setWindows(newWins);
                                        }}
                                    >
                                        <option value="weekday">Weekdays</option>
                                        <option value="weekend">Weekends</option>
                                        <option value="everyday">Every Day</option>
                                    </select>
                                    <input 
                                        type="time" 
                                        value={win.start}
                                        onChange={e => {
                                            const newWins = [...windows];
                                            newWins[idx].start = e.target.value;
                                            setWindows(newWins);
                                        }}
                                    />
                                    <span>to</span>
                                    <input 
                                        type="time" 
                                        value={win.end}
                                        onChange={e => {
                                            const newWins = [...windows];
                                            newWins[idx].end = e.target.value;
                                            setWindows(newWins);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-ghost" onClick={() => setShowUpdateSettings(false)}>
                                ← Back
                            </button>
                            <button type="submit" className="btn-primary" disabled={joining}>
                                {joining ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : currentUser ? (
                    // Logged in but not yet a member - just join
                    <div className="join-actions-logged-in">
                        <p className="logged-in-as">
                            Logged in as <strong>{currentUser.name}</strong>
                        </p>
                        <button 
                            className="btn-primary btn-large" 
                            onClick={handleJoinAsUser}
                            disabled={joining}
                        >
                            {joining ? 'Joining...' : '✓ Join This Group'}
                        </button>
                        <button className="btn-ghost" onClick={onClose}>Cancel</button>
                    </div>
                ) : guestMode ? (
                    // Guest form
                    <form className="guest-join-form" onSubmit={handleJoinAsGuest}>
                        <h3>Join as Guest</h3>
                        <p className="form-subtitle">No calendar sync required. Just tell us when you're available.</p>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Your Name</label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                    placeholder="John Smith"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={guestEmail}
                                    onChange={e => setGuestEmail(e.target.value)}
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Timezone</label>
                            <select value={timezone} onChange={e => setTimezone(e.target.value)}>
                                {Intl.supportedValuesOf('timeZone').map(tz => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Your Availability</label>
                            {windows.map((win, idx) => (
                                <div key={idx} className="window-row-compact">
                                    <select 
                                        value={win.type} 
                                        onChange={e => {
                                            const newWins = [...windows];
                                            newWins[idx].type = e.target.value;
                                            setWindows(newWins);
                                        }}
                                    >
                                        <option value="weekday">Weekdays</option>
                                        <option value="weekend">Weekends</option>
                                        <option value="everyday">Every Day</option>
                                    </select>
                                    <input 
                                        type="time" 
                                        value={win.start}
                                        onChange={e => {
                                            const newWins = [...windows];
                                            newWins[idx].start = e.target.value;
                                            setWindows(newWins);
                                        }}
                                    />
                                    <span>to</span>
                                    <input 
                                        type="time" 
                                        value={win.end}
                                        onChange={e => {
                                            const newWins = [...windows];
                                            newWins[idx].end = e.target.value;
                                            setWindows(newWins);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-ghost" onClick={() => setGuestMode(false)}>
                                ← Back
                            </button>
                            <button type="submit" className="btn-primary" disabled={joining}>
                                {joining ? 'Joining...' : 'Join Group'}
                            </button>
                        </div>
                    </form>
                ) : (
                    // Login options
                    <div className="join-options">
                        <h3>How would you like to join?</h3>
                        
                        <button className="btn-login btn-microsoft btn-large" onClick={onLoginMS}>
                            <span>🔵</span> Continue with Microsoft
                        </button>
                        
                        <button className="btn-login btn-google btn-large" onClick={onLoginGoogle}>
                            <span>🔴</span> Continue with Google
                        </button>

                        <div className="divider-text">
                            <span>or</span>
                        </div>

                        <button className="btn-ghost guest-btn btn-large" onClick={() => setGuestMode(true)}>
                            <span>👤</span> Continue as Guest
                        </button>

                        <p className="privacy-note">
                            🔒 We only access your busy/free times. Event details remain private.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
