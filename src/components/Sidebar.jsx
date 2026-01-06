import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

// Beta access is now controlled entirely through admin approval
// No invite codes - everyone must request and be approved

export function Sidebar({ 
    activeView, 
    setView, 
    user, 
    onLogout, 
    syncStatus, 
    onSync, 
    onLoginMS, 
    onLoginGoogle, 
    onGuestJoin,
    calendarConnected,
    onConnectCalendar,
    isOpen,
    onShowPrivacy,
    onShowAdmin,
    onTestCalendar
}) {
    const [hasBetaAccess, setHasBetaAccess] = useState(false);
    const [betaError, setBetaError] = useState('');
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [requestForm, setRequestForm] = useState({ name: '', email: '', reason: '', provider: '' });
    const [requestStatus, setRequestStatus] = useState(null); // 'sending', 'sent', 'error'

    // Check if user has been approved - only grant access if explicitly approved
    useEffect(() => {
        const checkApproval = async () => {
            const existingSession = localStorage.getItem('userSession');
            if (existingSession) {
                try {
                    const session = JSON.parse(existingSession);
                    // Check if this user is approved in the database
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_approved')
                        .eq('email', session.username)
                        .single();
                    
                    if (profile?.is_approved === true) {
                        setHasBetaAccess(true);
                    }
                } catch (e) {
                    console.log('Could not verify approval status');
                }
            }
        };
        checkApproval();
    }, []);

    // Submit beta access request
    const handleRequestAccess = async () => {
        if (!requestForm.name.trim() || !requestForm.email.trim()) {
            setBetaError('Please fill in name and email');
            return;
        }
        
        // Basic email validation
        if (!requestForm.email.includes('@')) {
            setBetaError('Please enter a valid email');
            return;
        }
        
        if (!requestForm.provider) {
            setBetaError('Please select Google or Microsoft');
            return;
        }
        
        setRequestStatus('sending');
        setBetaError('');
        
        try {
            // Create a pending profile (is_approved = null means pending)
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    email: requestForm.email.toLowerCase().trim(),
                    display_name: requestForm.name.trim(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    humane_start_local: '09:00',
                    humane_end_local: '17:00',
                    humane_windows: [{ start: '09:00', end: '17:00', type: 'weekday' }],
                    requested_provider: requestForm.provider, // Track which provider they want
                    // is_approved defaults to NULL in DB (pending)
                }, { onConflict: 'email' });
            
            if (error) throw error;
            
            setRequestStatus('sent');
            // Store email so we can check their status later
            localStorage.setItem('pendingBetaEmail', requestForm.email.toLowerCase().trim());
        } catch (err) {
            console.error('Request access failed:', err);
            setBetaError('Failed to submit request. Please try again.');
            setRequestStatus('error');
        }
    };

    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'GU';

    const getProviderLabel = (provider) => {
        switch (provider) {
            case 'microsoft': return { name: 'Microsoft', color: '#0078d4' };
            case 'google': return { name: 'Google', color: '#ea4335' };
            case 'guest': return { name: 'Guest', color: 'var(--text-muted)' };
            default: return { name: 'User', color: 'var(--text-muted)' };
        }
    };

    const providerInfo = user ? getProviderLabel(user.provider) : null;

    return (
        <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
            <div className="brand" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
                <img src="/logo.png" alt="Logo" style={{ height: '64px', width: 'auto' }} />
            </div>
            <div className="brand-tagline">
                Schedule across timezones
            </div>

            <nav className="nav-menu">
                <div
                    className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setView('dashboard')}
                >
                    Dashboard
                </div>
                <div
                    className={`nav-item ${activeView === 'groups' ? 'active' : ''}`}
                    onClick={() => setView('groups')}
                >
                    My Groups
                </div>
            </nav>

            <div className="user-profile">
                {user ? (
                    <>
                        <div className="avatar" style={{ borderColor: providerInfo.color }}>
                            {getInitials(user.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                {user.name}
                            </div>
                            
                            {/* Provider Badge */}
                            <div className="provider-badge" style={{ borderColor: providerInfo.color }}>
                                <span>{providerInfo.name}</span>
                            </div>

                            {/* Calendar Status */}
                            {user.provider === 'guest' && !calendarConnected ? (
                                <div className="connect-calendar-section">
                                    <div className="connect-buttons" style={{ marginTop: '0.5rem' }}>
                                        <button 
                                            onClick={() => onConnectCalendar('microsoft')} 
                                            className="btn-connect"
                                            title="Connect Microsoft Calendar"
                                        >
                                            MS
                                        </button>
                                        <button 
                                            onClick={() => onConnectCalendar('google')} 
                                            className="btn-connect"
                                            title="Connect Google Calendar"
                                        >
                                            G
                                        </button>
                                    </div>
                                </div>
                            ) : calendarConnected ? (
                                <div className="calendar-status-section">
                                    <div
                                        className="sync-status"
                                        style={{ 
                                            color: syncStatus === 'Synced!' ? 'var(--primary)' : 'var(--text-muted)', 
                                            cursor: 'pointer'
                                        }}
                                        onClick={onSync}
                                    >
                                        {syncStatus === 'Idle' ? 'Calendar synced' : syncStatus}
                                    </div>
                                    {onTestCalendar && (
                                        <button 
                                            onClick={onTestCalendar}
                                            className="btn-test-calendar"
                                            title="Create a test event to verify calendar access"
                                        >
                                            Test
                                        </button>
                                    )}
                                </div>
                            ) : null}
                        </div>
                        <button 
                            onClick={onLogout} 
                            className="btn-ghost logout-btn" 
                            title={`Sign out of ${providerInfo.name}`}
                        >
                            ×
                        </button>
                    </>
                ) : (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* BETA ACCESS GATE */}
                        <div className="beta-notice">
                            <div className="beta-badge">CLOSED BETA</div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0', lineHeight: 1.4 }}>
                                Limited to 100 Google + 100 Microsoft users.<br/>
                                Microsoft: Personal accounts only (work accounts may be blocked).
                            </p>
                        </div>

                        {hasBetaAccess ? (
                            <>
                                <button onClick={onLoginMS} className="btn-login btn-microsoft">
                                    Sign in with Microsoft
                                </button>
                                <button onClick={onLoginGoogle} className="btn-login btn-google">
                                    Sign in with Google
                                </button>
                            </>
                        ) : requestStatus === 'sent' ? (
                            <div className="beta-request-sent">
                                <div className="sent-icon">✓</div>
                                <p className="sent-title">Request Submitted!</p>
                                <p className="sent-message">
                                    We'll review your request and email you when approved. 
                                    Check back soon or use Guest mode below.
                                </p>
                            </div>
                        ) : showRequestForm ? (
                            <div className="beta-request-form">
                                <input
                                    type="text"
                                    placeholder="Your name"
                                    value={requestForm.name}
                                    onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                                    className="beta-input"
                                />
                                <input
                                    type="email"
                                    placeholder="Your email"
                                    value={requestForm.email}
                                    onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                                    className="beta-input"
                                />
                                <div className="provider-select">
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                                        Which calendar will you use?
                                    </label>
                                    <div className="provider-buttons">
                                        <button
                                            type="button"
                                            className={`provider-btn ${requestForm.provider === 'google' ? 'selected' : ''}`}
                                            onClick={() => setRequestForm({ ...requestForm, provider: 'google' })}
                                        >
                                            <span className="provider-icon">G</span>
                                            Google
                                        </button>
                                        <button
                                            type="button"
                                            className={`provider-btn ${requestForm.provider === 'microsoft' ? 'selected' : ''}`}
                                            onClick={() => setRequestForm({ ...requestForm, provider: 'microsoft' })}
                                        >
                                            <span className="provider-icon">M</span>
                                            Microsoft
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="How will you use Humane Calendar? (optional)"
                                    value={requestForm.reason}
                                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                                    className="beta-input beta-textarea"
                                    rows={2}
                                />
                                <button 
                                    onClick={handleRequestAccess}
                                    className="btn-primary"
                                    disabled={requestStatus === 'sending'}
                                    style={{ width: '100%' }}
                                >
                                    {requestStatus === 'sending' ? 'Submitting...' : 'Submit Request'}
                                </button>
                                <button 
                                    onClick={() => setShowRequestForm(false)}
                                    className="btn-ghost"
                                    style={{ width: '100%', fontSize: '0.75rem' }}
                                >
                                    ← Back
                                </button>
                                {betaError && (
                                    <div className="beta-error">{betaError}</div>
                                )}
                            </div>
                        ) : (
                            <div className="beta-options">
                                <button 
                                    onClick={() => setShowRequestForm(true)}
                                    className="btn-primary"
                                    style={{ width: '100%' }}
                                >
                                    Request Beta Access
                                </button>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.5rem 0 0 0' }}>
                                    Each request is reviewed individually
                                </p>
                            </div>
                        )}

                        <div className="divider-text">
                            <span>or</span>
                        </div>
                        <button onClick={onGuestJoin} className="btn-ghost guest-btn">
                            Continue as Guest
                        </button>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
                            Guest mode works for everyone!
                        </p>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                {/* Feedback button for logged-in users */}
                {user && (
                    <a
                        href="https://docs.google.com/forms/d/e/1FAIpQLSd1JjZjqcJgURJ-6YLYz4hC0VTJxw-e7jIBUoXZrC35DNL7Ow/viewform"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="feedback-link"
                        title="Send feedback about your beta experience"
                    >
                        📝 Send Feedback
                    </a>
                )}
                <a
                    href="/how-it-works"
                    className="how-link"
                >
                    How It Works
                </a>
                <div
                    className="privacy-badge"
                    onClick={onShowPrivacy}
                >
                    Privacy
                </div>
                <div
                    className="admin-link"
                    onClick={onShowAdmin}
                    title="Admin Dashboard (Ctrl+Shift+A)"
                >
                    Status
                </div>
            </div>
        </div>
    );
}
