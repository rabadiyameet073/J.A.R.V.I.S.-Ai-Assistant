// System page — New JARVIS AI OS Design
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { mockSystemInfo, mockNetworkInfo } from "../utils/mockData";
import { api } from "../utils/api";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

function GaugeBar({ value, color = "#00D4FF", label }) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
                <span className="font-mono text-gray-500 uppercase tracking-wider">{label}</span>
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono font-semibold" style={{ color }}>{value}%</motion.span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}40` }} />
            </div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 gap-4">
            <span className="text-xs font-mono text-gray-500 uppercase shrink-0">{label}</span>
            <span className="text-xs font-medium text-gray-200 text-right truncate">{value}</span>
        </div>
    );
}

const POWER = [
    { name: "Lock", icon: "Lock", color: "#3b82f6", desc: "Lock screen" },
    { name: "Sleep", icon: "Sleep", color: "#8b5cf6", desc: "Hibernate" },
    { name: "Restart", icon: "Restart", color: "#f59e0b", desc: "Reboot" },
    { name: "Shutdown", icon: "Power", color: "#ef4444", desc: "Power off" },
];

const APPS = [
    { name: "Chrome", color: "#4285F4", icon: "Globe" },
    { name: "VS Code", color: "#007ACC", icon: "Terminal" },
    { name: "Terminal", color: "#F0C14B", icon: "Command" },
    { name: "Spotify", color: "#1DB954", icon: "Music" },
    { name: "Slack", color: "#4A154B", icon: "MessageSquare" },
    { name: "Explorer", color: "#6366f1", icon: "Files" },
];

export default function System() {
    const ctx = useOutletContext();
    const [vol, setVol] = useState(50);
    const [appInput, setAppInput] = useState("");
    const [urlInput, setUrlInput] = useState("");
    const [result, setResult] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [sysInfo, setSysInfo] = useState(mockSystemInfo);
    const [netInfo, setNetInfo] = useState(mockNetworkInfo);

    useEffect(() => {
        const updateStats = async () => {
            try {
                const info = await api.systemInfo();
                if (info && info.success !== false) {
                    const data = info.data || info;
                    setSysInfo(data);
                }
            } catch (e) {
                console.error("System info fetch failed", e);
            }

            try {
                const net = await api.network();
                if (net && net.success) {
                    setNetInfo(net);
                }
            } catch (e) {
                console.error("Network info fetch failed", e);
            }
        };

        updateStats();
        const iv = setInterval(updateStats, 4000);
        return () => clearInterval(iv);
    }, []);

    const execute = (msg) => {
        setResult(msg);
        setConfirm(null);
        setTimeout(() => setResult(null), 4500);
    };

    const handleVolumeChange = (e) => {
        const newVol = Number(e.target.value);
        setVol(newVol);
        api.volumeControl("set", newVol).catch(() => {});
    };

    const handleLaunchApp = async (appName) => {
        if (!appName) return;
        execute(`Launching: ${appName}...`);
        try {
            const res = await api.openApp(appName);
            if (res.success) {
                execute(res.message || `Launched: ${appName}`);
            } else {
                execute(`Launch error: ${res.message}`, "error");
            }
        } catch (e) {
            execute(`Network error: ${e.message}`, "error");
        }
        setAppInput("");
    };

    const handleOpenWebsite = async (site) => {
        if (!site) return;
        execute(`Navigating to: ${site}...`);
        try {
            const res = await api.openWebsite(site);
            if (res.success) {
                execute(res.message || `Opened: ${site}`);
            } else {
                execute(`Navigation error: ${res.message}`, "error");
            }
        } catch (e) {
            execute(`Network error: ${e.message}`, "error");
        }
        setUrlInput("");
    };

    const handlePowerAction = async (actionName) => {
        const action = actionName.toLowerCase();
        execute(`${actionName} sequence initiated.`);
        try {
            const res = await api.powerControl(action);
            execute(res.message || `${actionName} command completed.`);
        } catch (e) {
            execute(`Error executing power command: ${e.message}`);
        }
        setConfirm(null);
    };

    const isConnected = netInfo.connected ?? netInfo.internet_connected ?? true;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-12">
            <motion.div variants={item}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-2">
                    <Icon name="Cpu" size={13} /> Core Command
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">System Monitor</h1>
                <p className="text-muted-foreground text-sm mt-1">Diagnostics, power control, and fast execution.</p>
            </motion.div>

            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/25 text-cyan-300 flex items-center gap-3 text-sm">
                        <Icon name="Check" size={16} className="text-cyan-400 shrink-0" /> {result}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {confirm && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                        className="p-4 rounded-xl bg-red-950/20 border border-red-500/25 flex items-center justify-between gap-4">
                        <span className="text-sm text-red-300">Execute <span className="font-semibold">{confirm}</span>?</span>
                        <div className="flex gap-2">
                            <button onClick={() => handlePowerAction(confirm)} className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-colors">Confirm</button>
                            <button onClick={() => setConfirm(null)} className="px-4 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-gray-300 text-xs transition-colors">Cancel</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {/* Hardware */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl space-y-5">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Icon name="Cpu" size={16} className="text-cyan-400" /> Hardware Diagnostics
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "CPU Load", value: Math.round(sysInfo.cpu_percent ?? 0), color: (sysInfo.cpu_percent ?? 0) > 70 ? "#ef4444" : "#00D4FF" },
                            { label: "Memory", value: Math.round(sysInfo.ram_percent ?? 0), color: (sysInfo.ram_percent ?? 0) > 80 ? "#f59e0b" : "#00D4FF" },
                            { label: "Storage", value: Math.round(sysInfo.disk_percent ?? 0), color: "#8b5cf6" },
                            { label: "Battery", value: Math.round(sysInfo.battery_percent ?? 100), color: "#22c55e" },
                        ].map(stat => (
                            <motion.div key={stat.label} whileHover={{ scale: 1.02 }} className="p-3.5 rounded-xl bg-white/4 border border-white/5">
                                <div className="text-[10px] text-gray-500 uppercase font-mono mb-1.5">{stat.label}</div>
                                <motion.div key={stat.value} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="text-xl font-light mb-2 tabular-nums" style={{ color: stat.color }}>{stat.value}%</motion.div>
                                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                                    <motion.div animate={{ width: `${stat.value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={{ background: stat.color, boxShadow: `0 0 6px ${stat.color}60` }} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <GaugeBar value={Math.round(sysInfo.cpu_percent ?? 0)} label="CPU Detailed" />
                    <GaugeBar value={Math.round(sysInfo.ram_percent ?? 0)} label="RAM Usage" color="#8b5cf6" />
                    <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                        <InfoRow label="Platform" value={sysInfo.platform ?? "Windows"} />
                        <InfoRow label="Processor" value={sysInfo.cpu_name || sysInfo.processor || "Unknown CPU"} />
                        <InfoRow label="Total RAM" value={sysInfo.ram_total || "—"} />
                        <InfoRow label="Storage" value={sysInfo.disk_total || "—"} />
                        <InfoRow label="Hostname" value={sysInfo.hostname || "JARVIS-MAIN"} />
                    </div>
                </motion.div>

                {/* Right column */}
                <div className="space-y-4">
                    {/* Network */}
                    <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <Icon name="Globe" size={16} className="text-cyan-400" /> Network Uplink
                        </h2>
                        <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl ${isConnected ? "bg-green-500/8 border-green-500/20 text-green-400" : "bg-red-500/8 border-red-500/20 text-red-400"}`}>
                            <div className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className={`status-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                            </div>
                            <span className="text-xs font-medium">{isConnected ? "Internet — Secure Connection Active" : "Internet — Offline"}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                            <InfoRow label="Local IP" value={netInfo.local_ip || sysInfo.local_ip || "—"} />
                            <InfoRow label="Public IP" value={netInfo.public_ip || "Unavailable"} />
                            <InfoRow label="Hostname" value={netInfo.hostname || sysInfo.hostname || "—"} />
                        </div>
                    </motion.div>

                    {/* Power */}
                    <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <Icon name="Power" size={16} className="text-cyan-400" /> Power Control
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {POWER.map(p => (
                                <motion.button key={p.name} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                                    onClick={() => p.name === "Shutdown" || p.name === "Restart" ? setConfirm(p.name) : handlePowerAction(p.name)}
                                    className="p-3.5 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 transition-colors flex flex-col items-center gap-2">
                                    <Icon name={p.icon} size={18} style={{ color: p.color }} />
                                    <span className="text-[11px] font-medium text-gray-400">{p.name}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Volume */}
                    <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <Icon name="Volume" size={16} className="text-cyan-400" /> Output Volume
                        </h2>
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-black/30 border border-white/5">
                            <Icon name="Volume" size={18} className="text-gray-400 shrink-0" />
                            <input type="range" min="0" max="100" value={vol} onChange={handleVolumeChange} className="flex-1 accent-cyan-400" />
                            <span className="text-sm font-mono text-cyan-400 w-9 text-right tabular-nums">{vol}%</span>
                        </div>
                    </motion.div>
                </div>

                {/* Launcher */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <Icon name="Rocket" size={16} className="text-cyan-400" /> App Launcher
                    </h2>
                    <div className="flex gap-2 mb-4">
                        <input type="text" placeholder="Application name..." value={appInput} onChange={e => setAppInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && appInput && handleLaunchApp(appInput)}
                            className="flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm" />
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => appInput && handleLaunchApp(appInput)}
                            className="px-5 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors text-sm font-medium text-cyan-300">
                            Launch
                        </motion.button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {APPS.map(a => (
                            <motion.button key={a.name} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                                onClick={() => handleLaunchApp(a.name.toLowerCase())}
                                className="p-3 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 flex flex-col items-center gap-1.5 transition-colors">
                                <Icon name={a.icon} size={18} style={{ color: a.color }} />
                                <span className="text-[10px] font-medium text-gray-400">{a.name}</span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* Web Terminal */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl">
                    <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <Icon name="Globe" size={16} className="text-cyan-400" /> Web Terminal
                    </h2>
                    <div className="flex gap-2">
                        <input type="url" placeholder="https://example.com" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && urlInput && handleOpenWebsite(urlInput)}
                            className="flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm font-mono" />
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => urlInput && handleOpenWebsite(urlInput)}
                            className="px-5 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 transition-colors text-sm font-medium">Open</motion.button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {["github.com", "google.com", "openai.com"].map(url => (
                            <button key={url} onClick={() => handleOpenWebsite(url)}
                                className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-gray-400 hover:text-white hover:border-cyan-500/25 transition-colors font-mono">{url}</button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
