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
    isOpen 
}) {
    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'GU';

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
                        <div className="avatar">{getInitials(user.name)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                {user.name}
                            </div>
                            {user.provider === 'guest' && !calendarConnected ? (
                                <div className="connect-calendar-section">
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Guest Mode
                                    </span>
                                    <div className="connect-buttons">
                                        <button 
                                            onClick={() => onConnectCalendar('microsoft')} 
                                            className="btn-connect"
                                            title="Connect Microsoft Calendar"
                                        >
                                            📅 MS
                                        </button>
                                        <button 
                                            onClick={() => onConnectCalendar('google')} 
                                            className="btn-connect"
                                            title="Connect Google Calendar"
                                        >
                                            📅 G
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    style={{ 
                                        fontSize: '0.75rem', 
                                        color: syncStatus === 'Synced!' ? 'var(--primary)' : 'var(--text-muted)', 
                                        cursor: calendarConnected ? 'pointer' : 'default', 
                                        fontFamily: 'var(--font-sans)' 
                                    }}
                                    onClick={calendarConnected ? onSync : undefined}
                                >
                                    {calendarConnected 
                                        ? (syncStatus === 'Idle' ? '✓ Calendar Connected' : syncStatus)
                                        : 'Manual Availability'
                                    }
                                </div>
                            )}
                        </div>
                        <button onClick={onLogout} className="btn-ghost logout-btn" title="Logout">
                            ✕
                        </button>
                    </>
                ) : (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button onClick={onLoginMS} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                            Sign in (Microsoft)
                        </button>
                        <button onClick={onLoginGoogle} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.5rem', border: '1px solid var(--border)' }}>
                            Sign in (Google)
                        </button>
                        <div className="divider-text">
                            <span>or</span>
                        </div>
                        <button onClick={onGuestJoin} className="btn-ghost guest-btn" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                            Join as Guest
                        </button>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <div
                    className="privacy-badge"
                    onClick={() => alert("🔒 Privacy Promise:\n\nWe strictly fetch and store 'Busy' intervals (Start/End times) only.\n\nWe DO NOT fetch or store:\n- Event Titles (Subjects)\n- Descriptions\n- Attendees\n- Locations\n\nYour details remain on your device/provider.")}
                >
                    <span style={{ fontSize: '1rem' }}>🛡️</span> Data Privacy Mode
                </div>
            </div>
        </div>
    );
}
