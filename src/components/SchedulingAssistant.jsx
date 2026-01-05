import { useState, useRef, useEffect } from "react";

/**
 * AI Scheduling Assistant - Now with actionable responses and copy buttons
 */
export function SchedulingAssistant({ 
    currentUser = null,
    currentGroup = null, 
    groupMembers = [],
    suggestions = [],
    humaneWindows = [],
    isOpen: controlledIsOpen,
    onOpenChange,
    initialQuestion = null,
    isOrganiser = false // Determines AI model tier: organiser gets full agent, attendee gets simple chat
}) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
    const setIsOpen = (value) => {
        if (onOpenChange) onOpenChange(value);
        else setInternalIsOpen(value);
    };
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [autoSentQuestion, setAutoSentQuestion] = useState(null);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const messagesEndRef = useRef(null);

    // Build initial message based on context
    useEffect(() => {
        let greeting = "Hi! I'm your scheduling assistant. I can analyze timezone overlaps, suggest what changes would help, and write messages to send to your group members.";
        
        if (currentGroup && groupMembers.length > 0) {
            greeting = `Hi! I can see you're in "${currentGroup.name}" with ${groupMembers.length} members. `;
            if (suggestions.length > 0) {
                const fullMatches = suggestions.filter(s => s.isFullMatch);
                if (fullMatches.length > 0) {
                    greeting += `Great news — ${fullMatches.length} times work for everyone! `;
                } else {
                    greeting += `No times work for everyone yet. Ask me to analyze why and I can suggest what each person could change. `;
                }
            } else {
                greeting += `Click "Search" first, then I can help analyze the results. `;
            }
        }
        
        setMessages([{ role: "assistant", content: greeting }]);
        setAutoSentQuestion(null);
    }, [currentGroup?.id, groupMembers.length, suggestions.length]);

    // Auto-send initial question
    useEffect(() => {
        if (isOpen && initialQuestion && initialQuestion !== autoSentQuestion && messages.length === 1 && !isLoading) {
            setAutoSentQuestion(initialQuestion);
            setTimeout(() => sendMessageWithText(initialQuestion), 100);
        }
    }, [isOpen, initialQuestion, autoSentQuestion, messages.length, isLoading]);

    const buildContext = () => ({
        user: currentUser ? {
            name: currentUser.name,
            email: currentUser.username,
            provider: currentUser.provider,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            humaneWindows: humaneWindows
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
        suggestions: suggestions.slice(0, 10).map(s => ({
            start: s.start,
            end: s.end,
            availableCount: s.availableMembers?.length || 0,
            totalMembers: groupMembers.length,
            isFullMatch: s.isFullMatch,
            unavailable: s.unavailableMembers?.map(m => m.display_name || m.email?.split('@')[0]) || []
        }))
    });

    const sendMessageWithText = async (text) => {
        if (!text.trim() || isLoading) return;

        const userMessage = { role: "user", content: text };
        const currentMessages = [...messages, userMessage];

        setMessages(currentMessages);
        setIsLoading(true);

        try {
            const context = buildContext();
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
                    context,
                    role: isOrganiser ? 'organiser' : 'attendee'
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Create message with potential tool results
            const assistantMessage = { 
                role: "assistant", 
                content: data.response,
                toolResults: data.toolResults || []
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { 
                role: "assistant", 
                content: `Sorry, I'm having trouble connecting. ${error.message}` 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;
        const text = input;
        setInput("");
        await sendMessageWithText(text);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const copyToClipboard = async (text, index) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Extract copyable messages from content
    const extractCopyableMessages = (content) => {
        // Look for message blocks (text between --- markers or in quotes after "message:")
        const messages = [];
        
        // Pattern 1: Text between --- markers
        const dashPattern = /---\n([\s\S]*?)\n---/g;
        let match;
        while ((match = dashPattern.exec(content)) !== null) {
            messages.push(match[1].trim());
        }
        
        // Pattern 2: "Here's a message:" followed by quoted text
        const quotePattern = /[Mm]essage[:\s]*\n*["']?([\s\S]*?)["']?(?=\n\n|$)/g;
        while ((match = quotePattern.exec(content)) !== null) {
            if (!messages.includes(match[1].trim())) {
                messages.push(match[1].trim());
            }
        }
        
        return messages;
    };

    // Render a message with special formatting for tool results
    const renderMessage = (msg, index) => {
        const isUser = msg.role === "user";
        const copyableMessages = !isUser ? extractCopyableMessages(msg.content) : [];
        
        // Check if there's a generate_message tool result
        const messageToolResult = msg.toolResults?.find(t => t.tool === 'generate_message');
        
        return (
            <div key={index} className={`assistant-message ${isUser ? "user" : "bot"}`}>
                {/* Main content */}
                <div className="message-content">
                    {msg.content.split('\n').map((line, i) => (
                        <p key={i}>{line || '\u00A0'}</p>
                    ))}
                </div>
                
                {/* Copyable message card from tool result */}
                {messageToolResult && (
                    <div className="copyable-message-card">
                        <div className="copyable-message-header">
                            Message for {messageToolResult.result.recipientName}
                        </div>
                        <div className="copyable-message-body">
                            {messageToolResult.result.message}
                        </div>
                        <button 
                            className={`copy-button ${copiedIndex === `tool-${index}` ? 'copied' : ''}`}
                            onClick={() => copyToClipboard(messageToolResult.result.message, `tool-${index}`)}
                        >
                            {copiedIndex === `tool-${index}` ? 'Copied!' : 'Copy message'}
                        </button>
                    </div>
                )}
                
                {/* Inline copyable messages found in content */}
                {copyableMessages.length > 0 && !messageToolResult && copyableMessages.map((msgText, i) => (
                    <div key={i} className="copyable-message-card">
                        <div className="copyable-message-body">
                            {msgText}
                        </div>
                        <button 
                            className={`copy-button ${copiedIndex === `${index}-${i}` ? 'copied' : ''}`}
                            onClick={() => copyToClipboard(msgText, `${index}-${i}`)}
                        >
                            {copiedIndex === `${index}-${i}` ? 'Copied!' : 'Copy message'}
                        </button>
                    </div>
                ))}
                
                {/* Timezone analysis card */}
                {msg.toolResults?.find(t => t.tool === 'analyze_timezone_overlap') && (
                    <div className="analysis-card">
                        {renderTimezoneAnalysis(msg.toolResults.find(t => t.tool === 'analyze_timezone_overlap').result)}
                    </div>
                )}
            </div>
        );
    };

    // Render timezone analysis as a nice card
    const renderTimezoneAnalysis = (analysis) => {
        if (analysis.error) return <p className="error">{analysis.error}</p>;
        
        return (
            <div className="timezone-analysis">
                <div className="analysis-header">
                    <span className="analysis-title">Timezone Analysis</span>
                    <span className={`spread-badge ${analysis.goldenWindowExists ? 'good' : 'challenging'}`}>
                        {analysis.timezoneSpread} spread
                    </span>
                </div>
                
                {analysis.bestHoursUTC?.slice(0, 2).map((hour, i) => (
                    <div key={i} className="best-hour-card">
                        <div className="best-hour-time">{hour.time}</div>
                        <div className="member-times">
                            {hour.memberTimes?.map((mt, j) => (
                                <div key={j} className="member-time">{mt}</div>
                            ))}
                        </div>
                    </div>
                ))}
                
                {analysis.adjustmentsNeeded?.length > 0 && (
                    <div className="adjustments-section">
                        <div className="adjustments-title">Who would need to adjust:</div>
                        {analysis.adjustmentsNeeded.map((adj, i) => (
                            <div key={i} className="adjustment-item">
                                <strong>{adj.member}</strong>: {adj.suggestion}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Context-aware quick questions
    const getQuickQuestions = () => {
        if (currentGroup && suggestions.length > 0 && !suggestions.some(s => s.isFullMatch)) {
            return [
                "Analyze why we can't find a time",
                "Who needs to adjust their hours?",
                "Write a message to ask someone to change"
            ];
        }
        if (currentGroup && suggestions.some(s => s.isFullMatch)) {
            return [
                "How do I send the invite?",
                "What's the best time slot?",
            ];
        }
        return [
            "How does timezone matching work?",
            "How do I set my availability?",
        ];
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="assistant-trigger"
                    aria-label="Chat with Assistant"
                >
                    <span className="assistant-trigger-icon">?</span>
                    <span className="assistant-trigger-text">AI Help</span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="assistant-window">
                    <div className="assistant-header">
                        <div className="assistant-header-info">
                            <span className="assistant-title">AI Scheduling Agent</span>
                            <span className="assistant-subtitle">
                                {currentGroup ? currentGroup.name : 'Ask me anything'}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="assistant-close"
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>

                    <div className="assistant-messages">
                        {messages.map((msg, i) => renderMessage(msg, i))}

                        {isLoading && (
                            <div className="assistant-message bot">
                                <div className="assistant-typing">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Questions */}
                    {messages.length === 1 && (
                        <div className="assistant-quick-questions">
                            {getQuickQuestions().map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessageWithText(q)}
                                    className="quick-question-btn"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="assistant-input-area">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about scheduling..."
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            className="assistant-send"
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
