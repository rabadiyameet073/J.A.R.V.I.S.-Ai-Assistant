// AI Chat Page — Redesigned with dark sci-fi design and framer-motion
// Connected to FastAPI /api/ai + WebSocket /ws
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { api, sendChatMessage } from "../utils/api";

const quickCommands = [
    { label: "What time is it?",  action: "get_date_day_info", icon: "Timer" },
    { label: "System info",       action: "get_system_info", icon: "Cpu" },
    { label: "Battery status",    action: "get_battery_status", icon: "Battery" },
    { label: "Motivate me",       action: "get_motivational_quote", icon: "Quote" },
    { label: "Take screenshot",   action: "take_screenshot", icon: "Screenshot" },
    { label: "Check internet",    action: "check_internet_connection", icon: "Globe" },
    { label: "Today's weather",   action: "weather", icon: "Weather" },
];

const TYPING_TIMEOUT_MS = 20000;

export default function AIChat() {
    const { runAction, wsConnected, wsLastMessage, sendWsMessage, appendAssistantEvent, t } = useOutletContext();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const pendingRef = useRef(false);
    const inputRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

    const addMessage = useCallback((role, content) => {
        setMessages(prev => [...prev, {
            role,
            content: typeof content === "string" ? content : JSON.stringify(content, null, 2),
            id: Date.now() + Math.random()
        }]);
    }, []);

    const clearTypingTimeout = useCallback(() => {
        clearTimeout(typingTimeoutRef.current);
    }, []);

    const setTypingWithTimeout = useCallback((val) => {
        setIsTyping(val);
        if (val) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                pendingRef.current = false;
            }, TYPING_TIMEOUT_MS);
        } else {
            clearTimeout(typingTimeoutRef.current);
            pendingRef.current = false;
        }
    }, []);

    const assistantFromWs = (data) => {
        const m = data.message ?? data.response ?? data.result?.response ?? data.result?.message;
        if (m == null || m === "") return null;
        return typeof m === "string" ? m : String(m);
    };

    // Listen to global WebSocket messages
    useEffect(() => {
        if (!wsLastMessage) return;
        const data = wsLastMessage;
        const ch = data.channel;

        if (!pendingRef.current && data.type !== "typing") return;

        if (data.type === "typing") {
            if (ch === "chat" || ch === "aichat") {
                setTypingWithTimeout(!!data.status);
            }
            return;
        }
        if (data.type === "error" && (ch === "chat" || ch === "aichat" || !ch)) {
            setTypingWithTimeout(false);
            addMessage("assistant", `⚠ ${data.message || "Error from server"}`);
            pendingRef.current = false;
            return;
        }
        if ((data.type === "response" || data.type === "result") &&
            (ch === "chat" || ch === "aichat" || !ch)) {
            setTypingWithTimeout(false);
            const text = assistantFromWs(data);
            if (text) addMessage("assistant", text);
            pendingRef.current = false;
        }
    }, [wsLastMessage, addMessage, setTypingWithTimeout]);

    // Greeting on mount
    useEffect(() => {
        api.getGreeting?.()
            .then((greeting) => {
                setMessages([{
                    role: "assistant",
                    content: greeting || "Hello! I'm J.A.R.V.I.S., your AI assistant. How can I help you today?",
                    id: 0
                }]);
            })
            .catch(() => {
                setMessages([{
                    role: "assistant",
                    content: "Hello! I'm J.A.R.V.I.S., your AI assistant. How can I help you today?",
                    id: 0
                }]);
            });
        return () => clearTimeout(typingTimeoutRef.current);
    }, []);

    const handleSend = useCallback(async (overrideInput) => {
        const text = (overrideInput ?? input).trim();
        if (!text || isTyping) return;
        setInput("");
        addMessage("user", text);
        appendAssistantEvent?.({ type: "user", text });
        setTypingWithTimeout(true);

        if (wsConnected) {
            pendingRef.current = true;
            sendWsMessage({ type: "chat", message: text, channel: "chat" });
            return;
        }

        try {
            const result = await api.aiChat(text);
            const responseText = result.response || result.message || result.result || "I couldn't process that.";
            setTypingWithTimeout(false);
            addMessage("assistant", responseText);
            appendAssistantEvent?.({ type: "assistant", text: typeof responseText === "string" ? responseText : String(responseText) });
        } catch {
            try {
                const result = await sendChatMessage(text);
                const responseText = result.response || result.message || result.result || "Sorry, I'm having trouble connecting.";
                setTypingWithTimeout(false);
                addMessage("assistant", responseText);
                appendAssistantEvent?.({ type: "assistant", text: typeof responseText === "string" ? responseText : String(responseText) });
            } catch {
                setTypingWithTimeout(false);
                addMessage("assistant", "⚠ Could not reach the backend. Make sure JARVIS is running.");
                appendAssistantEvent?.({ type: "assistant", text: "Could not reach the backend. Make sure JARVIS is running." });
            }
        }
    }, [input, isTyping, wsConnected, addMessage, setTypingWithTimeout, sendWsMessage, appendAssistantEvent]);

    const handleQuickCommand = useCallback(async (cmd) => {
        if (isTyping) return;
        addMessage("user", cmd.label);
        appendAssistantEvent?.({ type: "user", text: cmd.label });
        setTypingWithTimeout(true);

        if (wsConnected) {
            pendingRef.current = true;
            sendWsMessage({ type: "command", action: cmd.action, args: {}, replyChannel: "aichat", channel: "aichat" });
            return;
        }

        try {
            const result = await runAction(cmd.action, {});
            setTypingWithTimeout(false);
            const response = result.result || result.message || result.response || "Command executed.";
            addMessage("assistant", typeof response === "object" ? JSON.stringify(response, null, 2) : String(response));
            appendAssistantEvent?.({ type: "assistant", text: typeof response === "object" ? JSON.stringify(response, null, 2) : String(response) });
        } catch {
            setTypingWithTimeout(false);
            addMessage("assistant", "⚠ Command failed. Try again.");
            appendAssistantEvent?.({ type: "assistant", text: "Command failed. Try again." });
        }
    }, [isTyping, wsConnected, addMessage, setTypingWithTimeout, sendWsMessage, runAction, appendAssistantEvent]);

    const handleResetChat = useCallback(async () => {
        await api.resetChat?.().catch(() => {});
        clearTypingTimeout();
        setIsTyping(false);
        pendingRef.current = false;
        setMessages([{ role: "assistant", content: "Chat cleared. How can I help you?", id: Date.now() }]);
    }, [clearTypingTimeout]);

    useEffect(() => {
        window.__jarvisAIChatSend = handleSend;
        return () => { delete window.__jarvisAIChatSend; };
    }, [handleSend]);

    return (
        <div className="flex flex-col pb-4" style={{ height: "calc(100vh - 6rem)" }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> 
                        Cognitive Interface
                        <span className="text-[10px] text-gray-500 font-mono ml-1.5">({wsConnected ? "WebSocket" : "HTTP"})</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{t?.("page.aiChat", "Intelligence Chat") || "Intelligence Chat"}</h1>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleResetChat}
                    className="text-xs flex items-center gap-1.5 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-400/8 border border-red-400/15 transition-colors font-mono"
                >
                    <Icon name="Trash" size={12} /> Clear
                </motion.button>
            </motion.div>

            {/* Quick commands */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex gap-2 overflow-x-auto pb-3 shrink-0 scrollbar-none"
            >
                {quickCommands.map((c, i) => (
                    <motion.button
                        key={c.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickCommand(c)}
                        disabled={isTyping}
                        className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-xs text-gray-400 hover:text-white hover:border-cyan-500/30 hover:bg-cyan-500/8 transition-colors disabled:opacity-40 font-mono flex items-center gap-1.5"
                    >
                        <Icon name={c.icon || "Command"} size={11} className="text-cyan-500/70" />
                        {c.label}
                    </motion.button>
                ))}
            </motion.div>

            {/* Chat window */}
            <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col min-h-0 relative">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0 scrollbar-none">
                    <AnimatePresence initial={false}>
                        {messages.map((m) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                                className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border shadow-lg ${
                                        m.role === "user"
                                            ? "bg-gray-800 border-gray-700"
                                            : "bg-cyan-950 border-cyan-500/30"
                                    }`}
                                    style={m.role === "assistant" ? { boxShadow: "0 0 12px rgba(0,212,255,0.08)" } : {}}
                                >
                                    <Icon
                                        name={m.role === "user" ? "User" : "AI"}
                                        size={16}
                                        className={m.role === "assistant" ? "text-cyan-400" : "text-gray-300"}
                                    />
                                </motion.div>
                                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                    m.role === "user"
                                        ? "bg-white/8 border border-white/8 rounded-tr-sm text-gray-100"
                                        : "bg-cyan-950/25 border border-cyan-900/30 rounded-tl-sm text-cyan-50"
                                }`}
                                    style={m.role === "assistant" ? { boxShadow: "0 4px 20px -4px rgba(0,212,255,0.08)" } : {}}
                                >
                                    <pre className="margin-0 white-space-pre-wrap word-break-break-word font-sans leading-relaxed">
                                        {m.content}
                                    </pre>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    <AnimatePresence>
                        {isTyping && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex gap-3"
                            >
                                <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-cyan-950 border border-cyan-500/30">
                                    <Icon name="AI" size={16} className="text-cyan-400" />
                                </div>
                                <div className="rounded-2xl rounded-tl-sm px-5 py-3.5 bg-cyan-950/25 border border-cyan-900/30 flex items-center gap-1.5">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={i}
                                            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 sm:p-4 bg-black/35 border-t border-white/5 shrink-0">
                    <div className="flex items-center gap-2 bg-black/40 border border-white/8 rounded-2xl p-2 focus-within:border-cyan-500/30 transition-all">
                        <button
                            onClick={() => {
                                const orb = document.getElementById("voice-orb-btn");
                                if (orb) orb.click();
                            }}
                            className="p-2.5 text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-colors"
                            title="Speak to JARVIS"
                        >
                            <Icon name="Mic" size={18} />
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSend(input)}
                            disabled={isTyping}
                            placeholder="Query intelligence matrix..."
                            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-gray-700 disabled:opacity-40 min-w-0"
                        />
                        <motion.button
                            whileHover={!isTyping && input.trim() ? { scale: 1.05 } : {}}
                            whileTap={!isTyping && input.trim() ? { scale: 0.95 } : {}}
                            onClick={() => handleSend(input)}
                            disabled={isTyping || !input.trim()}
                            className="p-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl transition-colors disabled:opacity-30 disabled:bg-gray-800 disabled:text-gray-500 flex items-center justify-center"
                        >
                            <Icon name="Send" size={16} />
                        </motion.button>
                    </div>
                    <p className="text-center text-[10px] text-gray-700 mt-2 font-mono">Press Enter to send · All data local</p>
                </div>
            </div>
        </div>
    );
}
