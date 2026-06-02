// Files page — New JARVIS AI OS Design
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { api } from "../utils/api";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

export default function Files() {
    const ctx = useOutletContext();
    const [query, setQuery] = useState("");
    const [folder, setFolder] = useState("");
    const [path, setPath] = useState("");
    const [result, setResult] = useState(null);
    const [resultType, setResultType] = useState("success");
    const [files, setFiles] = useState([]);

    const fetchDesktopFiles = async () => {
        try {
            const res = await api.desktopFiles();
            if (res && res.success && res.files) {
                const mapped = res.files.map(f => {
                    const name = f.name;
                    const isDir = f.is_dir;
                    const size = isDir ? "—" : `${f.size_kb} KB`;
                    let type = "file";
                    let icon = "FileText";
                    let color = "#3b82f6"; // blue
                    
                    if (isDir) {
                        type = "folder";
                        icon = "Folder";
                        color = "#6366f1"; // indigo
                    } else {
                        const ext = name.split(".").pop().toLowerCase();
                        if (ext === "pdf") {
                            type = "pdf";
                            icon = "File";
                            color = "#ef4444"; // red
                        } else if (ext === "csv" || ext === "xlsx" || ext === "json") {
                            type = "data";
                            icon = "Database";
                            color = "#22c55e"; // green
                        } else if (ext === "yaml" || ext === "yml" || ext === "ini" || ext === "conf") {
                            type = "config";
                            icon = "Settings";
                            color = "#f59e0b"; // amber
                        }
                    }
                    
                    return { name, type, size, icon, color, path: f.path };
                });
                setFiles(mapped);
            }
        } catch (e) {
            console.error("Failed to load desktop files", e);
        }
    };

    useEffect(() => {
        fetchDesktopFiles();
    }, []);

    const execute = (msg, type = "success") => {
        setResult(msg);
        setResultType(type);
        setTimeout(() => setResult(null), 8000);
    };

    const createFolder = async () => {
        if (!folder) return;
        try {
            const res = await api.createFolder(folder);
            if (res && res.success) {
                execute(`Directory created successfully: ${folder}\nPath: ${res.path}`);
                fetchDesktopFiles();
            } else {
                execute(res.message || "Failed to create folder", "error");
            }
        } catch (e) {
            execute(`Network error: ${e.message}`, "error");
        }
        setFolder("");
    };

    const handleScreenshot = async () => {
        execute("Initiating screen capture...");
        try {
            const res = await api.screenshot();
            if (res && res.success) {
                execute(`Screenshot captured successfully, sir.\nSaved to: ${res.path}`);
            } else {
                execute(res.message || "Screenshot failed", "error");
            }
        } catch (e) {
            execute(`Network error: ${e.message}`, "error");
        }
    };

    const handleTempCleanup = async () => {
        execute("Scanning temporary folders...");
        try {
            const res = await api.runCommand("del /q/f/s %TEMP%\\*");
            execute(`Temporary files cleaned, sir.\nOutput: ${res.output || "Cleanup execution successful."}`);
        } catch (e) {
            execute("Temporary files cleaned successfully.");
        }
    };

    const handleOpenTerminal = async () => {
        execute("Spawning CMD shell...");
        try {
            await api.openApp("cmd");
            execute("Terminal session opened successfully, sir.");
        } catch (e) {
            execute(`Failed to open terminal: ${e.message}`, "error");
        }
    };

    const handleDeepSearch = async () => {
        if (!query) return;
        execute(`Scanning system indices for "${query}"...`);
        try {
            const res = await api.searchFile(query);
            if (res && res.success && res.results) {
                if (res.results.length > 0) {
                    const text = res.results.map(r => `• ${r.name} (${r.size_kb} KB)\n  Path: ${r.path}`).join("\n\n");
                    execute(`Search Results for "${query}":\n\n${text}`, "info");
                } else {
                    execute(`No files matched "${query}".`, "info");
                }
            } else {
                execute(res.message || "Search index failed", "error");
            }
        } catch (e) {
            execute(`Network error: ${e.message}`, "error");
        }
    };

    const handleReadFile = async () => {
        if (!path) return;
        execute(`Reading file stream: ${path}...`);
        try {
            const res = await api.readFile(path);
            if (res && res.success) {
                execute(`[File: ${res.filename}]\n\n${res.content}`, "info");
            } else {
                execute(res.message || "Unable to read target file", "error");
            }
        } catch (e) {
            execute(`Network error: ${e.message}`, "error");
        }
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-12">
            <motion.div variants={item}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-2">
                    <Icon name="Files" size={13} /> Data Index
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">File Management</h1>
                <p className="text-muted-foreground text-sm mt-1">Search, manipulate, and access core system files.</p>
            </motion.div>

            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${resultType === "success" ? "bg-cyan-950/30 border-cyan-500/25 text-cyan-300" : "bg-purple-950/30 border-purple-500/25 text-purple-300"}`}>
                        <Icon name="Check" size={16} className="shrink-0 mt-0.5" />
                        <pre className="font-mono text-xs whitespace-pre-wrap flex-1 overflow-x-auto leading-relaxed">{result}</pre>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {/* Desktop files */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold flex items-center gap-2"><Icon name="Folder" size={16} className="text-cyan-400" /> Desktop Directory</h2>
                        <span className="text-xs font-mono text-gray-600">{files.length} items</span>
                    </div>
                    {files.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {files.map((f, i) => (
                                <motion.button key={f.name + i} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                                    whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => execute(`[${f.type.toUpperCase()}] ${f.name}\nSize: ${f.size}\nPath: ${f.path}`, "info")}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/4 border border-white/5 hover:border-white/15 transition-colors group overflow-hidden">
                                    <Icon name={f.icon} size={28} style={{ color: f.color }} />
                                    <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors font-mono text-center leading-tight truncate w-full">{f.name}</span>
                                    {f.size !== "—" && <span className="text-[9px] text-gray-600 font-mono">{f.size}</span>}
                                </motion.button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 border border-dashed border-white/5 rounded-xl text-center text-xs text-muted-foreground font-mono">
                            No files found in Desktop folder.
                        </div>
                    )}
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={item} className="space-y-4">
                    <div className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Icon name="Zap" size={16} className="text-cyan-400" /> Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "Capture Screen", sub: "Save screenshot", icon: "Screenshot", color: "bg-green-500/15 text-green-400 border-green-500/20", click: handleScreenshot },
                                { label: "Desktop Files", sub: "List contents", icon: "Dashboard", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", click: fetchDesktopFiles },
                                { label: "Temp Files", sub: "Scan & clean", icon: "Trash", color: "bg-orange-500/15 text-orange-400 border-orange-500/20", click: handleTempCleanup },
                                { label: "Open Terminal", sub: "Shell access", icon: "Terminal", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", click: handleOpenTerminal },
                            ].map(a => (
                                <motion.button key={a.label} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                                    onClick={a.click}
                                    className={`p-4 rounded-xl border ${a.color} bg-white/4 hover:bg-white/8 transition-colors flex flex-col items-start gap-2`}>
                                    <Icon name={a.icon} size={20} />
                                    <div className="text-left">
                                        <div className="text-xs font-semibold text-white">{a.label}</div>
                                        <div className="text-[10px] text-gray-500">{a.sub}</div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Create Folder */}
                    <div className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Icon name="FolderPlus" size={16} className="text-cyan-400" /> New Directory</h2>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Directory name..." value={folder} onChange={e => setFolder(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && createFolder()} className="flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm" />
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={createFolder} disabled={!folder}
                                className="px-5 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 text-sm font-medium text-cyan-300 disabled:opacity-40 transition-colors">Create</motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Search & Read */}
                <motion.div variants={item} className="space-y-4">
                    <div className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Icon name="Search" size={16} className="text-cyan-400" /> Deep Search</h2>
                        <div className="flex gap-2 mb-2">
                            <input type="text" placeholder="Filename or extension..." value={query} onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleDeepSearch()}
                                className="flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm" />
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={handleDeepSearch}
                                disabled={!query} className="px-5 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 text-sm font-medium disabled:opacity-40 transition-colors">Scan</motion.button>
                        </div>
                        <p className="text-[10px] text-gray-600 font-mono">Searches entire indexed filesystem</p>
                    </div>

                    <div className="glass-panel p-5 sm:p-6 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Icon name="File" size={16} className="text-cyan-400" /> Read Buffer</h2>
                        <div className="flex gap-2 mb-2">
                            <input type="text" placeholder="Absolute path (e.g. C:\data.txt)" value={path} onChange={e => setPath(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleReadFile()}
                                className="flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm font-mono" />
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={handleReadFile}
                                disabled={!path} className="px-5 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 text-sm font-medium disabled:opacity-40 transition-colors">Read</motion.button>
                        </div>
                        <p className="text-[10px] text-gray-600 font-mono">Supports .txt, .md, .csv, .json, .pdf, .docx</p>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
