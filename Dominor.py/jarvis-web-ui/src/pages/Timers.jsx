// Timers page — New JARVIS AI OS Design
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { api } from "../utils/api";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

function TimerRing({ remaining, total }) {
    const r = 38;
    const circ = 2 * Math.PI * r;
    const pct = total > 0 ? remaining / total : 0;
    const dash = pct * circ;
    return (
        <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <motion.circle cx="50" cy="50" r={r} fill="none" stroke="#00D4FF" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`} initial={{ strokeDasharray: `0 ${circ}` }}
                animate={{ strokeDasharray: `${dash} ${circ}` }} transition={{ duration: 0.5 }}
                style={{ filter: "drop-shadow(0 0 6px rgba(0,212,255,0.5))" }} />
        </svg>
    );
}

export default function Timers() {
    const ctx = useOutletContext();
    const [min, setMin] = useState(5);
    const [sec, setSec] = useState(0);
    const [calc, setCalc] = useState("");
    const [calcRes, setCalcRes] = useState(null);
    const [timers, setTimers] = useState([]);
    const [result, setResult] = useState(null);
    const [time, setTime] = useState({ h: "", m: "", s: "", date: "" });
    const [cityInput, setCityInput] = useState("");
    const [weather, setWeather] = useState(null);

    // Fetch active timers from backend
    const fetchTimers = async () => {
        try {
            const res = await api.listTimers();
            if (res && res.success && res.timers) {
                // Map backend timers to display structure
                const active = res.timers
                    .filter(t => !t.cancelled && !t.finished)
                    .map(t => ({
                        id: t.id,
                        label: t.label || `Timer (${Math.round(t.duration_secs)}s)`,
                        remaining: Math.round(t.remaining_secs),
                        total: t.duration_secs
                    }));
                setTimers(active);
            }
        } catch (e) {
            console.error("Failed to load timers from backend", e);
        }
    };

    // Initialize clock and timers sync
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setTime({
                h: String(now.getHours()).padStart(2, "0"),
                m: String(now.getMinutes()).padStart(2, "0"),
                s: String(now.getSeconds()).padStart(2, "0"),
                date: now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
            });
        };
        tick();
        const clockIv = setInterval(tick, 1000);

        // Fetch initially and sync every 3 seconds
        fetchTimers();
        const syncIv = setInterval(fetchTimers, 3000);

        // Smooth second-by-second countdown decrement for immediate UI updates
        const countdownIv = setInterval(() => {
            setTimers(prev =>
                prev.map(t => ({ ...t, remaining: Math.max(0, t.remaining - 1) }))
                    .filter(t => t.remaining > 0)
            );
        }, 1000);

        return () => {
            clearInterval(clockIv);
            clearInterval(syncIv);
            clearInterval(countdownIv);
        };
    }, []);

    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const execute = (msg) => { setResult(msg); setTimeout(() => setResult(null), 5000); };

    const handleStartTimer = async () => {
        const total = min * 60 + sec;
        if (total <= 0) return;
        const durationString = `${total} seconds`;
        const label = min > 0 ? `${min}m ${sec > 0 ? sec + "s" : ""}`.trim() : `${sec}s`;
        
        execute(`Starting countdown: ${label}...`);
        try {
            const res = await api.setTimer(durationString, label);
            if (res && res.success) {
                execute(res.message || `Timer scheduled for ${label}.`);
                fetchTimers();
            } else {
                execute(res.message || "Failed to set timer.");
            }
        } catch (e) {
            execute(`Network error: ${e.message}`);
        }
    };

    const handleCancelTimer = async (id, label) => {
        execute(`Cancelling timer: ${label}...`);
        try {
            const res = await api.cancelTimer(id);
            if (res && res.success) {
                execute(res.message || `Timer ${label} cancelled successfully.`);
                fetchTimers();
            } else {
                execute(res.message || "Failed to cancel timer.");
            }
        } catch (e) {
            execute(`Network error: ${e.message}`);
        }
    };

    const handleCalc = async () => {
        if (!calc) return;
        try {
            const res = await api.calculate(calc);
            if (res && res.success) {
                setCalcRes(res.answer || String(res.result));
            } else {
                setCalcRes(res.message || "Computation error");
            }
        } catch (e) {
            setCalcRes("Network error");
        }
    };

    const handleWeatherScan = async () => {
        execute(`Scanning environment stats for "${cityInput || "local area"}"...`);
        try {
            const res = await api.weather(cityInput, 1);
            if (res && res.success) {
                setWeather(res.message || res.summary || "Scan complete.");
                setCityInput("");
            } else {
                setWeather("Environment scan failed.");
            }
        } catch (e) {
            setWeather(`Scan error: ${e.message}`);
        }
    };

    const handleMotivationRequest = async () => {
        execute("Querying AI Core for motivational quotes...");
        try {
            const res = await api.aiQuote();
            if (res && res.success) {
                execute(res.message || res.response);
            } else {
                execute("Keep pushing forward, sir.");
            }
        } catch (e) {
            execute("Discipline overrides motivation, sir. Keep working.");
        }
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-12">
            <motion.div variants={item}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-2">
                    <Icon name="Timer" size={13} /> Chrono Systems
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Time & Calculations</h1>
                <p className="text-muted-foreground text-sm mt-1">Chronometrics, scheduling, and numeric processing.</p>
            </motion.div>

            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/25 text-cyan-300 flex items-center gap-3 text-sm">
                        <Icon name="Check" size={16} className="shrink-0" /> {result}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Live Clock */}
            <motion.div variants={item} className="glass-panel p-6 sm:p-8 rounded-2xl text-center hud-corners relative overflow-hidden">
                <div className="absolute inset-0 bg-grid opacity-15" />
                <div className="relative z-10">
                    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2">
                        {[time.h, time.m, time.s].map((unit, i) => (
                            <div key={i} className="flex items-center gap-1 sm:gap-2">
                                <motion.div key={unit} initial={{ opacity: 0.5, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    className="text-5xl sm:text-7xl font-black font-mono tabular-nums text-white"
                                    style={{ textShadow: "0 0 30px rgba(0,212,255,0.2)" }}>{unit}</motion.div>
                                {i < 2 && <span className="text-4xl sm:text-6xl font-thin text-cyan-400/40 mb-1 animate-pulse">:</span>}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">{time.date}</p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {/* Timer Controls */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl space-y-5">
                    <h2 className="text-base font-semibold flex items-center gap-2"><Icon name="Alarm" size={16} className="text-cyan-400" /> Countdown Timer</h2>
                    <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Minutes</label>
                            <input type="number" min="0" value={min} onChange={e => setMin(Number(e.target.value))} className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-center text-2xl font-light tabular-nums focus:outline-none" />
                        </div>
                        <div className="flex items-end pb-3 text-3xl font-thin text-cyan-400/40">:</div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Seconds</label>
                            <input type="number" min="0" max="59" value={sec} onChange={e => setSec(Number(e.target.value))} className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-center text-2xl font-light tabular-nums focus:outline-none" />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[1, 5, 10, 15, 30, 60].map(m => (
                            <motion.button key={m} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => { setMin(m); setSec(0); }}
                                className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-colors ${min === m && sec === 0 ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300" : "border-white/8 bg-white/4 text-gray-400 hover:border-cyan-500/25 hover:text-cyan-400"}`}>{m}m</motion.button>
                        ))}
                    </div>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleStartTimer}
                        className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors flex items-center justify-center gap-2">
                        <Icon name="Play" size={18} /> Start Timer
                    </motion.button>

                    <AnimatePresence>
                        {timers.length > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-white/8 pt-4 space-y-3">
                                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Active Timers</div>
                                {timers.map(t => (
                                    <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                        className="flex items-center justify-between gap-4 p-3 bg-white/4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <TimerRing remaining={t.remaining} total={t.total} />
                                            <div>
                                                <div className="text-[10px] text-gray-500 uppercase font-mono">{t.label}</div>
                                                <div className="text-2xl font-mono font-light text-cyan-400 tabular-nums">{fmt(t.remaining)}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleCancelTimer(t.id, t.label)} className="text-gray-600 hover:text-red-400 transition-colors">
                                            <Icon name="Close" size={16} />
                                        </button>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Right Column */}
                <div className="space-y-4">
                    {/* Calculator */}
                    <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Icon name="Calculator" size={16} className="text-cyan-400" /> Compute Node</h2>
                        <div className="flex gap-2 mb-3">
                            <input type="text" placeholder="e.g. 25 * 4 + 10 / 2 or 50 percent of 120" value={calc} onChange={e => setCalc(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleCalc()} className="flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 font-mono text-sm focus:outline-none" />
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCalc}
                                className="px-5 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 text-cyan-300 font-mono font-bold transition-colors">=</motion.button>
                        </div>
                        <AnimatePresence>
                            {calcRes && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-4 bg-cyan-950/20 border border-cyan-900/30 rounded-xl flex justify-between items-center">
                                    <span className="text-[10px] text-gray-500 font-mono uppercase">RESULT</span>
                                    <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-2xl font-mono text-cyan-400 font-light"
                                        style={{ textShadow: "0 0 10px rgba(0,212,255,0.4)" }}>{calcRes}</motion.span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="grid grid-cols-4 gap-1.5 mt-3">
                            {["%", "×", "÷", "−", "7","8","9","4","5","6","1","2","3","0",".","+"].map(k => (
                                <button key={k} onClick={() => { const map = {"×":"*","÷":"/","−":"-","%":"%"}; setCalc(c => c + (map[k] || k)); }}
                                    className="py-2 rounded-lg bg-white/4 border border-white/5 hover:bg-white/8 text-xs font-mono text-gray-300 transition-colors">{k}</button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Weather */}
                    <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Icon name="Weather" size={16} className="text-cyan-400" /> Environmental Scan</h2>
                        <div className="flex gap-2 mb-3">
                            <input type="text" placeholder="City name..." value={cityInput} onChange={e => setCityInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleWeatherScan()}
                                className="flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={handleWeatherScan}
                                className="px-5 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 text-sm font-medium transition-colors">Scan</motion.button>
                        </div>
                        <AnimatePresence>
                            {weather && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-blue-300 text-sm flex items-center gap-3">
                                    <Icon name="Weather" size={20} className="text-blue-400 shrink-0" />
                                    <span className="font-mono text-xs leading-relaxed">{weather}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Motivation */}
                    <motion.div variants={item} className="glass-panel p-5 rounded-2xl">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={handleMotivationRequest}
                            className="w-full py-3 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 transition-colors text-sm font-medium text-white flex items-center justify-center gap-2">
                            <Icon name="Quote" size={16} className="text-cyan-400" /> Request Motivation
                        </motion.button>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
