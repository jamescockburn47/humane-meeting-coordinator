import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { findCommonHumaneSlots } from '../services/scheduler';

// SECURITY: Admin access is restricted by email only - no password needed
// The UI button and keyboard shortcut are also email-gated
const ADMIN_EMAIL = 'james.a.cockburn@gmail.com';

export function AdminDashboard({ onClose, currentUserEmail }) {
    // SECURITY: Only allow access for site owner
    const isAdmin = currentUserEmail === ADMIN_EMAIL;
    
    // If not admin, show access denied and close
    if (!isAdmin) {
        return (
            <div className="admin-modal-overlay" onClick={onClose}>
                <div className="admin-modal" onClick={e => e.stopPropagation()}>
                    <div className="admin-header">
                        <h2>Access Denied</h2>
                        <button className="admin-close" onClick={onClose}>×</button>
                    </div>
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Admin dashboard is restricted to the site owner.
                        </p>
                        <button className="btn-primary" onClick={onClose} style={{ marginTop: '1rem' }}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        profiles: { count: 0, recent: [], error: null },
        groups: { count: 0, recent: [], error: null },
        groupMembers: { count: 0, error: null },
        availabilityCache: { count: 0, error: null }
    });
    const [betaStats, setBetaStats] = useState({
        google: { count: 0, approved: 0, pending: 0, users: [] },
        microsoft: { count: 0, approved: 0, pending: 0, users: [] },
        guest: { count: 0, approved: 0, pending: 0, users: [] }
    });
    const [pendingUsers, setPendingUsers] = useState([]);
    const [approvalLoading, setApprovalLoading] = useState({});
    const [exportLoading, setExportLoading] = useState(false);
    const GOOGLE_LIMIT = 50;
    const MICROSOFT_LIMIT = 50;
    const [systemStatus, setSystemStatus] = useState({
        supabase: { status: 'checking', latency: null },
        google: { status: 'unknown' },
        microsoft: { status: 'unknown' }
    });
    const [logs, setLogs] = useState([]);
    const [testResults, setTestResults] = useState(null);
    const [testRunning, setTestRunning] = useState(false);
    const [userActivity, setUserActivity] = useState([]);

    // Auto-load dashboard data since email is already verified
    useEffect(() => {
        checkAllSystems();
    }, []);

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, message, type }]);
    };

    // Scheduler Test Runner
    const runSchedulerTests = () => {
        setTestRunning(true);
        const results = [];
        
        const test = (name, fn) => {
            try {
                fn();
                results.push({ name, passed: true });
            } catch (e) {
                results.push({ name, passed: false, error: e.message });
            }
        };

        // Test 1: Same timezone, same windows
        test('Same timezone, same windows → should find slots', () => {
            const members = [
                { email: 'a@test.com', timezone: 'Europe/London', humane_windows: [{ start: '09:00', end: '17:00', type: 'weekday' }] },
                { email: 'b@test.com', timezone: 'Europe/London', humane_windows: [{ start: '09:00', end: '17:00', type: 'weekday' }] }
            ];
            const slots = findCommonHumaneSlots(members, [], '2025-01-06', '2025-01-06', 60);
            if (slots.length === 0) throw new Error('Expected slots but found none');
        });

        // Test 2: Non-overlapping windows
        test('Non-overlapping windows → should find no slots', () => {
            const members = [
                { email: 'a@test.com', timezone: 'Europe/London', humane_windows: [{ start: '09:00', end: '12:00', type: 'weekday' }] },
                { email: 'b@test.com', timezone: 'Europe/London', humane_windows: [{ start: '14:00', end: '17:00', type: 'weekday' }] }
            ];
            const slots = findCommonHumaneSlots(members, [], '2025-01-06', '2025-01-06', 60);
            if (slots.length > 0) throw new Error(`Expected 0 slots but found ${slots.length}`);
        });

        // Test 3: Narrow 8-9am window
        test('Narrow 8-9am window → only slots within window', () => {
            const members = [
                { email: 'a@test.com', timezone: 'UTC', humane_windows: [{ start: '08:00', end: '09:00', type: 'weekday' }] }
            ];
            const slots = findCommonHumaneSlots(members, [], '2025-01-06', '2025-01-06', 60);
            if (slots.length > 1) throw new Error(`Expected max 1 slot but found ${slots.length}`);
        });

        // Test 4: Weekend vs weekday windows
        test('Weekday window on Saturday → no slots', () => {
            const members = [
                { email: 'a@test.com', timezone: 'Europe/London', humane_windows: [{ start: '09:00', end: '17:00', type: 'weekday' }] }
            ];
            const slots = findCommonHumaneSlots(members, [], '2025-01-04', '2025-01-04', 60); // Saturday
            if (slots.length > 0) throw new Error(`Expected 0 slots on weekend but found ${slots.length}`);
        });

        // Test 5: Busy slots block times
        test('Busy slots should block valid times', () => {
            const members = [
                { email: 'a@test.com', timezone: 'UTC', humane_windows: [{ start: '09:00', end: '11:00', type: 'weekday' }] }
            ];
            const busy = [{ profile_email: 'a@test.com', start_time: '2025-01-06T09:00:00Z', end_time: '2025-01-06T10:00:00Z' }];
            const slots = findCommonHumaneSlots(members, busy, '2025-01-06', '2025-01-06', 60);
            const blocked = slots.filter(s => new Date(s.start).getUTCHours() === 9);
            if (blocked.length > 0) throw new Error('9:00 slot should be blocked by busy time');
        });

        // Test 6: No 23:30 slots for 9-17 window
        test('23:30 should NOT appear for 9-17 window', () => {
            const members = [
                { email: 'a@test.com', timezone: 'Europe/London', humane_windows: [{ start: '09:00', end: '17:00', type: 'weekday' }] }
            ];
            const slots = findCommonHumaneSlots(members, [], '2025-01-06', '2025-01-06', 60);
            const lateSlots = slots.filter(s => {
                const h = new Date(s.start).getUTCHours();
                return h >= 17 || h < 9;
            });
            if (lateSlots.length > 0) throw new Error(`Found ${lateSlots.length} slots outside 9-17 range`);
        });

        // Test 7: Null windows fallback
        test('Null/empty windows → should use defaults', () => {
            const members = [
                { email: 'a@test.com', timezone: 'Europe/London', humane_windows: null, humane_start_local: '09:00', humane_end_local: '17:00' }
            ];
            const slots = findCommonHumaneSlots(members, [], '2025-01-06', '2025-01-06', 60);
            if (slots.length === 0) throw new Error('Should fall back to legacy and find slots');
        });

        setTestResults(results);
        setTestRunning(false);
    };

    const checkAllSystems = async () => {
        setLoading(true);
        setLogs([]);
        addLog('Starting system diagnostics...', 'info');

        // Check Supabase connection
        await checkSupabase();

        // Fetch stats
        await fetchStats();

        // Fetch beta tester stats
        await fetchBetaStats();

        // Fetch user activity
        await fetchUserActivity();

        // Check OAuth configs
        checkOAuthConfig();

        setLoading(false);
        addLog('Diagnostics complete', 'success');
    };

    // Fetch beta tester breakdown by provider
    const fetchBetaStats = async () => {
        addLog('Fetching beta tester statistics...', 'info');
        
        try {
            // Get all profiles with their info including approval status and requested provider
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('email, display_name, timezone, created_at, is_approved, approved_at, approved_by, requested_provider')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Categorize by provider - use requested_provider if set, otherwise infer from email
            const googleUsers = [];
            const microsoftUsers = [];
            const guestUsers = [];
            const pending = [];

            profiles.forEach(p => {
                const email = p.email?.toLowerCase() || '';
                
                // Use explicitly requested provider first, then fall back to email inference
                let provider = p.requested_provider;
                if (!provider) {
                    const isGoogle = email.includes('@gmail.com') || email.includes('@googlemail.com');
                    const isMicrosoft = email.includes('@outlook.') || email.includes('@hotmail.') || 
                                        email.includes('@live.') || email.includes('@msn.');
                    provider = isGoogle ? 'google' : isMicrosoft ? 'microsoft' : 'other';
                }
                
                const userData = { ...p, provider };
                
                if (provider === 'google') {
                    googleUsers.push(userData);
                } else if (provider === 'microsoft') {
                    microsoftUsers.push(userData);
                } else {
                    guestUsers.push(userData);
                }
                
                // Track pending users separately
                if (p.is_approved === null) {
                    pending.push(userData);
                }
            });

            setBetaStats({
                google: { 
                    count: googleUsers.length, 
                    approved: googleUsers.filter(u => u.is_approved === true).length,
                    pending: googleUsers.filter(u => u.is_approved === null).length,
                    users: googleUsers 
                },
                microsoft: { 
                    count: microsoftUsers.length, 
                    approved: microsoftUsers.filter(u => u.is_approved === true).length,
                    pending: microsoftUsers.filter(u => u.is_approved === null).length,
                    users: microsoftUsers 
                },
                guest: { 
                    count: guestUsers.length, 
                    approved: guestUsers.filter(u => u.is_approved === true).length,
                    pending: guestUsers.filter(u => u.is_approved === null).length,
                    users: guestUsers 
                }
            });
            
            setPendingUsers(pending);

            addLog(`Beta breakdown: ${googleUsers.filter(u => u.is_approved).length}/${GOOGLE_LIMIT} Google, ${microsoftUsers.filter(u => u.is_approved).length}/${MICROSOFT_LIMIT} Microsoft, ${pending.length} pending`, 'success');
        } catch (e) {
            addLog(`Beta stats failed: ${e.message}`, 'error');
        }
    };

    // Fetch user activity summary (what users have done, without exposing private data)
    const fetchUserActivity = async () => {
        addLog('Fetching user activity...', 'info');
        
        try {
            // Get all approved users with their activity metrics
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('email, display_name, created_at, last_synced_at, is_approved, requested_provider')
                .eq('is_approved', true)
                .order('last_synced_at', { ascending: false, nullsFirst: false });

            if (profileError) throw profileError;

            // Get group counts per user
            const { data: groupMemberships, error: memberError } = await supabase
                .from('group_members')
                .select('profile_email, group_id');

            if (memberError) throw memberError;

            // Get groups created by each user
            const { data: groupsCreated, error: groupError } = await supabase
                .from('groups')
                .select('created_by, id');

            if (groupError) throw groupError;

            // Get booked meetings per user
            const { data: meetings, error: meetingError } = await supabase
                .from('booked_meetings')
                .select('organizer_email, id');

            // Build activity summary for each user
            const activityData = (profiles || []).map(profile => {
                const groupsJoined = (groupMemberships || []).filter(m => m.profile_email === profile.email).length;
                const groupsOwned = (groupsCreated || []).filter(g => g.created_by === profile.email).length;
                const meetingsBooked = (meetings || []).filter(m => m.organizer_email === profile.email).length;
                
                // Calculate days since last active
                const lastActive = profile.last_synced_at ? new Date(profile.last_synced_at) : new Date(profile.created_at);
                const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
                
                return {
                    email: profile.email,
                    name: profile.display_name || profile.email.split('@')[0],
                    provider: profile.requested_provider || 'unknown',
                    signedUp: profile.created_at,
                    lastActive: profile.last_synced_at || profile.created_at,
                    daysSinceActive,
                    groupsJoined,
                    groupsOwned,
                    meetingsBooked,
                    isActive: daysSinceActive <= 7
                };
            });

            setUserActivity(activityData);
            addLog(`Loaded activity for ${activityData.length} approved users`, 'success');
        } catch (e) {
            addLog(`User activity fetch failed: ${e.message}`, 'error');
        }
    };

    // Approve a user
    const handleApprove = async (email, userProvider = null) => {
        setApprovalLoading(prev => ({ ...prev, [email]: 'approving' }));
        try {
            // Use the provider from the user object, or fall back to email inference
            let isGoogle = userProvider === 'google';
            let isMicrosoft = userProvider === 'microsoft';
            
            // If no provider specified, infer from email
            if (!userProvider) {
                isGoogle = email.toLowerCase().includes('@gmail.com') || email.toLowerCase().includes('@googlemail.com');
                isMicrosoft = email.toLowerCase().includes('@outlook.') || email.toLowerCase().includes('@hotmail.') || 
                                    email.toLowerCase().includes('@live.') || email.toLowerCase().includes('@msn.');
            }
            
            if (isGoogle && betaStats.google.approved >= GOOGLE_LIMIT) {
                alert(`Cannot approve: Google user limit (${GOOGLE_LIMIT}) reached.`);
                setApprovalLoading(prev => ({ ...prev, [email]: null }));
                return;
            }
            if (isMicrosoft && betaStats.microsoft.approved >= MICROSOFT_LIMIT) {
                alert(`Cannot approve: Microsoft user limit (${MICROSOFT_LIMIT}) reached.`);
                setApprovalLoading(prev => ({ ...prev, [email]: null }));
                return;
            }
            
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_approved: true, 
                    approved_at: new Date().toISOString(),
                    approved_by: currentUserEmail
                })
                .eq('email', email);

            if (error) throw error;

            addLog(`✅ Approved: ${email}`, 'success');
            await fetchBetaStats(); // Refresh stats
        } catch (e) {
            addLog(`Failed to approve ${email}: ${e.message}`, 'error');
            alert('Approval failed: ' + e.message);
        } finally {
            setApprovalLoading(prev => ({ ...prev, [email]: null }));
        }
    };

    // Reject a user
    const handleReject = async (email) => {
        setApprovalLoading(prev => ({ ...prev, [email]: 'rejecting' }));
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_approved: false, 
                    approved_at: new Date().toISOString(),
                    approved_by: currentUserEmail
                })
                .eq('email', email);

            if (error) throw error;

            addLog(`❌ Rejected: ${email}`, 'info');
            await fetchBetaStats(); // Refresh stats
        } catch (e) {
            addLog(`Failed to reject ${email}: ${e.message}`, 'error');
            alert('Rejection failed: ' + e.message);
        } finally {
            setApprovalLoading(prev => ({ ...prev, [email]: null }));
        }
    };

    // Bulk approve all pending
    const handleBulkApprove = async () => {
        const confirmed = confirm(`Approve all ${pendingUsers.length} pending users? This will check limits.`);
        if (!confirmed) return;
        
        let approved = 0;
        let skipped = 0;
        
        for (const user of pendingUsers) {
            const isGoogle = user.provider === 'google';
            const isMicrosoft = user.provider === 'microsoft';
            
            // Check limits
            if (isGoogle && (betaStats.google.approved + approved) >= GOOGLE_LIMIT) {
                skipped++;
                continue;
            }
            if (isMicrosoft && (betaStats.microsoft.approved + approved) >= MICROSOFT_LIMIT) {
                skipped++;
                continue;
            }
            
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_approved: true, 
                    approved_at: new Date().toISOString(),
                    approved_by: currentUserEmail
                })
                .eq('email', user.email);

            if (!error) approved++;
        }
        
        addLog(`Bulk approved: ${approved} users, ${skipped} skipped (limit reached)`, 'success');
        await fetchBetaStats();
    };

    // Export beta testers to CSV
    const exportBetaTesters = async () => {
        setExportLoading(true);
        addLog('Exporting beta testers...', 'info');
        
        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('email, display_name, timezone, created_at')
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Create CSV content
            const headers = ['Email', 'Name', 'Timezone', 'Sign-up Date', 'Provider (Inferred)'];
            const rows = profiles.map(p => {
                const email = p.email?.toLowerCase() || '';
                let provider = 'Other/Guest';
                if (email.includes('@gmail.com') || email.includes('@googlemail.com')) {
                    provider = 'Google';
                } else if (email.includes('@outlook.') || email.includes('@hotmail.') || 
                           email.includes('@live.') || email.includes('@msn.')) {
                    provider = 'Microsoft';
                }
                return [
                    p.email,
                    p.display_name || '',
                    p.timezone || '',
                    p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '',
                    provider
                ].map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',');
            });

            const csv = [headers.join(','), ...rows].join('\n');
            
            // Download as file
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `humane-calendar-beta-testers-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            
            addLog(`Exported ${profiles.length} users to CSV`, 'success');
        } catch (e) {
            addLog(`Export failed: ${e.message}`, 'error');
            alert('Export failed: ' + e.message);
        } finally {
            setExportLoading(false);
        }
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
            addLog('Supabase env vars configured', 'success');
        }

        // Check if we're on the right domain
        const currentOrigin = window.location.origin;
        addLog(`Current origin: ${currentOrigin}`, 'info');

        if (currentOrigin.includes('localhost')) {
            addLog('Running in development mode', 'info');
        } else if (currentOrigin.includes('humanecalendar.com')) {
            addLog('Running in production mode', 'success');
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

    // Email already verified at component start - show dashboard directly
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
                                <span></span>
                            </div>
                            <div className="status-details">
                                <span>Origin: {window.location.origin}</span>
                                <span>Mode: {window.location.origin.includes('localhost') ? 'Development' : 'Production'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BETA TESTER MANAGEMENT */}
                <div className="admin-section beta-section">
                    <div className="section-header-row">
                        <h3>🧪 Beta Tester Management</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {pendingUsers.length > 0 && (
                                <button 
                                    className="btn-ghost" 
                                    onClick={handleBulkApprove}
                                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                                >
                                    ✅ Approve All ({pendingUsers.length})
                                </button>
                            )}
                            <button 
                                className="btn-primary" 
                                onClick={exportBetaTesters}
                                disabled={exportLoading}
                                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                            >
                                {exportLoading ? '📥 Exporting...' : '📥 Export CSV'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="beta-limits">
                        <div className="beta-limit-card google">
                            <div className="limit-header">
                                <span className="provider-icon">🔵</span>
                                <span>Google Users</span>
                            </div>
                            <div className="limit-count">
                                <span className={`count ${betaStats.google.approved >= GOOGLE_LIMIT ? 'at-limit' : ''}`}>
                                    {betaStats.google.approved}
                                </span>
                                <span className="limit">/ {GOOGLE_LIMIT}</span>
                                {betaStats.google.pending > 0 && (
                                    <span className="pending-badge">+{betaStats.google.pending} pending</span>
                                )}
                            </div>
                            <div className="limit-bar">
                                <div 
                                    className="limit-fill google" 
                                    style={{ width: `${Math.min(100, (betaStats.google.approved / GOOGLE_LIMIT) * 100)}%` }}
                                />
                            </div>
                            {betaStats.google.approved >= GOOGLE_LIMIT && (
                                <div className="limit-warning">⚠️ Limit reached!</div>
                            )}
                        </div>

                        <div className="beta-limit-card microsoft">
                            <div className="limit-header">
                                <span className="provider-icon">🟢</span>
                                <span>Microsoft Users</span>
                            </div>
                            <div className="limit-count">
                                <span className={`count ${betaStats.microsoft.approved >= MICROSOFT_LIMIT ? 'at-limit' : ''}`}>
                                    {betaStats.microsoft.approved}
                                </span>
                                <span className="limit">/ {MICROSOFT_LIMIT}</span>
                                {betaStats.microsoft.pending > 0 && (
                                    <span className="pending-badge">+{betaStats.microsoft.pending} pending</span>
                                )}
                            </div>
                            <div className="limit-bar">
                                <div 
                                    className="limit-fill microsoft" 
                                    style={{ width: `${Math.min(100, (betaStats.microsoft.approved / MICROSOFT_LIMIT) * 100)}%` }}
                                />
                            </div>
                            {betaStats.microsoft.approved >= MICROSOFT_LIMIT && (
                                <div className="limit-warning">⚠️ Limit reached!</div>
                            )}
                        </div>

                        <div className="beta-limit-card other">
                            <div className="limit-header">
                                <span className="provider-icon">⚪</span>
                                <span>Other/Guests</span>
                            </div>
                            <div className="limit-count">
                                <span className="count">{betaStats.guest.approved}</span>
                                <span className="limit">/ ∞</span>
                                {betaStats.guest.pending > 0 && (
                                    <span className="pending-badge">+{betaStats.guest.pending} pending</span>
                                )}
                            </div>
                            <div className="limit-bar">
                                <div 
                                    className="limit-fill other" 
                                    style={{ width: '0%' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* PENDING APPROVALS QUEUE */}
                    {pendingUsers.length > 0 && (
                        <div className="pending-approvals-section">
                            <h4>⏳ Pending Approvals ({pendingUsers.length})</h4>
                            <div className="data-table-container" style={{ marginTop: '0.5rem' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Name</th>
                                            <th>Provider</th>
                                            <th>Signed Up</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingUsers.map(u => (
                                            <tr key={u.email}>
                                                <td>{u.email}</td>
                                                <td>{u.display_name || '-'}</td>
                                                <td>
                                                    {u.provider === 'google' ? '🔵 Google' :
                                                     u.provider === 'microsoft' ? '🟢 Microsoft' :
                                                     '⚪ Other'}
                                                </td>
                                                <td>{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button
                                                            onClick={() => handleApprove(u.email, u.provider)}
                                                            disabled={approvalLoading[u.email]}
                                                            className="btn-approve"
                                                            title="Approve"
                                                        >
                                                            {approvalLoading[u.email] === 'approving' ? '...' : '✓'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(u.email)}
                                                            disabled={approvalLoading[u.email]}
                                                            className="btn-reject"
                                                            title="Reject"
                                                        >
                                                            {approvalLoading[u.email] === 'rejecting' ? '...' : '✗'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <details className="beta-user-list">
                        <summary>View All Users ({stats.profiles.count})</summary>
                        <div className="data-table-container" style={{ marginTop: '1rem' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Name</th>
                                        <th>Provider</th>
                                        <th>Status</th>
                                        <th>Sign-up</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...betaStats.google.users, ...betaStats.microsoft.users, ...betaStats.guest.users].map(u => (
                                        <tr key={u.email} className={u.is_approved === false ? 'rejected-row' : ''}>
                                            <td>{u.email}</td>
                                            <td>{u.display_name || '-'}</td>
                                            <td>
                                                {u.provider === 'google' ? '🔵 Google' :
                                                 u.provider === 'microsoft' ? '🟢 Microsoft' :
                                                 '⚪ Other'}
                                            </td>
                                            <td>
                                                {u.is_approved === true ? (
                                                    <span className="status-approved">✅ Approved</span>
                                                ) : u.is_approved === false ? (
                                                    <span className="status-rejected">❌ Rejected</span>
                                                ) : (
                                                    <span className="status-pending">⏳ Pending</span>
                                                )}
                                            </td>
                                            <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </details>
                </div>

                {/* USER ACTIVITY MONITORING */}
                {userActivity.length > 0 && (
                    <div className="admin-section">
                        <div className="section-header-row">
                            <h3>📊 User Activity (Approved Users)</h3>
                            <div className="activity-summary">
                                <span className="activity-stat active">{userActivity.filter(u => u.isActive).length} active this week</span>
                                <span className="activity-stat">{userActivity.filter(u => u.meetingsBooked > 0).length} booked meetings</span>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Shows what approved users have done — no private calendar/availability details exposed.
                        </p>
                        <div className="data-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Provider</th>
                                        <th>Groups Joined</th>
                                        <th>Groups Created</th>
                                        <th>Meetings Booked</th>
                                        <th>Last Active</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userActivity.map(u => (
                                        <tr key={u.email}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{u.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                            </td>
                                            <td>
                                                {u.provider === 'google' ? '🔵' : u.provider === 'microsoft' ? '🟢' : '⚪'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{u.groupsJoined}</td>
                                            <td style={{ textAlign: 'center' }}>{u.groupsOwned}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {u.meetingsBooked > 0 ? (
                                                    <span style={{ color: '#22c55e', fontWeight: 600 }}>{u.meetingsBooked}</span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>0</span>
                                                )}
                                            </td>
                                            <td>
                                                {u.daysSinceActive === 0 ? 'Today' : 
                                                 u.daysSinceActive === 1 ? 'Yesterday' :
                                                 `${u.daysSinceActive} days ago`}
                                            </td>
                                            <td>
                                                {u.isActive ? (
                                                    <span className="status-approved">Active</span>
                                                ) : (
                                                    <span className="status-pending">Inactive</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

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

                {/* Scheduler Tests */}
                <div className="admin-section">
                    <h3>🧪 Scheduler Tests</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Run automated tests to verify the time-slot matching algorithm works correctly.
                    </p>
                    <button 
                        className="btn-primary" 
                        onClick={runSchedulerTests}
                        disabled={testRunning}
                        style={{ marginBottom: '1rem' }}
                    >
                        {testRunning ? 'Running...' : '▶ Run Scheduler Tests'}
                    </button>
                    
                    {testResults && (
                        <div className="test-results">
                            <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                                Results: {testResults.filter(t => t.passed).length}/{testResults.length} passed
                            </div>
                            {testResults.map((t, i) => (
                                <div key={i} className={`test-result ${t.passed ? 'passed' : 'failed'}`}>
                                    <span>{t.passed ? '✅' : '❌'}</span>
                                    <span style={{ flex: 1 }}>{t.name}</span>
                                    {t.error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{t.error}</span>}
                                </div>
                            ))}
                        </div>
                    )}
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
