import { useState, useRef, useEffect } from "react";

export function SchedulingAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Hi! I'm here to help you with scheduling. Ask me anything about how Humane Calendar works, timezone coordination, or setting up your availability.",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

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
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
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

    const quickQuestions = [
        "How do I invite someone?",
        "How do timezones work?",
        "Is my calendar data safe?",
    ];

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
                            <span className="assistant-subtitle">Ask me anything</span>
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
                            {quickQuestions.map((q, i) => (
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
                            placeholder="Type your question..."
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
