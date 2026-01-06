import React, { useState, useEffect } from 'react';

// Beta invite code - can be overridden via environment variable
const BETA_CODE = import.meta.env.VITE_BETA_CODE || 'HUMANE100';

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
    const [betaCodeInput, setBetaCodeInput] = useState('');
    const [betaError, setBetaError] = useState('');

    // Check localStorage for existing beta access OR existing user session
    useEffect(() => {
        const savedAccess = localStorage.getItem('hasBetaAccess');
        const existingSession = localStorage.getItem('userSession');
        
        // Grant beta access if they have the flag OR if they were already logged in before
        if (savedAccess === 'true' || existingSession) {
            setHasBetaAccess(true);
            // Also set the flag so they keep access even if they log out
            if (!savedAccess) {
                localStorage.setItem('hasBetaAccess', 'true');
            }
        }
    }, []);

    const handleBetaCodeSubmit = () => {
        if (betaCodeInput.trim().toUpperCase() === BETA_CODE) {
            setHasBetaAccess(true);
            localStorage.setItem('hasBetaAccess', 'true');
            setBetaError('');
        } else {
            setBetaError('Invalid invite code');
            setTimeout(() => setBetaError(''), 3000);
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
                                Calendar sign-in limited to 100 users during verification.
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
                        ) : (
                            <div className="beta-code-section">
                                <input
                                    type="text"
                                    placeholder="Enter invite code"
                                    value={betaCodeInput}
                                    onChange={(e) => setBetaCodeInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleBetaCodeSubmit()}
                                    className="beta-code-input"
                                />
                                <button 
                                    onClick={handleBetaCodeSubmit}
                                    className="btn-ghost"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                >
                                    Unlock
                                </button>
                                {betaError && (
                                    <div className="beta-error">{betaError}</div>
                                )}
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
