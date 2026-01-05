import { useState, useEffect } from "react";

/**
 * AI Command Center - Prominent, action-driven AI assistant
 * Different views for Organiser vs Invitee
 */
export function AICommandCenter({ 
    currentUser = null,
    currentGroup = null, 
    groupMembers = [],
    suggestions = [],
    humaneWindows = [],
    busySlots = [],
    isOrganiser = false,
    onBookMeeting = null
}) {
    const [activeAction, setActiveAction] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [customQuery, setCustomQuery] = useState('');
    const [isExpanded, setIsExpanded] = useState(true);
    const [copiedItem, setCopiedItem] = useState(null);

    // Auto-analyze on load if we have data
    useEffect(() => {
        if (groupMembers.length >= 2 && suggestions.length > 0 && !result) {
            // Auto-run summary on load
            executeAction('summarize');
        }
    }, [groupMembers.length, suggestions.length]);

    const buildContext = () => ({
        user: currentUser ? {
            name: currentUser.name,
            email: currentUser.username,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        } : null,
        group: currentGroup ? {
            id: currentGroup.id,
            name: currentGroup.name,
            memberCount: groupMembers.length,
            invite_code: currentGroup.invite_code
        } : null,
        inviteCode: currentGroup?.invite_code || currentGroup?.id,
        members: groupMembers.map(m => ({
            name: m.display_name || m.email?.split('@')[0],
            email: m.email,
            timezone: m.timezone,
            windows: m.humane_windows
        })),
        busySlots: busySlots.slice(0, 20).map(slot => ({
            start: slot.start?.dateTime || slot.start_time,
            end: slot.end?.dateTime || slot.end_time,
            email: slot.profile_email
        })),
        suggestions: suggestions.slice(0, 10).map(s => ({
            start: s.start,
            end: s.end,
            availableCount: s.availableMembers?.length || 0,
            totalMembers: groupMembers.length,
            isFullMatch: s.isFullMatch,
            unavailable: s.unavailableMembers?.map(m => m.display_name || m.email?.split('@')[0]) || []
        }))
    });

    const executeAction = async (action, customMessage = null) => {
        setActiveAction(action);
        setLoading(true);
        setError(null);

        // Map action to prompt
        const actionPrompts = {
            'summarize': 'Give me a quick summary of this group and our scheduling status.',
            'analyze': 'Analyze why we can\'t find a time that works for everyone. What\'s blocking us?',
            'find_slot': 'Find me the next available time slot that works for everyone.',
            'who_missing': 'Who hasn\'t set their availability yet? Generate nudge messages for them.',
            'message_all': 'Write a message I can send to everyone about our meeting status.',
            'check_holidays': 'Check if any upcoming dates have public holiday conflicts.',
            'fair_rotation': 'Suggest a fair rotation so the same people don\'t always get bad times.',
            'split_group': 'Should we split this group into smaller timezone-based calls?',
            'custom': customMessage
        };

        const prompt = actionPrompts[action] || action;

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    context: buildContext(),
                    role: isOrganiser ? 'organiser' : 'attendee'
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setResult({
                action,
                text: data.response,
                toolResults: data.toolResults || []
            });
        } catch (err) {
            console.error("AI Action error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text, id) => {
        await navigator.clipboard.writeText(text);
        setCopiedItem(id);
        setTimeout(() => setCopiedItem(null), 2000);
    };

    const handleCustomQuery = () => {
        if (customQuery.trim()) {
            executeAction('custom', customQuery.trim());
            setCustomQuery('');
        }
    };

    // Organiser actions
    const organiserActions = [
        { id: 'analyze', icon: '🔍', label: 'Analyze Timezones', description: 'Why can\'t we find a time?' },
        { id: 'find_slot', icon: '📅', label: 'Find Next Slot', description: 'Best available time' },
        { id: 'who_missing', icon: '👥', label: 'Who\'s Missing?', description: 'Send reminders' },
        { id: 'message_all', icon: '📢', label: 'Message All', description: 'Update everyone' },
        { id: 'check_holidays', icon: '🎄', label: 'Check Holidays', description: 'Avoid conflicts' },
        { id: 'fair_rotation', icon: '⚖️', label: 'Fair Rotation', description: 'Recurring meetings' },
        { id: 'split_group', icon: '✂️', label: 'Split Group', description: 'By timezone' },
    ];

    // Invitee actions (simpler)
    const inviteeActions = [
        { id: 'summarize', icon: '📊', label: 'Meeting Status', description: 'What\'s happening?' },
        { id: 'analyze', icon: '🕐', label: 'My Timezone', description: 'When would it be for me?' },
    ];

    const actions = isOrganiser ? organiserActions : inviteeActions;

    // Get status summary
    const getStatusSummary = () => {
        const fullMatches = suggestions.filter(s => s.isFullMatch);
        const membersWithWindows = groupMembers.filter(m => m.humane_windows?.length > 0);
        
        if (groupMembers.length < 2) {
            return { status: 'waiting', message: 'Waiting for more members to join...', color: 'var(--text-muted)' };
        }
        if (membersWithWindows.length < groupMembers.length) {
            const missing = groupMembers.length - membersWithWindows.length;
            return { status: 'incomplete', message: `${missing} member${missing > 1 ? 's' : ''} haven't set availability`, color: '#f59e0b' };
        }
        if (fullMatches.length > 0) {
            return { status: 'ready', message: `${fullMatches.length} time${fullMatches.length > 1 ? 's' : ''} work for everyone!`, color: '#10b981' };
        }
        return { status: 'blocked', message: 'No common times yet', color: '#ef4444' };
    };

    const status = getStatusSummary();

    if (!currentGroup) {
        return null; // Don't show if no group selected
    }

    return (
        <div className={`ai-command-center ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="ai-cc-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="ai-cc-title">
                    <span className="ai-cc-icon">🤖</span>
                    <span>AI Scheduling Assistant</span>
                </div>
                <div className="ai-cc-status" style={{ color: status.color }}>
                    {status.message}
                </div>
                <button className="ai-cc-toggle">
                    {isExpanded ? '−' : '+'}
                </button>
            </div>

            {isExpanded && (
                <div className="ai-cc-body">
                    {/* Quick Actions Grid */}
                    <div className="ai-cc-actions">
                        {actions.map(action => (
                            <button
                                key={action.id}
                                className={`ai-action-btn ${activeAction === action.id ? 'active' : ''} ${loading && activeAction === action.id ? 'loading' : ''}`}
                                onClick={() => executeAction(action.id)}
                                disabled={loading}
                            >
                                <span className="ai-action-icon">{action.icon}</span>
                                <span className="ai-action-label">{action.label}</span>
                                <span className="ai-action-desc">{action.description}</span>
                            </button>
                        ))}
                    </div>

                    {/* Results Section */}
                    {(result || loading || error) && (
                        <div className="ai-cc-results">
                            {loading && (
                                <div className="ai-loading">
                                    <div className="ai-loading-spinner"></div>
                                    <span>Analyzing...</span>
                                </div>
                            )}

                            {error && (
                                <div className="ai-error">
                                    <span>⚠️ {error}</span>
                                </div>
                            )}

                            {result && !loading && (
                                <div className="ai-result">
                                    <div className="ai-result-text">
                                        {result.text.split('\n').map((line, i) => (
                                            <p key={i}>{line || '\u00A0'}</p>
                                        ))}
                                    </div>

                                    {/* Tool Results as Cards */}
                                    {result.toolResults?.map((tr, i) => (
                                        <div key={i} className="ai-tool-card">
                                            {tr.tool === 'generate_message' && tr.result?.message && (
                                                <div className="ai-message-card">
                                                    <div className="ai-message-header">
                                                        Message for {tr.result.recipientName}
                                                    </div>
                                                    <div className="ai-message-body">
                                                        {tr.result.message}
                                                    </div>
                                                    <button 
                                                        className={`ai-copy-btn ${copiedItem === `msg-${i}` ? 'copied' : ''}`}
                                                        onClick={() => copyToClipboard(tr.result.message, `msg-${i}`)}
                                                    >
                                                        {copiedItem === `msg-${i}` ? '✓ Copied!' : '📋 Copy'}
                                                    </button>
                                                </div>
                                            )}

                                            {tr.tool === 'send_nudge' && tr.result?.nudges && (
                                                <div className="ai-nudges">
                                                    <div className="ai-nudges-header">
                                                        📧 {tr.result.nudges.length} reminder{tr.result.nudges.length > 1 ? 's' : ''} ready
                                                    </div>
                                                    {tr.result.nudges.map((nudge, j) => (
                                                        <div key={j} className="ai-nudge-item">
                                                            <span className="ai-nudge-name">{nudge.recipientName}</span>
                                                            <button 
                                                                className={`ai-copy-btn small ${copiedItem === `nudge-${j}` ? 'copied' : ''}`}
                                                                onClick={() => copyToClipboard(nudge.message, `nudge-${j}`)}
                                                            >
                                                                {copiedItem === `nudge-${j}` ? '✓' : '📋'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {tr.tool === 'find_next_slot' && tr.result?.found && (
                                                <div className="ai-slot-card">
                                                    <div className="ai-slot-header">✅ Found a slot!</div>
                                                    <div className="ai-slot-time">{tr.result.slot?.start}</div>
                                                    {onBookMeeting && (
                                                        <button className="ai-book-btn" onClick={() => onBookMeeting(tr.result.slot)}>
                                                            📅 Book This
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {tr.tool === 'broadcast_message' && tr.result?.copyAllText && (
                                                <div className="ai-broadcast-card">
                                                    <div className="ai-broadcast-header">
                                                        📢 Messages for {tr.result.messageCount} members
                                                    </div>
                                                    <button 
                                                        className={`ai-copy-btn ${copiedItem === 'broadcast' ? 'copied' : ''}`}
                                                        onClick={() => copyToClipboard(tr.result.copyAllText, 'broadcast')}
                                                    >
                                                        {copiedItem === 'broadcast' ? '✓ Copied All!' : '📋 Copy All Messages'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Query Input */}
                    <div className="ai-cc-custom">
                        <input
                            type="text"
                            placeholder="Ask something specific..."
                            value={customQuery}
                            onChange={(e) => setCustomQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleCustomQuery()}
                            disabled={loading}
                        />
                        <button onClick={handleCustomQuery} disabled={loading || !customQuery.trim()}>
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
