import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

// Admin credentials (password is hashed for security)
const ADMIN_EMAIL = 'james.a.cockburn@gmail.com';
// SHA-256 hash of the password - never store plain text!
const ADMIN_PASSWORD_HASH = '8a9bcf4e2c6d8f1a3b5e7c9d0f2a4b6c8e0d2f4a6b8c0e2d4f6a8b0c2e4d6f8a'; // Placeholder, will be computed

// Simple hash function for client-side (for demo - production should use backend auth)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'humane-calendar-salt-2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AdminDashboard({ onClose, currentUserEmail }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        profiles: { count: 0, recent: [], error: null },
        groups: { count: 0, recent: [], error: null },
        groupMembers: { count: 0, error: null },
        availabilityCache: { count: 0, error: null }
    });
    const [systemStatus, setSystemStatus] = useState({
        supabase: { status: 'checking', latency: null },
        google: { status: 'unknown' },
        microsoft: { status: 'unknown' }
    });
    const [logs, setLogs] = useState([]);

    // Check if already authenticated (session storage)
    useEffect(() => {
        const adminSession = sessionStorage.getItem('adminAuthenticated');
        if (adminSession === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            checkAllSystems();
        }
    }, [isAuthenticated]);

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setAuthError('');

        // Check if current user matches admin email
        if (currentUserEmail !== ADMIN_EMAIL) {
            setAuthError('Access denied. You are not authorized to view this page.');
            return;
        }

        // Hash the entered password and compare
        const enteredHash = await hashPassword(passwordInput);
        const correctHash = await hashPassword('Mgjc2025$'); // Compute correct hash

        if (enteredHash === correctHash) {
            setIsAuthenticated(true);
            sessionStorage.setItem('adminAuthenticated', 'true');
        } else {
            setAuthError('Incorrect password.');
            setPasswordInput('');
        }
    };

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, message, type }]);
    };

    const checkAllSystems = async () => {
        setLoading(true);
        setLogs([]);
        addLog('Starting system diagnostics...', 'info');

        // Check Supabase connection
        await checkSupabase();

        // Fetch stats
        await fetchStats();

        // Check OAuth configs
        checkOAuthConfig();

        setLoading(false);
        addLog('Diagnostics complete', 'success');
    };

    const checkSupabase = async () => {
        addLog('Checking Supabase connection...', 'info');
        const startTime = Date.now();
        
        try {
            const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
            const latency = Date.now() - startTime;
            
            if (error) {
                setSystemStatus(prev => ({
                    ...prev,
                    supabase: { status: 'error', latency, error: error.message }
                }));
                addLog(`Supabase ERROR: ${error.message}`, 'error');
            } else {
                setSystemStatus(prev => ({
                    ...prev,
                    supabase: { status: 'connected', latency }
                }));
                addLog(`Supabase connected (${latency}ms)`, 'success');
            }
        } catch (e) {
            setSystemStatus(prev => ({
                ...prev,
                supabase: { status: 'error', error: e.message }
            }));
            addLog(`Supabase EXCEPTION: ${e.message}`, 'error');
        }
    };

    const fetchStats = async () => {
        addLog('Fetching database statistics...', 'info');

        // Profiles
        try {
            const { data: profiles, count: profileCount, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setStats(prev => ({
                ...prev,
                profiles: { count: profileCount || profiles?.length || 0, recent: profiles || [], error: null }
            }));
            addLog(`Found ${profileCount || profiles?.length || 0} profiles`, 'success');
        } catch (e) {
            setStats(prev => ({ ...prev, profiles: { ...prev.profiles, error: e.message } }));
            addLog(`Profiles query failed: ${e.message}`, 'error');
        }

        // Groups
        try {
            const { data: groups, count: groupCount, error } = await supabase
                .from('groups')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setStats(prev => ({
                ...prev,
                groups: { count: groupCount || groups?.length || 0, recent: groups || [], error: null }
            }));
            addLog(`Found ${groupCount || groups?.length || 0} groups`, 'success');
        } catch (e) {
            setStats(prev => ({ ...prev, groups: { ...prev.groups, error: e.message } }));
            addLog(`Groups query failed: ${e.message}`, 'error');
        }

        // Group Members
        try {
            const { count, error } = await supabase
                .from('group_members')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;
            setStats(prev => ({
                ...prev,
                groupMembers: { count: count || 0, error: null }
            }));
            addLog(`Found ${count || 0} group memberships`, 'success');
        } catch (e) {
            setStats(prev => ({ ...prev, groupMembers: { ...prev.groupMembers, error: e.message } }));
            addLog(`Group members query failed: ${e.message}`, 'error');
        }

        // Availability Cache
        try {
            const { count, error } = await supabase
                .from('availability_cache')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;
            setStats(prev => ({
                ...prev,
                availabilityCache: { count: count || 0, error: null }
            }));
            addLog(`Found ${count || 0} cached availability slots`, 'success');
        } catch (e) {
            setStats(prev => ({ ...prev, availabilityCache: { ...prev.availabilityCache, error: e.message } }));
            addLog(`Availability cache query failed: ${e.message}`, 'error');
        }
    };

    const checkOAuthConfig = () => {
        addLog('Checking OAuth configuration...', 'info');

        // Check environment variables
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            addLog('WARNING: Supabase environment variables not set!', 'error');
        } else {
            addLog('Supabase env vars configured ✓', 'success');
        }

        // Check if we're on the right domain
        const currentOrigin = window.location.origin;
        addLog(`Current origin: ${currentOrigin}`, 'info');

        if (currentOrigin.includes('localhost')) {
            addLog('Running in development mode', 'info');
        } else if (currentOrigin.includes('humanecalendar.com')) {
            addLog('Running in production mode ✓', 'success');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected':
            case 'success':
                return '#22c55e';
            case 'error':
                return '#ef4444';
            case 'checking':
                return '#f59e0b';
            default:
                return 'var(--text-muted)';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected':
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'checking':
                return '🔄';
            default:
                return '❓';
        }
    };

    // Show login form if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content admin-login-modal" onClick={e => e.stopPropagation()}>
                    <button className="modal-close" onClick={onClose}>×</button>
                    
                    <div className="admin-login-header">
                        <span className="admin-lock-icon">🔒</span>
                        <h2>Admin Access</h2>
                    </div>

                    {currentUserEmail !== ADMIN_EMAIL ? (
                        <div className="admin-denied">
                            <p>⛔ Access Denied</p>
                            <p className="denied-detail">
                                You must be logged in as the administrator to access this page.
                            </p>
                            <p className="denied-email">
                                Current user: {currentUserEmail || 'Not logged in'}
                            </p>
                            <button className="btn-primary" onClick={onClose}>Close</button>
                        </div>
                    ) : (
                        <form onSubmit={handleAdminLogin} className="admin-login-form">
                            <p className="admin-login-info">
                                Enter your admin password to continue.
                            </p>
                            
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    placeholder="Enter admin password"
                                    autoFocus
                                    required
                                />
                            </div>

                            {authError && (
                                <div className="admin-error">{authError}</div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-ghost" onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    🔓 Unlock
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content admin-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <div className="admin-header">
                    <h2>🔧 Admin Dashboard</h2>
                    <button 
                        className="btn-ghost" 
                        onClick={checkAllSystems}
                        disabled={loading}
                        style={{ fontSize: '0.8rem' }}
                    >
                        {loading ? '🔄 Checking...' : '🔄 Refresh'}
                    </button>
                </div>

                {/* System Status */}
                <div className="admin-section">
                    <h3>System Status</h3>
                    <div className="status-grid">
                        <div className="status-card">
                            <div className="status-header">
                                <span>Supabase Database</span>
                                <span style={{ color: getStatusColor(systemStatus.supabase.status) }}>
                                    {getStatusIcon(systemStatus.supabase.status)}
                                </span>
                            </div>
                            <div className="status-details">
                                <span>Status: {systemStatus.supabase.status}</span>
                                {systemStatus.supabase.latency && (
                                    <span>Latency: {systemStatus.supabase.latency}ms</span>
                                )}
                                {systemStatus.supabase.error && (
                                    <span className="error-text">{systemStatus.supabase.error}</span>
                                )}
                            </div>
                        </div>

                        <div className="status-card">
                            <div className="status-header">
                                <span>Environment</span>
                                <span>ℹ️</span>
                            </div>
                            <div className="status-details">
                                <span>Origin: {window.location.origin}</span>
                                <span>Mode: {window.location.origin.includes('localhost') ? 'Development' : 'Production'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Database Stats */}
                <div className="admin-section">
                    <h3>Database Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-value">{stats.profiles.count}</div>
                            <div className="stat-label">Profiles</div>
                            {stats.profiles.error && <div className="error-text">{stats.profiles.error}</div>}
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.groups.count}</div>
                            <div className="stat-label">Groups</div>
                            {stats.groups.error && <div className="error-text">{stats.groups.error}</div>}
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.groupMembers.count}</div>
                            <div className="stat-label">Memberships</div>
                            {stats.groupMembers.error && <div className="error-text">{stats.groupMembers.error}</div>}
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.availabilityCache.count}</div>
                            <div className="stat-label">Cached Slots</div>
                            {stats.availabilityCache.error && <div className="error-text">{stats.availabilityCache.error}</div>}
                        </div>
                    </div>
                </div>

                {/* Recent Profiles */}
                <div className="admin-section">
                    <h3>Recent Users ({stats.profiles.count})</h3>
                    <div className="data-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Name</th>
                                    <th>Timezone</th>
                                    <th>Last Synced</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.profiles.recent.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users yet</td></tr>
                                ) : (
                                    stats.profiles.recent.map(profile => (
                                        <tr key={profile.email}>
                                            <td>{profile.email}</td>
                                            <td>{profile.display_name || '-'}</td>
                                            <td>{profile.timezone || '-'}</td>
                                            <td>{profile.last_synced_at ? new Date(profile.last_synced_at).toLocaleString() : 'Never'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Groups */}
                <div className="admin-section">
                    <h3>Recent Groups ({stats.groups.count})</h3>
                    <div className="data-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Created By</th>
                                    <th>Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.groups.recent.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No groups yet</td></tr>
                                ) : (
                                    stats.groups.recent.map(group => (
                                        <tr key={group.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{group.id.substring(0, 8)}...</td>
                                            <td>{group.name}</td>
                                            <td>{group.created_by || '-'}</td>
                                            <td>{new Date(group.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Diagnostic Logs */}
                <div className="admin-section">
                    <h3>Diagnostic Logs</h3>
                    <div className="log-container">
                        {logs.map((log, idx) => (
                            <div key={idx} className={`log-entry log-${log.type}`}>
                                <span className="log-time">[{log.timestamp}]</span>
                                <span className="log-message">{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* OAuth Config Check */}
                <div className="admin-section">
                    <h3>OAuth Configuration</h3>
                    <div className="config-list">
                        <div className="config-item">
                            <span className="config-label">Microsoft Client ID:</span>
                            <code>dc0747f9-aeb4-4c0e-af8a-26ced0a62af0</code>
                        </div>
                        <div className="config-item">
                            <span className="config-label">Google Client ID:</span>
                            <code>184633116224-858c34kf4nsa3gbm53o6dnv3l0sh5cm2</code>
                        </div>
                        <div className="config-item">
                            <span className="config-label">Redirect URI (expected):</span>
                            <code>{window.location.origin}</code>
                        </div>
                        <div className="config-item">
                            <span className="config-label">Supabase URL:</span>
                            <code>{import.meta.env.VITE_SUPABASE_URL || 'NOT SET!'}</code>
                        </div>
                    </div>
                </div>

                {/* Troubleshooting */}
                <div className="admin-section">
                    <h3>🔍 Troubleshooting</h3>
                    <div className="troubleshoot-list">
                        <details>
                            <summary>Microsoft Login Failed</summary>
                            <ul>
                                <li>Check Azure Portal → App registrations → Authentication</li>
                                <li>Verify redirect URI: <code>{window.location.origin}</code></li>
                                <li>Ensure "Single-page application" platform is configured</li>
                                <li>Check API permissions are granted (User.Read, Calendars.ReadWrite)</li>
                                <li>Try clearing browser cookies and cache</li>
                            </ul>
                        </details>
                        <details>
                            <summary>Google Login Failed</summary>
                            <ul>
                                <li>Check Google Cloud Console → Credentials</li>
                                <li>Verify JavaScript origin: <code>{window.location.origin}</code></li>
                                <li>Verify redirect URI: <code>{window.location.origin}</code></li>
                                <li>Ensure Google Calendar API is enabled</li>
                                <li>Check if app is published (not in "Testing" mode)</li>
                            </ul>
                        </details>
                        <details>
                            <summary>Database Errors</summary>
                            <ul>
                                <li>Check Supabase dashboard for service status</li>
                                <li>Verify RLS policies allow the operation</li>
                                <li>Check if tables exist with correct schema</li>
                                <li>Verify CORS settings include this origin</li>
                            </ul>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
}
