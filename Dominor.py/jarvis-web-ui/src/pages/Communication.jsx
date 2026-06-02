// Communication page — New JARVIS AI OS Design
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { api } from "../utils/api";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

const DEFAULT_CONTACTS = [
    { name: "Tony Stark", role: "CEO", initial: "T", color: "#ef4444" },
    { name: "Pepper Potts", role: "Operations", initial: "P", color: "#ec4899" },
    { name: "Nick Fury", role: "Director", initial: "N", color: "#6366f1" },
    { name: "Bruce Banner", role: "Science", initial: "B", color: "#22c55e" },
];

const TABS = ["Secure Message", "Email", "Search"];

export default function Communication() {
    const ctx = useOutletContext();
    const [activeTab, setActiveTab] = useState(0);
    const [result, setResult] = useState(null);
    const [waContact, setWaContact] = useState("");
    const [waMsg, setWaMsg] = useState("");
    const [emailTo, setEmailTo] = useState("");
    const [emailSubj, setEmailSubj] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [searchQ, setSearchQ] = useState("");
    const [selectedContact, setSelectedContact] = useState(null);
    const [contacts, setContacts] = useState(DEFAULT_CONTACTS);

    // Fetch contacts from backend
    const fetchContacts = async () => {
        try {
            const res = await api.getContacts();
            if (res && res.success && res.contacts) {
                const list = Object.entries(res.contacts).map(([name, data]) => {
                    const cName = name.charAt(0).toUpperCase() + name.slice(1);
                    const colors = ["#ef4444", "#ec4899", "#6366f1", "#22c55e", "#f59e0b", "#8b5cf6"];
                    const randomColor = colors[Math.abs(cName.charCodeAt(0) - 65) % colors.length];
                    return {
                        name: cName,
                        role: data.platform === "whatsapp" ? "WhatsApp Contact" : "Contact",
                        initial: cName.charAt(0),
                        color: randomColor,
                        phone: data.phone,
                        platform: data.platform || "whatsapp"
                    };
                });
                if (list.length > 0) {
                    setContacts(list);
                }
            }
        } catch (e) {
            console.error("Failed to load contacts", e);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const execute = (msg) => { setResult(msg); setTimeout(() => setResult(null), 5000); };
    const fillContact = (c) => { setSelectedContact(c); setWaContact(c.name); if (activeTab !== 0) setActiveTab(0); };

    const handleSendWhatsApp = async () => {
        if (!waContact || !waMsg) return;
        execute(`Transmitting WhatsApp packet to ${waContact}...`);
        try {
            const res = await api.sendWhatsApp(waContact, waMsg);
            if (res && res.success) {
                execute(res.message || `Message successfully sent to ${waContact}.`);
                setWaMsg("");
                setSelectedContact(null);
            } else {
                execute(res.message || `Failed to transmit message.`);
            }
        } catch (e) {
            execute(`Network error: ${e.message}`);
        }
    };

    const handleSendEmail = async () => {
        if (!emailTo || !emailBody) return;
        execute(`Routing email payload to ${emailTo}...`);
        try {
            const res = await api.sendEmail(emailTo, emailSubj || "Message from JARVIS", emailBody);
            if (res && res.success) {
                execute(res.message || `Email successfully dispatched to ${emailTo}.`);
                setEmailTo("");
                setEmailSubj("");
                setEmailBody("");
            } else {
                execute(res.message || `Email dispatch failed.`);
            }
        } catch (e) {
            execute(`Network error: ${e.message}`);
        }
    };

    const handleSearch = async (queryToSearch) => {
        const q = queryToSearch || searchQ;
        if (!q) return;
        execute(`Initiating global network search: "${q}"...`);
        try {
            const res = await api.webSearch(q);
            if (res && res.success) {
                execute(res.message || `Search completed for: "${q}"`);
                setSearchQ("");
            } else {
                execute(`Search query failed.`);
            }
        } catch (e) {
            execute(`Network error: ${e.message}`);
        }
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-12">
            <motion.div variants={item}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-2">
                    <Icon name="Mail" size={13} /> Uplink Node
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Communication Hub</h1>
                <p className="text-muted-foreground text-sm mt-1">Transmit messages, search networks, and interface with contacts.</p>
            </motion.div>

            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/25 text-cyan-300 flex items-center gap-3 text-sm">
                        <Icon name="Check" size={16} className="shrink-0" /> {result}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Contacts */}
                <motion.div variants={item} className="space-y-4 lg:col-span-1">
                    <div className="glass-panel p-5 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Icon name="User" size={16} className="text-cyan-400" /> Active Contacts</h2>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin">
                            {contacts.map((c, i) => (
                                <motion.div key={c.name + i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                                    whileHover={{ x: 4 }} onClick={() => fillContact(c)}
                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                                        selectedContact?.name === c.name ? "bg-cyan-500/10 border-cyan-500/25" : "bg-white/4 border-white/5 hover:bg-white/8 hover:border-white/10"
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                                            style={{ backgroundColor: c.color + "25", border: `1px solid ${c.color}40`, color: c.color }}>{c.initial}</div>
                                        <div>
                                            <div className="text-sm font-medium text-white">{c.name}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">{c.role}</div>
                                        </div>
                                    </div>
                                    <Icon name="Phone" size={13} className="text-gray-600 animate-pulse" />
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl">
                        <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Icon name="Search" size={16} className="text-cyan-400" /> Global Network</h2>
                        <div className="flex flex-col gap-2">
                            <input type="text" placeholder="Query database..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSearch()}
                                className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => handleSearch()}
                                className="w-full py-2.5 rounded-xl bg-white/8 hover:bg-white/15 transition-colors text-sm font-medium">Execute Search</motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Composer */}
                <motion.div variants={item} className="glass-panel p-5 sm:p-6 rounded-2xl lg:col-span-2 flex flex-col min-h-[400px]">
                    <div className="flex items-center gap-1 border-b border-white/8 mb-6 overflow-x-auto scrollbar-none">
                        {TABS.map((tab, i) => (
                            <button key={tab} onClick={() => setActiveTab(i)}
                                className={`text-sm font-medium pb-3 px-4 border-b-2 transition-all whitespace-nowrap ${
                                    activeTab === i ? "border-cyan-400 text-cyan-400" : "border-transparent text-gray-500 hover:text-gray-300"
                                }`}>{tab}</button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 0 && (
                            <motion.div key="wa" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4 flex-1 flex flex-col">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Target Identity</label>
                                    <input type="text" value={waContact} onChange={e => setWaContact(e.target.value)} className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:outline-none" placeholder="Name or number..." />
                                </div>
                                <div className="space-y-1.5 flex-1 flex flex-col">
                                    <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Encrypted Payload</label>
                                    <textarea value={waMsg} onChange={e => setWaMsg(e.target.value)} className="w-full flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-sm resize-none min-h-[150px] focus:outline-none" placeholder="Type secure message..." />
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    onClick={handleSendWhatsApp}
                                    disabled={!waContact || !waMsg}
                                    className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold transition-colors disabled:opacity-40 disabled:bg-gray-800 disabled:text-gray-500 flex items-center justify-center gap-2">
                                    <Icon name="Send" size={16} /> Transmit via Secure Channel
                                </motion.button>
                            </motion.div>
                        )}

                        {activeTab === 1 && (
                            <motion.div key="email" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4 flex-1 flex flex-col">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Recipient</label>
                                        <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:outline-none" placeholder="address@domain.com" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Subject</label>
                                        <input type="text" value={emailSubj} onChange={e => setEmailSubj(e.target.value)} className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:outline-none" placeholder="Subject line..." />
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex-1 flex flex-col">
                                    <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Body</label>
                                    <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} className="w-full flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-sm resize-none min-h-[130px] focus:outline-none" placeholder="Compose message..." />
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    onClick={handleSendEmail}
                                    disabled={!emailTo || !emailBody}
                                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition-colors disabled:opacity-40 disabled:bg-gray-800 disabled:text-gray-500 flex items-center justify-center gap-2">
                                    <Icon name="Send" size={16} /> Dispatch Email
                                </motion.button>
                            </motion.div>
                        )}

                        {activeTab === 2 && (
                            <motion.div key="search" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 flex flex-col gap-4">
                                <p className="text-sm text-gray-500">Search the global network, social platforms, and knowledge bases.</p>
                                <input type="text" placeholder="Enter search query..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                                    className="w-full bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-sm focus:outline-none" />
                                <div className="flex flex-wrap gap-2">
                                    {["Google", "DuckDuckGo", "Bing", "Wikipedia", "GitHub"].map(e => (
                                        <button key={e} onClick={() => handleSearch(e)}
                                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-gray-400 hover:text-white hover:border-cyan-500/25 transition-colors font-mono">{e}</button>
                                    ))}
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => handleSearch()}
                                    disabled={!searchQ}
                                    className="mt-auto w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition-colors disabled:opacity-40">Execute Search</motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </motion.div>
    );
}
