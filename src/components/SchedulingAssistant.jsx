import { useState, useRef, useEffect } from "react";

export function SchedulingAssistant({ 
    currentUser = null,
    currentGroup = null, 
    groupMembers = [],
    suggestions = [],
    humaneWindows = [],
    isOpen: controlledIsOpen,
    onOpenChange
}) {
    // Support both controlled and uncontrolled mode
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
    const setIsOpen = (value) => {
        if (onOpenChange) onOpenChange(value);
        else setInternalIsOpen(value);
    };
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Build initial message based on context
    useEffect(() => {
        let greeting = "Hi! I can help you with scheduling.";
        
        if (currentGroup && groupMembers.length > 0) {
            greeting = `Hi! I can see you're in the group "${currentGroup.name}" with ${groupMembers.length} members. `;
            if (suggestions.length > 0) {
                const fullMatches = suggestions.filter(s => s.isFullMatch);
                if (fullMatches.length > 0) {
                    greeting += `Good news — there are ${fullMatches.length} times when everyone is available. `;
                } else {
                    greeting += `I see there are ${suggestions.length} partial matches, but no times when everyone is free. I can help you figure out how to find a slot that works. `;
                }
            } else {
                greeting += `No slots have been searched yet. Try clicking "Search" to find available times. `;
            }
            greeting += "What would you like to know?";
        } else if (currentUser) {
            greeting = `Hi ${currentUser.name?.split(' ')[0] || 'there'}! I can help you with scheduling across timezones. What would you like to know?`;
        }
        
        setMessages([{ role: "assistant", content: greeting }]);
    }, [currentGroup?.id, groupMembers.length, suggestions.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = {
            role: "user",
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Build context object to send to API
            const context = {
                user: currentUser ? {
                    name: currentUser.name,
                    email: currentUser.username,
                    provider: currentUser.provider,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    humaneWindows: humaneWindows
                } : null,
                group: currentGroup ? {
                    name: currentGroup.name,
                    memberCount: groupMembers.length
                } : null,
                members: groupMembers.map(m => ({
                    name: m.display_name || m.email?.split('@')[0],
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
            };

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    context
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.response,
                },
            ]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `Sorry, I'm having trouble connecting right now. Please try again in a moment.`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Context-aware quick questions
    const getQuickQuestions = () => {
        if (currentGroup && suggestions.length === 0) {
            return [
                "How do I find available times?",
                "How do I change my availability?",
                "How do timezones work?"
            ];
        }
        if (currentGroup && suggestions.length > 0 && !suggestions.some(s => s.isFullMatch)) {
            return [
                "Why is no one fully available?",
                "What times would work?",
                "How can I adjust my hours?"
            ];
        }
        if (currentGroup && suggestions.some(s => s.isFullMatch)) {
            return [
                "How do I send the invite?",
                "What happens when I book?",
                "Can I change the meeting length?"
            ];
        }
        return [
            "How do I create a group?",
            "How do timezones work?",
            "Is my calendar data safe?"
        ];
    };

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
                    <span className="assistant-trigger-text">Need help?</span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="assistant-window">
                    {/* Header */}
                    <div className="assistant-header">
                        <div className="assistant-header-info">
                            <span className="assistant-title">Scheduling Assistant</span>
                            <span className="assistant-subtitle">
                                {currentGroup ? `Helping with: ${currentGroup.name}` : 'Ask me anything'}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="assistant-close"
                            aria-label="Close chat"
                        >
                            ×
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="assistant-messages">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`assistant-message ${msg.role === "user" ? "user" : "bot"}`}
                            >
                                <p>{msg.content}</p>
                            </div>
                        ))}

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

                    {/* Quick Questions (show only at start) */}
                    {messages.length === 1 && (
                        <div className="assistant-quick-questions">
                            {getQuickQuestions().map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInput(q);
                                        setTimeout(() => sendMessage(), 0);
                                    }}
                                    className="quick-question-btn"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
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
