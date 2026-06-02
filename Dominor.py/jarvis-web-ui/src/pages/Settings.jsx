// Settings Page — connected to FastAPI /api/settings
// Redesigned with premium dark sci-fi design and framer-motion animations
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { getFunctions, api, API_ORIGIN } from "../utils/api";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

function SliderField({ label, value, onChange, min, max, unit }) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="space-y-2.5">
            <div className="flex justify-between items-center">
                <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{label}</label>
                <motion.span
                    key={value}
                    initial={{ scale: 0.85, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xs font-mono text-cyan-400 tabular-nums"
                >
                    {value} {unit}
                </motion.span>
            </div>
            <div className="relative h-2 bg-white/5 rounded-full overflow-visible">
                <motion.div
                    className="absolute top-0 left-0 h-full rounded-full"
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ background: "linear-gradient(90deg, #0089A8, #00D4FF)", boxShadow: "0 0 8px rgba(0,212,255,0.4)" }}
                />
                <input
                    type="range" min={min} max={max} step={min === 0 && max === 1 ? 0.05 : 1} value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                />
            </div>
        </div>
    );
}

export default function Settings() {
    const { apiStatus, checkStatus, t } = useOutletContext();
    const [functions, setFunctions] = useState([]);
    const [loading, setLoading] = useState({});
    const [settings, setSettings] = useState(null);
    const [voices, setVoices] = useState([]);
    const [ttsRate, setTtsRate] = useState(175);
    const [ttsVol, setTtsVol] = useState(1.0);
    const [wakeWord, setWakeWord] = useState("jarvis");
    const [asrLanguage, setAsrLanguage] = useState("en-US");
    const [saveMsg, setSaveMsg] = useState("");

    useEffect(() => {
        loadFunctions();
        loadSettings();
        loadVoices();
    }, []);

    const loadFunctions = async () => {
        setLoading(prev => ({ ...prev, functions: true }));
        try {
            const data = await getFunctions();
            setFunctions(data.functions || []);
        } catch {}
        setLoading(prev => ({ ...prev, functions: false }));
    };

    const loadSettings = async () => {
        try {
            const data = await api.getSettings();
            if (data && data.success) {
                setSettings(data);
                setTtsRate(data.settings?.tts_rate || 175);
                setTtsVol(data.settings?.tts_volume || 1.0);
                setWakeWord(data.settings?.wake_word || "jarvis");
                const lang = data.settings?.asr_language || "en-US";
                setAsrLanguage(lang);
                try {
                    localStorage.setItem("jarvis_web_stt_lang", lang);
                } catch (_) { }
            }
        } catch (e) { }
    };

    const loadVoices = async () => {
        try {
            const data = await api.listVoices();
            if (data && data.success) setVoices(data.voices || []);
        } catch (e) { }
    };

    const handleSaveVoice = async () => {
        setLoading(prev => ({ ...prev, save: true }));
        try {
            const result = await api.saveVoiceSettings(ttsRate, ttsVol, wakeWord, asrLanguage);
            if (result.success) {
                try {
                    localStorage.setItem("jarvis_web_stt_lang", asrLanguage);
                    localStorage.setItem("jarvis_web_wake_word", (wakeWord || "jarvis").trim().toLowerCase());
                } catch (_) { }
            }
            setSaveMsg(result.success ? "Saved successfully!" : (result.message || "Could not save settings."));
            setTimeout(() => setSaveMsg(""), 3000);
        } catch (e) {
            setSaveMsg("Could not save — is backend running?");
            setTimeout(() => setSaveMsg(""), 3000);
        }
        setLoading(prev => ({ ...prev, save: false }));
    };

    const handleRefreshStatus = async () => {
        setLoading(prev => ({ ...prev, status: true }));
        if (checkStatus) await checkStatus();
        await loadSettings();
        setLoading(prev => ({ ...prev, status: false }));
    };

    const tips = [
        ["Wake word",  "Say Hey Jarvis (or Hindi/Gujarati aliases) for desktop mic; web orb uses browser STT"],
        ["Languages",  "Set speech recognition to English, Hindi, or Gujarati, save, then use the voice orb"],
        ["Music",      "Type a song name or click a letter on the Music page"],
        ["Screenshot", "Click Take Screenshot on the Files page or say take screenshot"],
        ["Timers",     "Use preset buttons or enter a custom time"],
        ["AI Chat",    "Ask anything or use quick command buttons"],
        ["Files",      "Enter a filename to search your whole system"],
        ["Email",      "Fill out the form on the Communication page"],
        ["Volume",     "Use the slider on System Monitor page"],
        ["Web",        "Say open YouTube or Google search for ... or enter a URL on the System page"],
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-12">
            <motion.div variants={item}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-2">
                    <Icon name="Settings" size={13} /> Core Configuration
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{t?.("page.settings", "Settings") || "Settings"}</h1>
                <p className="text-muted-foreground text-sm mt-1">Adjust voice subsystems, verify endpoints, and personalize.</p>
            </motion.div>

            <AnimatePresence>
                {saveMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
                            saveMsg.startsWith("Saved")
                                ? "bg-green-950/30 border-green-500/25 text-green-300"
                                : "bg-red-950/30 border-red-500/25 text-red-300"
                        }`}
                    >
                        <Icon name="Check" size={16} className="shrink-0" /> {saveMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {/* Connection panel */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Icon name="Wifi" size={16} className="text-cyan-400" /> Connection Parameters
                    </h2>

                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-white">Backend Endpoints</span>
                            <span className="text-[10px] text-gray-500">FastAPI Server Address</span>
                        </div>
                        <code className="text-xs font-mono text-cyan-400">{API_ORIGIN}</code>
                    </div>

                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-white">Operational Link</span>
                            <span className="text-[10px] text-gray-500">Current status of connection</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                apiStatus === "online" ? "text-green-400 bg-green-400/8 border border-green-400/20" : "text-red-400 bg-red-400/8 border border-red-400/20"
                            }`}>
                                {apiStatus === "online" ? "✓ Online" : "✗ Offline"}
                            </span>
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="p-1.5 rounded bg-white/5 border border-white/8 hover:border-cyan-500/25 hover:text-cyan-400 transition-colors"
                                onClick={handleRefreshStatus}
                                disabled={loading.status}
                            >
                                <Icon name="Refresh" size={12} className={loading.status ? "animate-spin" : ""} />
                            </motion.button>
                        </div>
                    </div>

                    {settings?.status && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {[
                                { key: "tts_available", label: "Speech Synthesizer (TTS)" },
                                { key: "asr_available", label: "System Microphone" },
                                { key: "ai_available", label: "OpenAI GPT Module" },
                            ].map(({ key, label }) => (
                                <span
                                    key={key}
                                    className={`text-[10px] px-2 py-1 rounded bg-black/40 border font-mono ${
                                        settings.status[key]
                                            ? "text-green-400 border-green-500/20"
                                            : "text-red-400 border-red-500/20"
                                    }`}
                                >
                                    {settings.status[key] ? "●" : "○"} {label}
                                </span>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Voice presets */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Icon name="Mic" size={16} className="text-cyan-400" /> Voice &amp; TTS Settings
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Wake Word</label>
                            <input
                                type="text"
                                value={wakeWord}
                                onChange={e => setWakeWord(e.target.value)}
                                className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-2 text-sm focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Language Preset</label>
                            <select
                                value={asrLanguage}
                                onChange={(e) => setAsrLanguage(e.target.value)}
                                className="w-full bg-black/45 border border-white/8 rounded-xl px-4 py-2 text-sm text-white appearance-none cursor-pointer"
                            >
                                {(settings?.settings?.asr_language_presets &&
                                    Object.entries(settings.settings.asr_language_presets).map(([label, code]) => (
                                        <option key={code} value={code}>{label}</option>
                                    ))) || (
                                    <>
                                        <option value="en-US">English (US)</option>
                                        <option value="hi-IN">Hindi (India)</option>
                                        <option value="gu-IN">Gujarati (India)</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <SliderField label="Speech Rate" value={ttsRate} onChange={setTtsRate} min={100} max={300} unit="WPM" />
                    <SliderField label="TTS Volume" value={Math.round(ttsVol * 100)} onChange={(v) => setTtsVol(v / 100)} min={0} max={100} unit="%" />

                    {voices.length > 0 && (
                        <details className="text-xs border border-white/5 bg-black/20 rounded-xl overflow-hidden">
                            <summary className="p-3 text-gray-500 font-mono hover:text-white cursor-pointer select-none">Show installed speech voices ({voices.length})</summary>
                            <div className="p-3 border-t border-white/5 space-y-1 font-mono text-[10px] text-gray-400">
                                {voices.slice(0, 5).map((v, i) => (
                                    <div key={i}>{v.index !== undefined ? v.index : i}: {v.name}</div>
                                ))}
                            </div>
                        </details>
                    )}

                    <div className="flex gap-2 pt-2">
                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5"
                            onClick={handleSaveVoice}
                            disabled={loading.save}
                        >
                            <Icon name="Settings" size={13} />
                            {loading.save ? "Saving…" : "Save Voice Settings"}
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                            onClick={async () => {
                                setLoading(prev => ({ ...prev, testVoice: true }));
                                try { await api.testVoice(); } catch (e) { }
                                setLoading(prev => ({ ...prev, testVoice: false }));
                            }}
                            disabled={loading.testVoice}
                        >
                            <Icon name="Volume" size={13} className={loading.testVoice ? "animate-pulse" : ""} />
                            {loading.testVoice ? "Speaking…" : "Test Voice"}
                        </motion.button>
                    </div>
                </motion.div>

                {/* Available functions */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <Icon name="Layers" size={16} className="text-cyan-400" /> Operational APIs ({functions.length})
                        </h2>
                        <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="px-3 py-1.5 rounded-lg bg-white/4 border border-white/5 text-[10px] font-mono text-gray-400 hover:text-white"
                            onClick={loadFunctions}
                            disabled={loading.functions}
                        >
                            {loading.functions ? "Loading…" : "Reload"}
                        </motion.button>
                    </div>

                    {loading.functions ? (
                        <div className="py-8 text-center text-xs text-gray-500 font-mono">Loading operations...</div>
                    ) : functions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
                            {functions.map((fn, idx) => (
                                <div key={(fn.name || fn) + idx} className="p-3 rounded-xl border border-white/5 bg-white/4 flex flex-col justify-center min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0 mb-1">
                                        <code className="text-xs text-cyan-300 font-mono truncate">{fn.name || fn}</code>
                                        {fn.category && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/30 text-cyan-400/80 border border-cyan-500/10 uppercase tracking-widest font-mono scale-[0.9] origin-left">
                                                {fn.category}
                                            </span>
                                        )}
                                    </div>
                                    {fn.description && (
                                        <span className="text-[10px] text-gray-500 line-clamp-1 leading-relaxed">
                                            {fn.description}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-xs text-yellow-500/80 font-mono">No operational modules found. Make sure JARVIS backend is active.</div>
                    )}
                </motion.div>

                {/* Tips */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Icon name="Activity" size={16} className="text-cyan-400" /> Operating Manual &amp; Shortcuts
                    </h2>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-none">
                        {tips.map(([title, desc]) => (
                            <div key={title} className="p-3 rounded-xl bg-white/4 border border-white/5 text-xs">
                                <strong className="text-white block mb-0.5 font-mono">{title}</strong>
                                <span className="text-gray-500 leading-relaxed">{desc}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* About Panel */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <Icon name="AI" size={16} className="text-cyan-400" /> About J.A.R.V.I.S.
                    </h2>
                    <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                        {[
                            ["Version", "2.0.0"],
                            ["UI Stack", "React + Tailwind + Framer Motion"],
                            ["AI Core", "FastAPI Python Backend"],
                            ["Engine Mode", "Simulated AI Operating System"],
                            ["Wake Phrase", wakeWord ? `Hey ${wakeWord}` : "Hey Jarvis"],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{k}</span>
                                <span className="text-xs font-semibold text-gray-300">{v}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
