// Dashboard page — New JARVIS AI OS Design
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { mockCategories, mockAssistantEvents } from "../utils/mockData";
import { getFunctions, checkApiStatus } from "../utils/api";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } }
};
const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 24 } }
};

function AnimatedCounter({ to, suffix = "" }) {
    const mv = useMotionValue(0);
    const spring = useSpring(mv, { stiffness: 80, damping: 20 });
    const [val, setVal] = useState(0);
    useEffect(() => {
        mv.set(to);
        return spring.on("change", v => setVal(Math.round(v)));
    }, [to]);
    return <>{val}{suffix}</>;
}

const QUOTES = [
    "All systems nominal. Standing by.",
    "Neural networks calibrated. Ready.",
    "Secure channel established.",
    "Awaiting your command.",
    "Running background diagnostics.",
];

export default function Dashboard() {
    const ctx = useOutletContext();
    const [quote, setQuote] = useState(QUOTES[0]);
    const [tick, setTick] = useState(0);
    const [date, setDate] = useState("");
    const [functionsCount, setFunctionsCount] = useState(28);
    const [uptimeMins, setUptimeMins] = useState(0);
    const [showSetupWarning, setShowSetupWarning] = useState(false);
    const recentChat = (ctx?.assistantEvents?.length > 0 ? ctx.assistantEvents : mockAssistantEvents)
        .filter(e => e.type === "user" || e.type === "assistant").slice(-4).reverse();

    useEffect(() => {
        setDate(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
        
        // Check if warning has been dismissed
        const warned = localStorage.getItem("jarvis_setup_warning_dismissed");
        if (!warned) {
            setShowSetupWarning(true);
        }

        // Fetch functions count from backend
        getFunctions().then(res => {
            if (res && res.count) {
                setFunctionsCount(res.count);
            }
        }).catch(() => {});

        // Fetch uptime
        checkApiStatus().then(res => {
            if (res && res.online && res.uptime_secs) {
                setUptimeMins(Math.round(res.uptime_secs / 60));
            }
        }).catch(() => {});

        const i = setInterval(() => {
            setTick(t => t + 1);
            setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
        }, 4000);
        return () => clearInterval(i);
    }, []);

    const dismissWarning = () => {
        localStorage.setItem("jarvis_setup_warning_dismissed", "true");
        setShowSetupWarning(false);
    };

    const isOnline = ctx?.apiStatus === "online";

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-12">

            {/* Setup Warning Alert */}
            <AnimatePresence>
                {showSetupWarning && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="overflow-hidden"
                    >
                        <div className="relative p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-300 hud-corners overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-xl rounded-full pointer-events-none" />
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                    <Icon name="Info" size={24} className="text-amber-400 animate-pulse" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-sm text-white mb-1">
                                        System Configuration Warning: Local Setup Required
                                    </h3>
                                    <p className="text-xs text-amber-300/80 leading-relaxed max-w-3xl font-mono">
                                        OS-level capabilities (launching terminal shells, executing local apps, files editing, audio volume control, and screen capture) are restricted within the browser's sandbox. To enable full interactive features, you must clone and run the J.A.R.V.I.S. FastAPI service locally.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                    <button
                                        onClick={() => {
                                            alert("Please refer to the README.md file created in the root workspace directory for full local configuration steps, sir.");
                                        }}
                                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-mono text-xs transition-colors border border-white/5"
                                    >
                                        Setup Guide
                                    </button>
                                    <button
                                        onClick={dismissWarning}
                                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold font-mono text-xs transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero */}
            <motion.div variants={item} className="relative overflow-hidden rounded-2xl sm:rounded-3xl glass-panel p-6 sm:p-10 hud-corners">
                <div className="absolute inset-0 bg-grid opacity-20" />
                <div className="absolute top-[-30%] right-[-10%] w-[50%] h-[80%] rounded-full bg-cyan-900/15 blur-[80px]" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
                    <div className="flex-1 min-w-0">
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-5"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            AI-Powered Assistant
                        </motion.div>

                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3 leading-tight">
                            Welcome to{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">
                                J.A.R.V.I.S.
                            </span>
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base mb-6 max-w-lg">
                            Personal AI Operating System — System Control, Automation & Intelligence
                        </p>

                        {/* Status quote */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={tick}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.4 }}
                                className="text-xs font-mono text-cyan-400/60 mb-6"
                            >
                                ▶ {quote}
                            </motion.div>
                        </AnimatePresence>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-6 sm:gap-10">
                            {[
                                { label: "Functions", value: functionsCount, suffix: "" },
                                { label: "Modules", value: mockCategories.length, suffix: "" },
                                { label: "Uptime", value: isOnline ? uptimeMins : 0, suffix: isOnline ? "m" : "" },
                            ].map((stat, i) => (
                                <div key={i} className="flex flex-col">
                                    <span className="text-2xl sm:text-3xl font-light text-white tabular-nums">
                                        {isOnline || stat.label === "Modules" ? (
                                            <AnimatedCounter to={stat.value} suffix={stat.suffix} />
                                        ) : (
                                            "—"
                                        )}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mt-0.5">{stat.label}</span>
                                </div>
                            ))}
                            <div className="flex flex-col">
                                <span className={`text-2xl sm:text-3xl font-light ${isOnline ? "text-green-400" : "text-red-400"}`}>
                                    {isOnline ? "Online" : "Offline"}
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mt-0.5">Status</span>
                            </div>
                        </div>
                    </div>

                    {/* Voice Orb */}
                    <div className="relative flex-shrink-0 flex flex-col items-center gap-3 self-center">
                        <Link to="/ai-chat">
                            <motion.button
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                                className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center bg-cyan-950/20 border border-cyan-500/20 cursor-pointer"
                            >
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-cyan-500/8"
                                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <motion.div
                                    className="absolute inset-3 rounded-full bg-cyan-500/10"
                                    animate={{ scale: [1, 1.08, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-6 rounded-full border border-dashed border-cyan-500/20"
                                />
                                <Icon name="AI" size={40} className="text-cyan-400 relative z-10" />
                            </motion.button>
                        </Link>
                        <span className="text-[10px] text-cyan-400/50 uppercase tracking-[0.2em] font-mono">AI Chat</span>
                    </div>
                </div>

                {/* Date */}
                <div className="absolute top-4 right-6 text-[10px] font-mono text-gray-600 hidden sm:block">{date}</div>
            </motion.div>

            {/* Grid */}
            <div>
                <motion.div variants={item} className="flex items-end justify-between mb-5">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold mb-1">System Modules</h2>
                        <p className="text-muted-foreground text-xs sm:text-sm">Select a module to begin</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {mockCategories.map((cat, idx) => (
                        <motion.div key={cat.path} variants={item} custom={idx}>
                            <Link to={cat.path}>
                                <motion.div
                                    whileHover={{ y: -4, boxShadow: "0 12px 30px -8px rgba(0,212,255,0.15)" }}
                                    whileTap={{ scale: 0.97 }}
                                    className="glass-panel p-4 sm:p-5 rounded-xl sm:rounded-2xl h-full cursor-pointer hover:border-cyan-500/25 transition-colors duration-300 flex flex-col"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <motion.div
                                            whileHover={{ scale: 1.15, rotate: 5 }}
                                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/5 flex items-center justify-center text-gray-400"
                                        >
                                            <Icon name={cat.icon} size={20} className="text-gray-400" />
                                        </motion.div>
                                        <Icon name="ArrowRight" size={14} className="text-muted-foreground/50" />
                                    </div>
                                    <h3 className="font-semibold text-sm sm:text-base mb-1 text-white">{cat.title}</h3>
                                    <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed line-clamp-2">{cat.description}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cat.features.slice(0, 2).map((f, i) => (
                                            <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-black/40 border border-white/5 text-gray-500 font-mono tracking-wide">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </motion.div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <motion.div variants={item}>
                    <Link to="/settings">
                        <motion.div
                            whileHover={{ x: 4 }}
                            className="glass-panel p-5 rounded-xl flex items-center justify-between cursor-pointer hover:border-white/15 transition-colors group h-full"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center">
                                    <motion.div whileHover={{ rotate: 90 }} transition={{ duration: 0.5 }}>
                                        <Icon name="Settings" size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                                    </motion.div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-sm mb-0.5">Configuration</h3>
                                    <p className="text-xs text-muted-foreground">Voice settings & system tools</p>
                                </div>
                            </div>
                            <Icon name="ArrowRight" size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </motion.div>
                    </Link>
                </motion.div>

                <motion.div variants={item} className="glass-panel p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Icon name="Activity" size={14} className="text-cyan-400" /> Recent Activity
                        </h3>
                        <Link to="/ai-chat" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono uppercase tracking-wider">
                            Open <Icon name="ArrowRight" size={10} />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {recentChat.slice(0, 3).map((msg, i) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className={`p-2.5 rounded-lg border text-xs ${
                                    msg.type === "assistant"
                                        ? "bg-cyan-950/20 border-cyan-900/30 text-cyan-100"
                                        : "bg-white/5 border-white/5 text-gray-300"
                                }`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className={`text-[10px] font-mono uppercase ${msg.type === "assistant" ? "text-cyan-500" : "text-gray-500"}`}>{msg.type}</span>
                                    <span className="text-[10px] text-gray-600">{msg.at}</span>
                                </div>
                                <p className="line-clamp-1">{msg.text}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
