// Assistant Dashboard page — New JARVIS AI OS Design
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { mockAssistantEvents } from "../utils/mockData";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

const CAPABILITIES = [
    { label: "Voice Recognition", icon: "Mic", color: "#00D4FF", status: "Active" },
    { label: "AI Reasoning", icon: "Brain", color: "#8b5cf6", status: "Online" },
    { label: "System Control", icon: "Cpu", color: "#f59e0b", status: "Enabled" },
    { label: "Web Search", icon: "Globe", color: "#22c55e", status: "Ready" },
    { label: "File Access", icon: "Files", color: "#ec4899", status: "Granted" },
    { label: "Music Engine", icon: "Music", color: "#3b82f6", status: "Online" },
];

export default function AssistantDashboard() {
    const ctx = useOutletContext();
    const [profile, setProfile] = useState({ name: "", title: "", email: "" });
    const [events, setEvents] = useState(
        ctx?.assistantEvents?.length > 0 ? ctx.assistantEvents : mockAssistantEvents
    );

    useEffect(() => {
        try {
            const saved = localStorage.getItem("jarvis_profile");
            if (saved) setProfile(JSON.parse(saved));
        } catch {}
    }, []);

    useEffect(() => {
        if (ctx?.assistantEvents?.length > 0) {
            setEvents(ctx.assistantEvents);
        }
    }, [ctx?.assistantEvents]);

    const save = (key, value) => {
        const next = { ...profile, [key]: value };
        setProfile(next);
        try { localStorage.setItem("jarvis_profile", JSON.stringify(next)); } catch {}
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-12">
            <motion.div variants={item}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-2">
                    <Icon name="Brain" size={13} /> Cognitive Center
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Assistant Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">Your profile, intelligence status, and interaction timeline.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Left column */}
                <div className="space-y-4 lg:col-span-1">
                    {/* Status */}
                    <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <Icon name="Activity" size={16} className="text-cyan-400" /> System Status
                        </h2>
                        <div className="space-y-2">
                            {[
                                { label: "Core API", status: ctx?.apiStatus === "online" ? "Online" : "Offline", type: ctx?.apiStatus === "online" ? "green" : "red" },
                                { label: "WebSocket", status: ctx?.wsConnected ? "Connected" : "Disconnected", type: ctx?.wsConnected ? "green" : "red" },
                                { label: "Wake Word", status: `"${profile.name ? profile.name.split(" ")[0] : "Jarvis"}"`, type: "cyan" },
                                { label: "AI Module", status: "Active", type: "green" },
                            ].map((s, i) => (
                                <motion.div
                                    key={s.label}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + i * 0.06 }}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/5"
                                >
                                    <span className="text-xs font-mono text-gray-500 uppercase tracking-wide">{s.label}</span>
                                    <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg ${
                                        s.type === "green"
                                            ? "text-green-400 bg-green-400/8 border border-green-400/15"
                                            : s.type === "cyan"
                                            ? "text-cyan-400 bg-cyan-400/8 border border-cyan-400/15"
                                            : "text-red-400 bg-red-400/8 border border-red-400/15"
                                    }`}>
                                        {s.type === "green" && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />}
                                        {s.status}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Profile */}
                    <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <Icon name="User" size={16} className="text-cyan-400" /> Operator Profile
                        </h2>
                        <div className="flex justify-center mb-5">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
                                    {profile.name ? (
                                        <span className="text-2xl font-bold text-cyan-400">
                                            {profile.name.charAt(0).toUpperCase()}
                                        </span>
                                    ) : (
                                        <Icon name="User" size={24} className="text-cyan-400/50" />
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            {[
                                { key: "name", label: "Designation", placeholder: "e.g. Tony Stark", type: "text" },
                                { key: "title", label: "Title", placeholder: "e.g. Lead Engineer", type: "text" },
                                { key: "email", label: "Comm Link", placeholder: "stark@starkindustries.com", type: "email" },
                            ].map(f => (
                                <div key={f.key} className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{f.label}</label>
                                    <input
                                        type={f.type}
                                        value={profile[f.key]}
                                        onChange={e => save(f.key, e.target.value)}
                                        placeholder={f.placeholder}
                                        className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white"
                                    />
                                </div>
                            ))}
                        </div>
                        {profile.name && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-300 font-mono"
                            >
                                Welcome back, {profile.name.split(" ")[0]}. All systems ready.
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                {/* Right: Timeline */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl lg:col-span-2 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <Icon name="Activity" size={16} className="text-cyan-400" /> Interaction Timeline
                        </h2>
                        <button
                            onClick={() => setEvents(prev => [...prev, {
                                id: prev.length + 1,
                                type: "system",
                                text: "Manual sync initiated by operator.",
                                at: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                            }])}
                            className="text-xs flex items-center gap-1.5 text-cyan-400/70 hover:text-cyan-400 transition-colors font-mono"
                        >
                            <Icon name="Refresh" size={12} /> Sync
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        <AnimatePresence initial={false}>
                            {events.map((evt, i) => (
                                <motion.div
                                    key={evt.id}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
                                    className="relative pl-6"
                                >
                                    {i < events.length - 1 && (
                                        <div className="absolute left-[5px] top-6 bottom-0 w-px bg-white/8" />
                                    )}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: i * 0.06 + 0.1, type: "spring" }}
                                        className={`absolute left-0 top-3 w-3 h-3 rounded-full border-2 border-background ${
                                            evt.type === "assistant" ? "bg-cyan-500" : evt.type === "user" ? "bg-white" : "bg-gray-600"
                                        }`}
                                        style={evt.type === "assistant" ? { boxShadow: "0 0 8px rgba(0,212,255,0.6)" } : {}}
                                    />

                                    <div className={`p-4 rounded-xl border ${
                                        evt.type === "assistant"
                                            ? "bg-cyan-950/15 border-cyan-900/30"
                                            : evt.type === "user"
                                            ? "bg-white/5 border-white/8"
                                            : "bg-white/3 border-white/5"
                                    }`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={`text-[10px] font-mono uppercase tracking-widest font-semibold ${
                                                evt.type === "assistant" ? "text-cyan-500" : evt.type === "user" ? "text-gray-300" : "text-gray-600"
                                            }`}>{evt.type}</span>
                                            <span className="text-[10px] text-gray-600 font-mono">{evt.at}</span>
                                        </div>
                                        <p className="text-sm text-gray-300 leading-relaxed">{evt.text}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Capabilities Grid */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl lg:col-span-3">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <Icon name="Layers" size={16} className="text-cyan-400" /> Capability Matrix
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {CAPABILITIES.map((cap, i) => (
                            <motion.div
                                key={cap.label}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ scale: 1.05, y: -3 }}
                                className="p-4 rounded-xl border border-white/5 bg-white/4 text-center flex flex-col items-center gap-2"
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cap.color + "18" }}>
                                    <Icon name={cap.icon} size={20} style={{ color: cap.color }} />
                                </div>
                                <div className="text-[10px] font-semibold text-white leading-tight">{cap.label}</div>
                                <div className="text-[9px] font-mono text-gray-500 uppercase">{cap.status}</div>
                                <div className="w-full h-1 rounded-full overflow-hidden bg-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "100%" }}
                                        transition={{ delay: 0.3 + i * 0.08, duration: 0.8 }}
                                        className="h-full rounded-full"
                                        style={{ background: cap.color, opacity: 0.7 }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
