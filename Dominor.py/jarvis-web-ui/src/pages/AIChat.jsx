// AI Chat Page - Connected to FastAPI backend
import React, { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Icon } from "../components/Icons/Icons";
import { sendChatMessage, sendCommand, getGreeting, createWebSocket } from "../utils/api";

const quickCommands = [
    { label: "What time is it?", action: "get_date_day_info" },
    { label: "System info", action: "get_system_info" },
    { label: "Battery status", action: "get_battery_status" },
    { label: "Motivate me", action: "get_motivational_quote" },
    { label: "Take screenshot", action: "take_screenshot" },
    { label: "Check internet", action: "check_internet_connection" },
];

export default function AIChat() {
    const { runAction } = useOutletContext();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const messagesEndRef = useRef(null);
    const wsRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch greeting on mount and try WebSocket
    useEffect(() => {
        // Get greeting from API
        getGreeting().then((greeting) => {
            setMessages([{
                role: "assistant",
                content: greeting || "Hello! I'm JARVIS, your AI assistant. How can I help you today?"
            }]);
        });

        // Try WebSocket connection
        const ws = createWebSocket({
            onOpen: () => setWsConnected(true),
            onClose: () => setWsConnected(false),
            onError: () => setWsConnected(false),
            onMessage: (data) => {
                if (data.type === "typing") {
                    setIsTyping(data.status);
                } else if (data.type === "response" || data.type === "result") {
                    setIsTyping(false);
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: data.message || data.result || "Done"
                    }]);
                } else if (data.type === "error") {
                    setIsTyping(false);
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: `Error: ${data.message}`
                    }]);
                }
            }
        });
        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput("");

        // Add user message
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setIsTyping(true);

        // Try WebSocket first (faster, real-time)
        if (wsConnected && wsRef.current) {
            wsRef.current.send({ type: "chat", message: userMessage });
            return; // Response will come via WebSocket onMessage handler
        }

        // Fallback to HTTP: use the /api/chat endpoint
        const result = await sendChatMessage(userMessage);
        setIsTyping(false);

        const response = result.response || result.result || "I'm sorry, I couldn't process that request.";
        setMessages(prev => [...prev, { role: "assistant", content: String(response) }]);
    };

    const handleQuickCommand = async (cmd) => {
        // Add user message
        setMessages(prev => [...prev, { role: "user", content: cmd.label }]);
        setIsTyping(true);

        // Try WebSocket first
        if (wsConnected && wsRef.current) {
            wsRef.current.send({ type: "command", action: cmd.action, args: {} });
            return;
        }

        // Fallback to HTTP
        const result = await runAction(cmd.action, {});
        setIsTyping(false);

        const response = result.result || result.message || "Command executed.";
        setMessages(prev => [...prev, {
            role: "assistant",
            content: typeof response === "object" ? JSON.stringify(response, null, 2) : String(response)
        }]);
    };

    const clearChat = () => {
        setMessages([
            { role: "assistant", content: "Chat cleared. How can I help you?" }
        ]);
    };

    return (
        <div className="page chat-page">
            <div className="page-header">
                <h1>
                    <Icon name="AI" size={28} />
                    AI Chat
                </h1>
                <p className="subtitle">
                    Chat with JARVIS AI Assistant
                    <span className={`ws-indicator ${wsConnected ? "connected" : "disconnected"}`}>
                        {wsConnected ? " ● Live" : " ○ HTTP"}
                    </span>
                </p>
            </div>

            <div className="chat-container">
                {/* Quick Commands */}
                <div className="quick-commands">
                    {quickCommands.map((cmd) => (
                        <button
                            key={cmd.label}
                            className="quick-cmd-btn"
                            onClick={() => handleQuickCommand(cmd)}
                            disabled={isTyping}
                        >
                            {cmd.label}
                        </button>
                    ))}
                    <button
                        className="quick-cmd-btn"
                        onClick={clearChat}
                        style={{ marginLeft: "auto", color: "#ef4444" }}
                    >
                        <Icon name="Trash" size={14} />
                        Clear
                    </button>
                </div>

                {/* Messages */}
                <div className="messages-container">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.role}`}>
                            <div className="message-avatar">
                                <Icon name={msg.role === "assistant" ? "AI" : "User"} size={18} />
                            </div>
                            <div className="message-content">
                                <pre>{msg.content}</pre>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="message assistant">
                            <div className="message-avatar">
                                <Icon name="AI" size={18} />
                            </div>
                            <div className="message-content typing">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-input-container">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Type a message or command..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                        disabled={isTyping}
                    />
                    <button
                        className="send-btn"
                        onClick={handleSend}
                        disabled={isTyping || !input.trim()}
                    >
                        <Icon name="Send" size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
