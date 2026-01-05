import React from 'react';

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
    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'GU';

    const getProviderLabel = (provider) => {
        switch (provider) {
            case 'microsoft': return { icon: '🔵', name: 'Microsoft', color: '#0078d4' };
            case 'google': return { icon: '🔴', name: 'Google', color: '#ea4335' };
            case 'guest': return { icon: '👤', name: 'Guest', color: 'var(--text-muted)' };
            default: return { icon: '👤', name: 'User', color: 'var(--text-muted)' };
        }
    };

    const providerInfo = user ? getProviderLabel(user.provider) : null;

    return (
        <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
            <div className="brand" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
                <img src="/logo.png" alt="Logo" style={{ height: '64px', width: 'auto' }} />
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
                                <span>{providerInfo.icon}</span>
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
                                            🔵 MS
                                        </button>
                                        <button 
                                            onClick={() => onConnectCalendar('google')} 
                                            className="btn-connect"
                                            title="Connect Google Calendar"
                                        >
                                            🔴 G
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
                                        {syncStatus === 'Idle' ? '✓ Calendar synced' : syncStatus}
                                    </div>
                                    {onTestCalendar && (
                                        <button 
                                            onClick={onTestCalendar}
                                            className="btn-test-calendar"
                                            title="Create a test event to verify calendar access"
                                        >
                                            🧪 Test
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
                            ✕
                        </button>
                    </>
                ) : (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button onClick={onLoginMS} className="btn-login btn-microsoft">
                            <span className="login-icon">🔵</span>
                            Sign in with Microsoft
                        </button>
                        <button onClick={onLoginGoogle} className="btn-login btn-google">
                            <span className="login-icon">🔴</span>
                            Sign in with Google
                        </button>
                        <div className="divider-text">
                            <span>or</span>
                        </div>
                        <button onClick={onGuestJoin} className="btn-ghost guest-btn">
                            <span className="login-icon">👤</span>
                            Join as Guest
                        </button>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <div
                    className="privacy-badge"
                    onClick={onShowPrivacy}
                >
                    <span style={{ fontSize: '1rem' }}>🛡️</span> Privacy & Data Protection
                </div>
                <div
                    className="admin-link"
                    onClick={onShowAdmin}
                    title="Admin Dashboard (Ctrl+Shift+A)"
                >
                    🔧 Status
                </div>
            </div>
        </div>
    );
}
