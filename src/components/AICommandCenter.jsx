import { useState, useRef } from "react";

/**
 * Clean AI Assistant - Minimal, subtle, useful
 * Collapsible input that expands to show results
 */
export function AICommandCenter({ 
    currentUser = null,
    currentGroup = null, 
    groupMembers = [],
    suggestions = [],
    busySlots = [],
    isOrganiser = false,
    onBookMeeting = null
}) {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const inputRef = useRef(null);

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
            isFullMatch: s.isFullMatch,
            availableCount: s.availableMembers?.length || 0,
            totalMembers: groupMembers.length
        }))
    });

    const ask = async (question) => {
        if (!question.trim()) return;
        
        setLoading(true);
        setIsExpanded(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: question }],
                    context: buildContext(),
                    role: isOrganiser ? 'organiser' : 'attendee'
                }),
            });

            const data = await res.json();
            
            if (data.error) {
                setResponse({ error: data.error });
            } else {
                setResponse({ text: data.response });
            }
        } catch (err) {
            setResponse({ error: err.message });
        } finally {
            setLoading(false);
            setQuery('');
        }
    };

    const quickActions = isOrganiser ? [
        { q: "Why can't we find a time?", short: "Why no overlap?" },
        { q: "Who hasn't set their availability?", short: "Who's missing?" },
        { q: "Write me a message to send everyone", short: "Draft message" }
    ] : [
        { q: "What times are being considered?", short: "Meeting times?" },
        { q: "How do I set my availability?", short: "Set availability" }
    ];

    // Summary status
    const fullMatches = suggestions.filter(s => s.isFullMatch).length;
    const pending = groupMembers.filter(m => !m.humane_windows?.length).length;
    
    let statusText = '';
    let statusColor = '#888';
    if (fullMatches > 0) {
        statusText = `${fullMatches} times found`;
        statusColor = '#10b981';
    } else if (pending > 0) {
        statusText = `${pending} haven't responded`;
        statusColor = '#f59e0b';
    } else if (groupMembers.length >= 2) {
        statusText = 'No overlap found';
        statusColor = '#ef4444';
    }

    if (!currentGroup) return null;

    return (
        <div className="ai-box">
            {/* Compact bar - always visible */}
            <div className="ai-bar">
                <div className="ai-bar-left">
                    <span className="ai-label">AI</span>
                    {statusText && (
                        <span className="ai-status" style={{ color: statusColor }}>
                            {statusText}
                        </span>
                    )}
                </div>
                
                <div className="ai-bar-right">
                    <input
                        ref={inputRef}
                        type="text"
                        className="ai-input"
                        placeholder="Ask anything..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && ask(query)}
                        onFocus={() => setIsExpanded(true)}
                    />
                    <button 
                        className="ai-send"
                        onClick={() => ask(query)}
                        disabled={loading || !query.trim()}
                    >
                        {loading ? '...' : '→'}
                    </button>
                </div>
            </div>

            {/* Expanded section */}
            {isExpanded && (
                <div className="ai-expanded">
                    {/* Quick action buttons */}
                    {!response && !loading && (
                        <div className="ai-quick">
                            {quickActions.map((a, i) => (
                                <button 
                                    key={i} 
                                    className="ai-quick-btn"
                                    onClick={() => ask(a.q)}
                                >
                                    {a.short}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="ai-loading">
                            <span className="ai-spinner"></span>
                            Thinking...
                        </div>
                    )}

                    {/* Response */}
                    {response && !loading && (
                        <div className="ai-response">
                            {response.error ? (
                                <div className="ai-error">{response.error}</div>
                            ) : (
                                <div className="ai-text">{response.text}</div>
                            )}
                            <button 
                                className="ai-close"
                                onClick={() => { setResponse(null); setIsExpanded(false); }}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
