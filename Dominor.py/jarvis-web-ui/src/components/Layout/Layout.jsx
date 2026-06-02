// Main Layout wrapper component — New JARVIS AI OS Design
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BootSequence from "../UI/BootSequence";
import VoiceAssistant from "../UI/VoiceAssistant";
import { useLogger } from "../../hooks/useLogger";
import { useApi } from "../../hooks/useApi";
import { Icon } from "../Icons/Icons";
import { createWebSocket } from "../../utils/api";
import { getStoredUiLanguage, storeUiLanguage, translate } from "../../i18n/uiLanguage";

const navItems = [
    { path: "/", icon: "Dashboard", label: "Dashboard" },
    { path: "/assistant-dashboard", icon: "Brain", label: "Assistant" },
    { path: "/music", icon: "Music", label: "Music" },
    { path: "/system", icon: "System", label: "System" },
    { path: "/files", icon: "Files", label: "Files" },
    { path: "/communication", icon: "Mail", label: "Comms" },
    { path: "/timers", icon: "Timer", label: "Timers" },
    { path: "/ai-chat", icon: "AI", label: "AI Chat" },
    { path: "/ai-automation", icon: "Wand", label: "Automation" },
    { path: "/settings", icon: "Settings", label: "Settings" },
];

function TimeDisplay() {
    const [t, setT] = useState("");
    useEffect(() => {
        const tick = () => setT(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
        tick();
        const i = setInterval(tick, 1000);
        return () => clearInterval(i);
    }, []);
    return <span className="font-mono text-[10px] text-cyan-400/60 tracking-widest tabular-nums">{t}</span>;
}

export default function Layout() {
    const [booting, setBooting] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const location = useLocation();
    const logger = useLogger();
    const { logs, append, clear, getLogText } = logger;
    const { apiStatus, checkStatus, runAction, loading } = useApi(logger);
    const [uiLanguage, setUiLanguage] = useState(() => getStoredUiLanguage());
    const t = useCallback((key, fallback = "") => translate(uiLanguage, key, fallback), [uiLanguage]);

    // Assistant timeline events
    const [assistantEvents, setAssistantEvents] = useState([]);
    const appendAssistantEvent = useCallback((evt) => {
        const ts = new Date();
        const item = {
            id: `${ts.getTime()}-${Math.random().toString(16).slice(2)}`,
            at: ts.toLocaleTimeString(),
            ...evt,
        };
        setAssistantEvents(prev => [...prev.slice(-99), item]);
    }, []);

    // Global WebSocket State
    const [wsConnected, setWsConnected] = useState(false);
    const [wsLastMessage, setWsLastMessage] = useState(null);
    const wsRef = useRef(null);
    const wsRetryRef = useRef(null);

    const connectWS = useCallback(() => {
        const ws = createWebSocket({
            onOpen: () => {
                setWsConnected(true);
                clearTimeout(wsRetryRef.current);
                append("WebSocket connected securely", "success");
                appendAssistantEvent({ type: "system", text: "WebSocket connected" });
            },
            onClose: () => {
                setWsConnected(false);
                wsRetryRef.current = setTimeout(connectWS, 5000);
                appendAssistantEvent({ type: "system", text: "WebSocket disconnected" });
            },
            onError: () => setWsConnected(false),
            onMessage: (data) => {
                setWsLastMessage(data);
                if (data.type === "response" || data.type === "result") {
                    const msg = data.message || data.result?.response || "Task complete.";
                    append(`JARVIS: ${msg}`, "success");
                    appendAssistantEvent({ type: "assistant", text: typeof msg === "string" ? msg : String(msg) });
                } else if (data.type === "error") {
                    append(`JARVIS Error: ${data.message}`, "error");
                    appendAssistantEvent({ type: "error", text: data.message || "Error" });
                } else if (data.type === "pipeline_event") {
                    appendAssistantEvent({ type: "pipeline_event", text: `[${data.stage || data.event}] ${data.message || ""}` });
                }
            }
        });
        wsRef.current = ws;
    }, [append, appendAssistantEvent]);

    useEffect(() => {
        connectWS();
        return () => {
            clearTimeout(wsRetryRef.current);
            wsRef.current?.close();
        };
    }, [connectWS]);

    const sendWsMessage = useCallback((msg) => {
        if (wsRef.current && wsConnected) {
            wsRef.current.send(msg);
        }
    }, [wsConnected]);

    // Check API status on mount
    useEffect(() => {
        checkStatus();
    }, []);

    useEffect(() => {
        storeUiLanguage(uiLanguage);
        const sttByUi = { en: "en-US", hi: "hi-IN", gu: "gu-IN" };
        try {
            localStorage.setItem("jarvis_web_stt_lang", sttByUi[uiLanguage] || "en-US");
        } catch (_) {}
    }, [uiLanguage]);

    // Close mobile sidebar on route change
    useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

    // Escape key closes mobile sidebar
    useEffect(() => {
        const fn = (e) => { if (e.key === "Escape") setIsMobileOpen(false); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, []);

    // Context to pass to pages
    const pageContext = {
        logs,
        append,
        clear,
        runAction,
        loading,
        apiStatus,
        checkStatus,
        wsConnected,
        wsLastMessage,
        sendWsMessage,
        assistantEvents,
        appendAssistantEvent,
        uiLanguage,
        setUiLanguage,
        t,
    };

    // Boot sequence
    if (booting) {
        return (
            <AnimatePresence>
                <BootSequence onComplete={() => setBooting(false)} />
            </AnimatePresence>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden selection:bg-cyan-500/30 selection:text-white">

            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/90 backdrop-blur-xl border-b border-border/40 z-50 flex items-center justify-between px-4">
                <span className="font-black tracking-[0.15em] text-sm text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">J.A.R.V.I.S.</span>
                <div className="flex items-center gap-3">
                    <TimeDisplay />
                    <button
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                        className="w-9 h-9 rounded-xl border border-border/60 bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-500/30 transition-all"
                    >
                        <Icon name={isMobileOpen ? "Close" : "Menu"} size={18} />
                    </button>
                </div>
            </div>

            {/* Mobile overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="md:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <div className="fixed md:relative top-0 left-0 h-full w-64 z-50 flex flex-col">
                <div
                    className={`
                        absolute md:relative inset-y-0 left-0 w-64 flex flex-col h-full bg-sidebar border-r border-border/40
                        transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
                    `}
                >
                    {/* Brand */}
                    <div className="h-16 md:h-20 flex items-center px-5 border-b border-border/30 shrink-0">
                        <div className="flex items-center gap-3 w-full">
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 8px rgba(0,212,255,0.8)" }} />
                                </div>
                                <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: "3s" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black tracking-[0.12em] text-sm text-white">J.A.R.V.I.S.</div>
                                <TimeDisplay />
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" style={{ boxShadow: "0 0 6px rgba(74,222,128,0.8)" }} />
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-0.5 scrollbar-none">
                        {navItems.map((item, idx) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === "/"}
                                onClick={() => setIsMobileOpen(false)}
                            >
                                {({ isActive }) => (
                                    <motion.div
                                        className="relative"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.04, duration: 0.35 }}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="sidebar-active"
                                                className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/10"
                                                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                            />
                                        )}
                                        <div className={`
                                            relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150
                                            ${isActive ? "text-white" : "text-muted-foreground hover:text-gray-200 hover:bg-white/[0.04]"}
                                        `}>
                                            <Icon
                                                name={item.icon}
                                                size={16}
                                                className={`shrink-0 transition-colors ${isActive ? "text-cyan-400" : "text-gray-500"}`}
                                            />
                                            <span className="truncate">{item.label}</span>
                                            {isActive && (
                                                <motion.div
                                                    initial={{ scaleX: 0 }}
                                                    animate={{ scaleX: 1 }}
                                                    className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-full"
                                                    style={{ boxShadow: "0 0 8px rgba(0,212,255,0.6)" }}
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer */}
                    <div className="p-3 border-t border-border/30 shrink-0">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-border/30">
                            <div className="flex items-center gap-2.5">
                                <div className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="status-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                </div>
                                <span className="text-[11px] font-medium text-gray-400">System Online</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">v2.0</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 relative">
                <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-cyan-900/8 blur-[140px] rounded-full pointer-events-none" />
                <main className="flex-1 overflow-y-auto md:p-7 p-4 pt-20 md:pt-7 relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 12, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -12, scale: 0.99 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            className="max-w-6xl mx-auto w-full min-h-full"
                        >
                            <Outlet context={pageContext} />
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Voice Assistant (floating) */}
                <VoiceAssistant
                    wsConnected={wsConnected}
                    wsLastMessage={wsLastMessage}
                    sendWsMessage={sendWsMessage}
                    onAssistantEvent={appendAssistantEvent}
                />
            </div>
        </div>
    );
}
