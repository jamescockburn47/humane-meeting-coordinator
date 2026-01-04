import React from 'react';

export function Sidebar({ activeView, setView, user, onLogout, syncStatus, onSync, onLoginMS, onLoginGoogle }) {
    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'JV';

    return (
        <div className="sidebar">
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
                            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--text-main)' }}>
                                {user.name}
                            </div>
                            <div
                                style={{ fontSize: '0.8rem', color: syncStatus === 'Synced!' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                                onClick={onSync}
                            >
                                {syncStatus === 'Idle' ? 'Sync Status: Idle' : syncStatus}
                            </div>
                        </div>
                        <button onClick={onLogout} className="btn-ghost" title="Logout" style={{ color: 'var(--text-muted)' }}>
                            Logout
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
                    </div>
                )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <div
                    style={{ fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => alert("🔒 Privacy Promise:\n\nWe strictly fetch and store 'Busy' intervals (Start/End times) only.\n\nWe DO NOT fetch or store:\n- Event Titles (Subjects)\n- Descriptions\n- Attendees\n- Locations\n\nYour details remain on your device/provider.")}
                >
                    <span style={{ fontSize: '1rem' }}>🛡️</span> Data Privacy Mode
                </div>
            </div>
        </div>
    );
}
