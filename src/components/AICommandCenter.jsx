import { useState, useEffect, useRef } from "react";

/**
 * AI Command Center - Subtle dropdown-based AI assistant
 * Different options for Organiser vs Invitee
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
    const [selectedAction, setSelectedAction] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [customQuery, setCustomQuery] = useState('');
    const [copiedItem, setCopiedItem] = useState(null);
    const selectRef = useRef(null);

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

    // Organiser actions - grouped by category
    const organiserActions = [
        { id: '', label: 'Choose an action...', group: '' },
        { id: 'analyze', label: 'Analyze why we can\'t find a time', group: 'Analysis' },
        { id: 'find_slot', label: 'Find the next available slot', group: 'Analysis' },
        { id: 'who_missing', label: 'Who hasn\'t set availability?', group: 'Members' },
        { id: 'message_all', label: 'Draft message for all members', group: 'Communication' },
        { id: 'check_holidays', label: 'Check for holiday conflicts', group: 'Analysis' },
        { id: 'fair_rotation', label: 'Suggest fair time rotation', group: 'Planning' },
        { id: 'split_group', label: 'Should we split by timezone?', group: 'Planning' },
    ];

    // Invitee actions (simpler)
    const inviteeActions = [
        { id: '', label: 'Choose an action...', group: '' },
        { id: 'summarize', label: 'What\'s the status of this meeting?', group: 'Info' },
        { id: 'analyze', label: 'When would this be in my timezone?', group: 'Info' },
    ];

    const actions = isOrganiser ? organiserActions : inviteeActions;

    // Get status summary
    const getStatusSummary = () => {
        const fullMatches = suggestions.filter(s => s.isFullMatch);
        const membersWithWindows = groupMembers.filter(m => m.humane_windows?.length > 0);
        
        if (groupMembers.length < 2) {
            return { status: 'waiting', message: 'Waiting for members...', color: 'var(--text-muted)' };
        }
        if (membersWithWindows.length < groupMembers.length) {
            const missing = groupMembers.length - membersWithWindows.length;
            return { status: 'incomplete', message: `${missing} pending`, color: '#f59e0b' };
        }
        if (fullMatches.length > 0) {
            return { status: 'ready', message: `${fullMatches.length} slots found`, color: '#10b981' };
        }
        return { status: 'blocked', message: 'No overlap', color: '#ef4444' };
    };

    const status = getStatusSummary();

    const handleActionChange = (e) => {
        const actionId = e.target.value;
        setSelectedAction(actionId);
        if (actionId) {
            executeAction(actionId);
        }
    };

    if (!currentGroup) {
        return null;
    }

    return (
        <div className="ai-command-center-v2">
            <div className="ai-cc-row">
                <div className="ai-cc-label">
                    AI Assistant
                    <span className="ai-cc-status-dot" style={{ background: status.color }} title={status.message}></span>
                </div>
                
                <select 
                    ref={selectRef}
                    className="ai-cc-select"
                    value={selectedAction}
                    onChange={handleActionChange}
                    disabled={loading}
                >
                    {actions.map(action => (
                        <option key={action.id} value={action.id}>
                            {action.label}
                        </option>
                    ))}
                </select>

                <div className="ai-cc-or">or</div>

                <input
                    type="text"
                    className="ai-cc-input"
                    placeholder="Ask anything..."
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && customQuery.trim() && executeAction('custom', customQuery.trim())}
                    disabled={loading}
                />
                
                <button 
                    className="ai-cc-go"
                    onClick={() => customQuery.trim() && executeAction('custom', customQuery.trim())}
                    disabled={loading || !customQuery.trim()}
                >
                    {loading ? '...' : 'Go'}
                </button>
            </div>

            {/* Results Section - Only show when there's content */}
            {(result || loading || error) && (
                <div className="ai-cc-results-v2">
                    {loading && (
                        <div className="ai-loading-inline">
                            <div className="ai-loading-spinner-small"></div>
                            <span>Thinking...</span>
                        </div>
                    )}

                    {error && (
                        <div className="ai-error-inline">
                            {error}
                        </div>
                    )}

                    {result && !loading && (
                        <div className="ai-result-v2">
                            <div className="ai-result-text-v2">
                                {result.text}
                            </div>

                            {/* Copyable content from tool results */}
                            {result.toolResults?.map((tr, i) => (
                                <div key={i} className="ai-result-action">
                                    {tr.tool === 'generate_message' && tr.result?.message && (
                                        <>
                                            <div className="ai-copyable">
                                                <pre>{tr.result.message}</pre>
                                            </div>
                                            <button 
                                                className={`btn-subtle ${copiedItem === `msg-${i}` ? 'copied' : ''}`}
                                                onClick={() => copyToClipboard(tr.result.message, `msg-${i}`)}
                                            >
                                                {copiedItem === `msg-${i}` ? 'Copied' : 'Copy message'}
                                            </button>
                                        </>
                                    )}

                                    {tr.tool === 'send_nudge' && tr.result?.nudges?.length > 0 && (
                                        <div className="ai-nudge-list">
                                            {tr.result.nudges.map((nudge, j) => (
                                                <div key={j} className="ai-nudge-row">
                                                    <span>{nudge.recipientName}</span>
                                                    <button 
                                                        className={`btn-subtle small ${copiedItem === `nudge-${j}` ? 'copied' : ''}`}
                                                        onClick={() => copyToClipboard(nudge.message, `nudge-${j}`)}
                                                    >
                                                        {copiedItem === `nudge-${j}` ? 'Copied' : 'Copy'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {tr.tool === 'find_next_slot' && tr.result?.found && (
                                        <div className="ai-slot-inline">
                                            <span>Best slot: {tr.result.slot?.start}</span>
                                            {onBookMeeting && (
                                                <button className="btn-subtle" onClick={() => onBookMeeting(tr.result.slot)}>
                                                    Book this
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {tr.tool === 'broadcast_message' && tr.result?.copyAllText && (
                                        <button 
                                            className={`btn-subtle ${copiedItem === 'broadcast' ? 'copied' : ''}`}
                                            onClick={() => copyToClipboard(tr.result.copyAllText, 'broadcast')}
                                        >
                                            {copiedItem === 'broadcast' ? 'Copied all' : 'Copy all messages'}
                                        </button>
                                    )}
                                </div>
                            ))}

                            <button 
                                className="ai-clear-btn"
                                onClick={() => { setResult(null); setSelectedAction(''); setCustomQuery(''); }}
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
