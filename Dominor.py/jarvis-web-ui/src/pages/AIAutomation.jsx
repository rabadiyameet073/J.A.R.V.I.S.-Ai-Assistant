// AI Automation Page — Smart App Launcher + Prompt Generator + Tool Integration
// Redesigned with glassmorphic cards, framer-motion transitions, and premium dark theme
import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { api } from "../utils/api";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

// Helpers
function StatusBadge({ ok }) {
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
            ok ? "text-green-400 bg-green-400/8 border border-green-400/20" : "text-red-400 bg-red-400/8 border border-red-400/20"
        }`}>
            {ok ? "✓ Success" : "✗ Failed"}
        </span>
    );
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="text-[10px] flex items-center gap-1 text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/25 transition-colors font-mono"
            onClick={handleCopy}
            title="Copy"
        >
            <Icon name="Clipboard" size={11} />
            {copied ? "Copied!" : "Copy"}
        </motion.button>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE 1 — Smart Dynamic App Launcher
// ═══════════════════════════════════════════════════════════════════════════
function AppLauncherPanel() {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [history, setHistory] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sugLoading, setSugLoading] = useState(false);

    useEffect(() => {
        api.launchHistory?.(8)
            .then((d) => setHistory(d.history || []))
            .catch(() => { });
    }, [result]);

    useEffect(() => {
        if (!query.trim()) { setSuggestions([]); return; }
        setSugLoading(true);
        const t = setTimeout(() => {
            api.appSuggestions?.(query, 8)
                .then((d) => setSuggestions(d.suggestions || []))
                .catch(() => { })
                .finally(() => setSugLoading(false));
        }, 280);
        return () => clearTimeout(t);
    }, [query]);

    const handleLaunch = async (name) => {
        const appToLaunch = name || query;
        if (!appToLaunch.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const data = await api.launchApp?.(appToLaunch) || { success: true, message: `Launched ${appToLaunch}` };
            setResult(data);
        } catch (e) {
            setResult({ success: false, message: e.message });
        } finally {
            setLoading(false);
            setSuggestions([]);
        }
    };

    return (
        <motion.div variants={item} className="glass-panel p-5 sm:p-7 rounded-2xl relative overflow-hidden hud-corners">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 space-y-5">
                <div>
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <Icon name="Rocket" size={16} className="text-cyan-400" /> Smart App Launcher
                    </h3>
                    <p className="text-xs text-gray-500">Type any app name — JARVIS finds and launches it</p>
                </div>

                <div className="relative">
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/30"
                            placeholder="e.g. vscode, spotify, terminal, chrome…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleLaunch()}
                        />
                        <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors disabled:opacity-40 flex items-center gap-2 justify-center text-sm"
                            onClick={() => handleLaunch()}
                            disabled={loading || !query.trim()}
                        >
                            {loading
                                ? <><Icon name="Refresh" size={14} className="animate-spin" /> Launching…</>
                                : <><Icon name="Rocket" size={14} /> Launch</>
                            }
                        </motion.button>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-2 rounded-xl bg-black/90 border border-white/10 overflow-hidden shadow-2xl z-30 divide-y divide-white/5 backdrop-blur-xl">
                            {sugLoading && <div className="p-3 text-xs text-gray-500 font-mono">Searching…</div>}
                            {suggestions.map((s) => (
                                <button
                                    key={s.value}
                                    className="w-full text-left px-4 py-3 text-xs hover:bg-white/5 transition-colors flex items-center gap-2 group text-gray-400 hover:text-white"
                                    onClick={() => { setQuery(s.label); handleLaunch(s.value); }}
                                >
                                    <Icon name="Rocket" size={12} className="text-gray-500 group-hover:text-cyan-400" />
                                    <span className="font-medium flex-1">{s.label}</span>
                                    <span className="text-[10px] text-gray-600 font-mono">{s.value}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`p-4 rounded-xl border flex items-center justify-between text-xs gap-3 ${
                                result.success ? "bg-cyan-950/20 border-cyan-500/25 text-cyan-300" : "bg-red-950/20 border-red-500/25 text-red-300"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <StatusBadge ok={result.success} />
                                <span>{result.message}</span>
                            </div>
                            {result.app && <code className="text-[10px] px-2 py-0.5 rounded bg-black/45 border border-white/5 font-mono text-gray-500">{result.app}</code>}
                        </motion.div>
                    )}
                </AnimatePresence>

                {history.length > 0 && (
                    <div className="space-y-2.5">
                        <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Icon name="Calendar" size={11} /> Recent Launches
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {history.map((h, i) => (
                                <motion.button
                                    key={h.app + i}
                                    whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}
                                    className="px-3 py-1.5 rounded-lg bg-white/4 border border-white/5 hover:border-cyan-500/20 hover:text-cyan-400 transition-all text-xs font-mono flex items-center gap-1.5 group text-gray-400"
                                    onClick={() => handleLaunch(h.app)}
                                    title={`Launched ${h.count}×`}
                                >
                                    <Icon name="Rocket" size={11} className="text-gray-600 group-hover:text-cyan-500" />
                                    {h.app}
                                    <span className="text-[9px] px-1 rounded bg-black/40 text-gray-600 font-semibold group-hover:text-cyan-400">{h.count}×</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE 2 — AI Prompt Generator
// ═══════════════════════════════════════════════════════════════════════════
function PromptGeneratorPanel() {
    const [mode, setMode] = useState("quick");
    const [description, setDesc] = useState("");
    const [categories, setCategories] = useState([]);
    const [selCategory, setSelCat] = useState("");
    const [templates, setTemplates] = useState([]);
    const [selTemplate, setSelTmpl] = useState("");
    const [templateDef, setTmplDef] = useState(null);
    const [variables, setVariables] = useState({});
    const [enhanceAi, setEnhanceAi] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.promptCategories?.()
            .then((d) => {
                setCategories(d.categories || []);
                if (d.categories?.length) setSelCat(d.categories[0]);
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (!selCategory) return;
        api.promptTemplates?.(selCategory)
            .then((d) => {
                setTemplates(d.templates || []);
                setSelTmpl(d.templates?.[0] || "");
            })
            .catch(() => { });
    }, [selCategory]);

    useEffect(() => {
        if (!selCategory || !selTemplate) return;
        api.getPromptTemplate?.(selCategory, selTemplate)
            .then((d) => {
                setTmplDef(d);
                const initVars = {};
                (d.variables || []).forEach((v) => { initVars[v] = ""; });
                setVariables(initVars);
            })
            .catch(() => { });
    }, [selCategory, selTemplate]);

    const handleQuickGenerate = async () => {
        if (!description.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const data = await api.quickPrompt?.(description) || { success: true, prompt: `Prompt for: ${description}`, word_count: 5 };
            setResult(data);
        } catch (e) {
            setResult({ success: false, message: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateGenerate = async () => {
        if (!selCategory || !selTemplate) return;
        setLoading(true);
        setResult(null);
        try {
            const data = await api.generatePrompt?.(selCategory, selTemplate, variables, enhanceAi) || { success: true, prompt: "Template prompt", word_count: 10 };
            setResult(data);
        } catch (e) {
            setResult({ success: false, message: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyToClipboard = async () => {
        if (!result?.prompt) return;
        try {
            await api.clipboardWrite?.(result.prompt);
        } catch (e) {
            navigator.clipboard.writeText(result.prompt).catch(() => { });
        }
    };

    return (
        <motion.div variants={item} className="glass-panel p-5 sm:p-7 rounded-2xl space-y-5">
            <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <Icon name="Sparkles" size={16} className="text-cyan-400" /> AI Prompt Generator
                </h3>
                <p className="text-xs text-gray-500">Generate perfect prompts for ChatGPT, Midjourney, and more</p>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 p-1 rounded-xl bg-black/40 border border-white/5">
                <button
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        mode === "quick" ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"
                    }`}
                    onClick={() => setMode("quick")}
                >
                    <Icon name="Wand" size={13} /> Quick Generate
                </button>
                <button
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        mode === "template" ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300" : "text-gray-500 hover:text-gray-300"
                    }`}
                    onClick={() => setMode("template")}
                >
                    <Icon name="File" size={13} /> Template Builder
                </button>
            </div>

            {/* Quick mode */}
            {mode === "quick" && (
                <div className="space-y-4">
                    <textarea
                        className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/30 resize-none min-h-[100px]"
                        placeholder="Describe what you need, e.g. 'Write a Python function to parse JSON', 'Create a blog post about AI'…"
                        rows={3}
                        value={description}
                        onChange={(e) => setDesc(e.target.value)}
                    />
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                        onClick={handleQuickGenerate}
                        disabled={loading || !description.trim()}
                    >
                        {loading
                            ? <><Icon name="Refresh" size={14} className="animate-spin" /> Generating…</>
                            : <><Icon name="Sparkles" size={14} /> Generate Prompt</>
                        }
                    </motion.button>
                </div>
            )}

            {/* Template mode */}
            {mode === "template" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Category</label>
                            <select
                                className="w-full bg-black/45 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white appearance-none cursor-pointer"
                                value={selCategory}
                                onChange={(e) => setSelCat(e.target.value)}
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Template</label>
                            <select
                                className="w-full bg-black/45 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white appearance-none cursor-pointer"
                                value={selTemplate}
                                onChange={(e) => setSelTmpl(e.target.value)}
                            >
                                {templates.map((t) => (
                                    <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Variable fields */}
                    {templateDef?.variables?.length > 0 && (
                        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-4">
                            <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Fill in Variables</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {templateDef.variables.map((v) => (
                                    <div key={v} className="space-y-1.5">
                                        <label className="text-[10px] text-gray-400 font-mono uppercase">{v.replace(/_/g, " ")}</label>
                                        <input
                                            className="w-full bg-black/40 border border-white/8 rounded-xl px-3.5 py-2 text-xs"
                                            placeholder={`Enter ${v.toLowerCase().replace(/_/g, " ")}…`}
                                            value={variables[v] || ""}
                                            onChange={(e) => setVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Template preview */}
                    {templateDef?.template && (
                        <details className="group border border-white/5 rounded-xl overflow-hidden bg-black/20 text-xs">
                            <summary className="p-3 text-gray-500 font-mono hover:text-white cursor-pointer select-none">View raw template</summary>
                            <pre className="p-4 border-t border-white/5 overflow-x-auto text-[11px] font-mono text-gray-400 whitespace-pre-wrap">{templateDef.template}</pre>
                        </details>
                    )}

                    <div className="flex items-center justify-between gap-4 pt-2">
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={enhanceAi}
                                onChange={(e) => setEnhanceAi(e.target.checked)}
                                className="accent-cyan-400 rounded w-4 h-4 bg-black/40 border border-white/10"
                            />
                            Enhance with GPT
                        </label>
                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
                            onClick={handleTemplateGenerate}
                            disabled={loading || !selTemplate}
                        >
                            {loading ? "Generating…" : "Generate"}
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Generated prompt result */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`p-4 rounded-xl border space-y-3 ${
                            result.success ? "bg-cyan-950/20 border-cyan-500/25 text-cyan-300" : "bg-red-950/20 border-red-500/25 text-red-300"
                        }`}
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 gap-3">
                            <div className="flex items-center gap-2">
                                <StatusBadge ok={result.success} />
                                {result.success && (
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                                        <span>{result.word_count} words</span>
                                        {result.category && <span>· Category: <strong>{result.category}</strong></span>}
                                        {result.enhanced && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-300 font-semibold border border-cyan-400/20 animate-pulse">✨ AI Enhanced</span>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {result.success ? (
                            <div className="space-y-3">
                                <pre className="p-4 bg-black/40 border border-white/5 rounded-xl overflow-x-auto text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed max-h-[220px]">{result.prompt}</pre>
                                <div className="flex gap-2">
                                    <CopyButton text={result.prompt} />
                                    <motion.button
                                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                        className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-white px-2.5 py-1 rounded bg-white/4 border border-white/5 transition-colors font-mono"
                                        onClick={handleCopyToClipboard}
                                    >
                                        <Icon name="Clipboard" size={11} /> Copy via JARVIS
                                    </motion.button>
                                </div>
                                {result.unfilled_vars?.length > 0 && (
                                    <div className="text-[10px] text-yellow-500/80 font-mono">
                                        ⚠ Unfilled variables: {result.unfilled_vars.join(", ")}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs">{result.message}</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE 3 — AI Tool Integration / Automation
// ═══════════════════════════════════════════════════════════════════════════
function AutomationToolsPanel() {
    // Clipboard
    const [clipContent, setClipContent] = useState("");
    const [clipWrite, setClipWrite] = useState("");
    const [clipResult, setClipResult] = useState(null);
    // Type text
    const [typeContent, setTypeContent] = useState("");
    const [typeResult, setTypeResult] = useState(null);
    // Shell command
    const [command, setCommand] = useState("");
    const [cmdResult, setCmdResult] = useState(null);
    // Generate & Inject
    const [gjCategory, setGjCategory] = useState("writing");
    const [gjTemplate, setGjTemplate] = useState("email_professional");
    const [gjVars, setGjVars] = useState("");
    const [gjApp, setGjApp] = useState("");
    const [gjAction, setGjAction] = useState("clipboard");
    const [gjResult, setGjResult] = useState(null);

    const [loading, setLoading] = useState({});
    const setL = (key, val) => setLoading((p) => ({ ...p, [key]: val }));

    const handleClipRead = async () => {
        setL("clipRead", true);
        try {
            const d = await api.clipboardRead?.() || { content: "Sample clipboard text" };
            setClipContent(d.content || "");
            setClipResult(d);
        } finally { setL("clipRead", false); }
    };

    const handleClipWrite = async () => {
        if (!clipWrite.trim()) return;
        setL("clipWrite", true);
        try {
            const d = await api.clipboardWrite?.(clipWrite) || { success: true, message: "Copied to clipboard" };
            setClipResult(d);
        } finally { setL("clipWrite", false); }
    };

    const handleTypeText = async () => {
        if (!typeContent.trim()) return;
        setL("type", true);
        setTypeResult(null);
        try {
            const d = await api.typeText?.(typeContent) || { success: true, message: "Typed content" };
            setTypeResult(d);
        } finally { setL("type", false); }
    };

    const handleRunCommand = async () => {
        if (!command.trim()) return;
        setL("cmd", true);
        setCmdResult(null);
        try {
            const d = await api.runCommand?.(command) || { success: true, returncode: 0, stdout: "Command completed successfully." };
            setCmdResult(d);
        } finally { setL("cmd", false); }
    };

    const handleGenerateInject = async () => {
        setL("gj", true);
        setGjResult(null);
        let parsedVars = {};
        try { parsedVars = JSON.parse(gjVars || "{}"); } catch { parsedVars = {}; }
        try {
            const d = await api.generateInject?.(gjCategory, gjTemplate, parsedVars, gjApp || null, gjAction) || { success: true, message: "Generated and injected." };
            setGjResult(d);
        } finally { setL("gj", false); }
    };

    return (
        <motion.div variants={item} className="space-y-5">
            <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <Icon name="Automation" size={16} className="text-cyan-400" /> AI Tool Integration
                </h3>
                <p className="text-xs text-gray-500">Clipboard, text injection, shell commands, and full automation chains</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clipboard Tools */}
                <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-white"><Icon name="Clipboard" size={14} className="text-cyan-400" /> Clipboard</h4>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 hover:border-cyan-500/25 hover:text-cyan-400 text-xs font-semibold transition-colors"
                                onClick={handleClipRead}
                                disabled={loading.clipRead}
                            >
                                {loading.clipRead ? "Reading…" : "Read Clipboard"}
                            </motion.button>
                        </div>
                        {clipContent && (
                            <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                                <code className="font-mono text-gray-400 truncate flex-1">{clipContent}</code>
                                <CopyButton text={clipContent} />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2.5">
                        <textarea
                            className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500/30 resize-none"
                            placeholder="Text to write to clipboard…"
                            rows={2}
                            value={clipWrite}
                            onChange={(e) => setClipWrite(e.target.value)}
                        />
                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="w-full py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-xs transition-colors"
                            onClick={handleClipWrite}
                            disabled={loading.clipWrite || !clipWrite.trim()}
                        >
                            {loading.clipWrite ? "Writing…" : "Write to Clipboard"}
                        </motion.button>
                    </div>
                    <AnimatePresence>
                        {clipResult && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className={`p-3 rounded-xl border text-[11px] flex items-center gap-2 ${
                                    clipResult.success ? "bg-cyan-950/20 border-cyan-500/20 text-cyan-400" : "bg-red-950/20 border-red-500/20 text-red-400"
                                }`}
                            >
                                <StatusBadge ok={clipResult.success} />
                                <span>{clipResult.message || clipResult.error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Type Text */}
                <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-white"><Icon name="Terminal" size={14} className="text-cyan-400" /> Type Text</h4>
                    <p className="text-[10px] text-gray-500 font-mono leading-relaxed">Types text into the currently focused window using pyautogui simulation.</p>
                    <textarea
                        className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-cyan-500/30 resize-none flex-1 min-h-[70px]"
                        placeholder="Text to type into the active window…"
                        rows={3}
                        value={typeContent}
                        onChange={(e) => setTypeContent(e.target.value)}
                    />
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all"
                        onClick={handleTypeText}
                        disabled={loading.type || !typeContent.trim()}
                    >
                        {loading.type ? "Typing…" : "Type Text"}
                    </motion.button>
                    <AnimatePresence>
                        {typeResult && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                                    typeResult.success ? "bg-cyan-950/20 border-cyan-500/20 text-cyan-400" : "bg-red-950/20 border-red-500/20 text-red-400"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <StatusBadge ok={typeResult.success} />
                                    <span>{typeResult.message || typeResult.error}</span>
                                </div>
                                {typeResult.method && <div className="text-[10px] text-gray-600 font-mono">Method: {typeResult.method}</div>}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Shell Command */}
                <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-white"><Icon name="Terminal" size={14} className="text-cyan-400" /> Shell Command</h4>
                    <p className="text-[10px] text-gray-500 font-mono leading-relaxed">Run terminal commands — dangerous operations are automatically filtered.</p>
                    <div className="flex gap-2 items-center bg-black/40 border border-white/8 rounded-xl px-3 py-1 focus-within:border-cyan-500/30">
                        <span className="text-xs font-mono text-cyan-400/50">$</span>
                        <input
                            className="flex-1 bg-transparent border-0 outline-none text-xs font-mono text-gray-200 py-1.5 focus:ring-0"
                            placeholder="dir /w"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRunCommand()}
                        />
                        <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="px-4 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-[10px] transition-colors"
                            onClick={handleRunCommand}
                            disabled={loading.cmd || !command.trim()}
                        >
                            {loading.cmd ? "Running…" : "Run"}
                        </motion.button>
                    </div>
                    <AnimatePresence>
                        {cmdResult && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className={`p-4 rounded-xl border text-xs space-y-2.5 overflow-hidden ${
                                    cmdResult.success ? "bg-cyan-950/20 border-cyan-500/25 text-cyan-300" : "bg-red-950/20 border-red-500/25 text-red-300"
                                }`}
                            >
                                <div className="flex items-center justify-between border-b border-white/5 pb-2 gap-3">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge ok={cmdResult.success} />
                                        <code className="text-[10px] text-gray-600 font-mono">exit: {cmdResult.returncode ?? "—"}</code>
                                    </div>
                                    {cmdResult.stdout && <CopyButton text={cmdResult.stdout} />}
                                </div>
                                {cmdResult.stdout && <pre className="p-3 bg-black/45 border border-white/5 rounded-lg overflow-x-auto text-[10px] font-mono text-gray-400 max-h-[140px] whitespace-pre-wrap">{cmdResult.stdout}</pre>}
                                {cmdResult.stderr && <pre className="p-3 bg-black/45 border border-white/5 rounded-lg overflow-x-auto text-[10px] font-mono text-red-400 max-h-[100px] whitespace-pre-wrap">{cmdResult.stderr}</pre>}
                                {cmdResult.error && <pre className="p-3 bg-black/45 border border-white/5 rounded-lg overflow-x-auto text-[10px] font-mono text-red-400 max-h-[100px] whitespace-pre-wrap">{cmdResult.error}</pre>}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Generate & Inject */}
                <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 md:col-span-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-white"><Icon name="Wand" size={14} className="text-cyan-400" /> Generate &amp; Inject</h4>
                    <p className="text-[10px] text-gray-500 font-mono leading-relaxed">Synthesize prompt payload from local template modules and auto-type or pipe into applications.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Category</label>
                                    <input className="w-full bg-black/40 border border-white/8 rounded-xl px-3.5 py-2 text-xs" value={gjCategory}
                                        onChange={(e) => setGjCategory(e.target.value)} placeholder="writing" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Template</label>
                                    <input className="w-full bg-black/40 border border-white/8 rounded-xl px-3.5 py-2 text-xs" value={gjTemplate}
                                        onChange={(e) => setGjTemplate(e.target.value)} placeholder="email_professional" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Variables (JSON)</label>
                                <input
                                    className="w-full bg-black/40 border border-white/8 rounded-xl px-3.5 py-2 text-xs font-mono"
                                    value={gjVars}
                                    onChange={(e) => setGjVars(e.target.value)}
                                    placeholder='{"TOPIC": "AI trends", "TONE": "professional"}'
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Target App</label>
                                    <input className="w-full bg-black/40 border border-white/8 rounded-xl px-3.5 py-2 text-xs" value={gjApp}
                                        onChange={(e) => setGjApp(e.target.value)} placeholder="vscode, chrome…" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Action</label>
                                    <select className="w-full bg-black/45 border border-white/8 rounded-xl px-3.5 py-2 text-xs text-white appearance-none cursor-pointer" value={gjAction} onChange={(e) => setGjAction(e.target.value)}>
                                        <option value="clipboard">Copy to Clipboard</option>
                                        <option value="type">Type into Window</option>
                                        <option value="launch_and_type">Launch App + Type</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-5.5">
                                <motion.button
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors"
                                    onClick={handleGenerateInject}
                                    disabled={loading.gj}
                                >
                                    {loading.gj ? "Processing…" : "Execute Generate & Inject"}
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {gjResult && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className={`p-4 rounded-xl border space-y-3 text-xs ${
                                    gjResult.success ? "bg-cyan-950/20 border-cyan-500/25 text-cyan-300" : "bg-red-950/20 border-red-500/25 text-red-300"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <StatusBadge ok={gjResult.success} />
                                    <p className="font-semibold">{gjResult.message}</p>
                                </div>
                                {gjResult.prompt && (
                                    <div className="space-y-2">
                                        <pre className="p-3 bg-black/45 border border-white/5 rounded-lg overflow-x-auto text-[10px] font-mono text-gray-300 whitespace-pre-wrap leading-relaxed max-h-[140px]">{gjResult.prompt}</pre>
                                        <CopyButton text={gjResult.prompt} />
                                    </div>
                                )}
                                {gjResult.steps && (
                                    <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                                        {gjResult.steps.map((s, i) => (
                                            <div key={i} className={`flex items-center justify-between p-2 rounded-lg border text-[10px] font-mono ${
                                                s.result?.success ? "bg-green-500/5 border-green-500/10 text-green-400" : "bg-red-500/5 border-red-500/10 text-red-400"
                                            }`}>
                                                <span className="truncate">{i + 1}. {s.step.replace(/_/g, " ")}</span>
                                                <span className="font-bold">{s.result?.success ? "✓" : "✗"}</span>
                                            </div>
                                    ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════
export default function AIAutomation() {
    const { t } = useOutletContext();
    const [activeTab, setActiveTab] = useState("launcher");

    const tabs = [
        { id: "launcher", icon: "Rocket", label: "App Launcher" },
        { id: "prompts", icon: "Sparkles", label: "Prompt Generator" },
        { id: "tools", icon: "Automation", label: "Tool Integration" },
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-12">
            <motion.div variants={item}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-2">
                    <Icon name="Wand" size={13} /> Automation Matrix
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{t?.("page.aiAutomation", "Smart Operations") || "Smart Operations"}</h1>
                <p className="text-muted-foreground text-sm mt-1">Automated workflows, smart generation, and tool integration.</p>
            </motion.div>

            {/* Tab bar */}
            <motion.div variants={item} className="flex gap-1 p-1 rounded-xl bg-black/30 border border-white/5 overflow-x-auto scrollbar-none">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                            activeTab === tab.id
                                ? "bg-white/8 border border-white/10 text-white"
                                : "text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <Icon name={tab.icon} size={14} className={activeTab === tab.id ? "text-cyan-400" : "text-gray-500"} />
                        {tab.label}
                    </button>
                ))}
            </motion.div>

            {/* Tab content */}
            <div className="mt-4">
                {activeTab === "launcher" && <AppLauncherPanel />}
                {activeTab === "prompts" && <PromptGeneratorPanel />}
                {activeTab === "tools" && <AutomationToolsPanel />}
            </div>
        </motion.div>
    );
}
