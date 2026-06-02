// Music page — New JARVIS AI OS Design
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../components/Icons/Icons";
import { mockSongs } from "../utils/mockData";
import { api } from "../utils/api";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } };

function WaveformBars({ playing }) {
    return (
        <div className={`flex items-end gap-[3px] h-8 ${!playing ? "opacity-30" : ""}`}>
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-cyan-600 to-cyan-300 wave-bar"
                    style={{ height: playing ? undefined : 8 }}
                />
            ))}
        </div>
    );
}

export default function Music() {
    const ctx = useOutletContext();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSong, setCurrentSong] = useState(null);
    const [songs, setSongs] = useState(mockSongs);
    const [progress, setProgress] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [search, setSearch] = useState("");
    const [showLibrary, setShowLibrary] = useState(false);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    // Fetch songs on mount
    useEffect(() => {
        const fetchSongs = async () => {
            try {
                const res = await api.listSongs(100);
                if (res && res.success && res.songs) {
                    const list = res.songs.map(s => s.name);
                    if (list.length > 0) {
                        setSongs(list);
                    }
                }
            } catch (e) {
                console.error("Failed to load song library", e);
            }
        };

        fetchSongs();
    }, []);

    // Polling music status and local progress ticks
    useEffect(() => {
        const updateStatus = async () => {
            try {
                const status = await api.musicStatus();
                if (status) {
                    setIsPlaying(status.playing);
                    if (status.current_song) {
                        const cleanName = status.current_song.replace(/\.[^/.]+$/, "");
                        setCurrentSong(cleanName);
                    } else if (!status.playing) {
                        setCurrentSong(null);
                    }
                }
            } catch (e) {
                console.error("Error updating music status", e);
            }
        };

        updateStatus();
        const statusInterval = setInterval(updateStatus, 3000);

        return () => {
            clearInterval(statusInterval);
        };
    }, []);

    // Local tick for progress simulation when playing
    useEffect(() => {
        let timer;
        if (isPlaying) {
            timer = setInterval(() => {
                setProgress(p => {
                    if (p >= 100) return 0;
                    return p + 0.5;
                });
                setElapsed(e => e + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isPlaying]);

    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    const playSong = async (name) => {
        try {
            setCurrentSong(name);
            setIsPlaying(true);
            setProgress(0);
            setElapsed(0);
            await api.playMusic(name);
        } catch (e) {
            console.error("Error playing song", e);
        }
    };

    const playRandom = async () => {
        try {
            setProgress(0);
            setElapsed(0);
            const res = await api.playMusic("random");
            if (res && res.song) {
                setCurrentSong(res.song);
                setIsPlaying(true);
            }
        } catch (e) {
            console.error("Error playing random song", e);
        }
    };

    const playLetter = async (l) => {
        try {
            setProgress(0);
            setElapsed(0);
            const res = await api.playMusic(l);
            if (res && res.song) {
                setCurrentSong(res.song);
                setIsPlaying(true);
            } else {
                // Fallback to local filtering if server search doesn't return target
                const m = songs.filter(s => s.toUpperCase().startsWith(l));
                if (m.length > 0) {
                    const localChosen = m[Math.floor(Math.random() * m.length)];
                    playSong(localChosen);
                }
            }
        } catch (e) {
            console.error("Error playing letter song", e);
        }
    };

    const togglePlay = async () => {
        try {
            if (isPlaying) {
                await api.pauseMusic();
                setIsPlaying(false);
            } else {
                if (currentSong) {
                    await api.resumeMusic();
                    setIsPlaying(true);
                } else {
                    await playRandom();
                }
            }
        } catch (e) {
            console.error("Error toggling playback", e);
        }
    };

    const stopPlayback = async () => {
        try {
            await api.stopMusic();
            setIsPlaying(false);
            setProgress(0);
            setElapsed(0);
            setCurrentSong(null);
        } catch (e) {
            console.error("Error stopping playback", e);
        }
    };

    const filtered = songs.filter(s => s.toLowerCase().includes(search.toLowerCase()));

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-12">
            <motion.div variants={item} className="flex flex-col gap-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 w-max">
                    <Icon name="Music" size={13} /> Audio Subsystem
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Audio Studio</h1>
                <p className="text-muted-foreground text-sm">Tactical playback control and library management.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                {/* Player */}
                <motion.div variants={item} className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-2xl sm:rounded-3xl relative overflow-hidden hud-corners">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/8 blur-[100px] rounded-full pointer-events-none" />

                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center relative z-10">
                        {/* Vinyl */}
                        <div className="relative shrink-0">
                            <motion.div
                                animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-white/10 flex items-center justify-center bg-black/60 shadow-2xl"
                            >
                                {[...Array(7)].map((_, i) => (
                                    <div key={i} className="absolute rounded-full border border-white/[0.04]" style={{ inset: `${8 + i * 4.5}%` }} />
                                ))}
                                <div className="absolute inset-0 rounded-full border-t border-l border-cyan-500/20" />
                                <div className="w-12 h-12 rounded-full bg-black border border-white/10 z-10 flex items-center justify-center">
                                    <Icon name="Music" size={18} className="text-cyan-400" />
                                </div>
                            </motion.div>
                            <AnimatePresence>
                                {isPlaying && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="absolute inset-0 rounded-full pointer-events-none"
                                        style={{ boxShadow: "0 0 40px rgba(0,212,255,0.15)" }}
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Controls */}
                        <div className="flex-1 w-full text-center sm:text-left flex flex-col justify-center min-h-[10rem]">
                            <div className="mb-1">
                                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                                    <WaveformBars playing={isPlaying} />
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                                        {isPlaying ? "Now Playing" : currentSong ? "Paused" : "Standby"}
                                    </span>
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.h2
                                        key={currentSong || "empty"}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="text-xl sm:text-2xl font-bold text-white mb-1 leading-tight"
                                    >
                                        {currentSong || "No Signal"}
                                    </motion.h2>
                                </AnimatePresence>
                                <p className="text-cyan-400/60 font-mono text-xs uppercase tracking-wider">JARVIS Audio System</p>
                            </div>

                            {/* Progress */}
                            <div className="space-y-2 my-5 w-full">
                                <div
                                    className="h-1 w-full bg-white/8 rounded-full overflow-hidden relative cursor-pointer"
                                    onClick={e => {
                                        const r = e.target.getBoundingClientRect();
                                        const pct = ((e.clientX - r.left) / r.width) * 100;
                                        setProgress(pct);
                                        setElapsed(Math.round((pct / 100) * 200));
                                    }}
                                >
                                    <motion.div
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600 to-cyan-300 rounded-full"
                                        style={{ width: `${progress}%` }}
                                        transition={{ duration: 1, ease: "linear" }}
                                    />
                                    <motion.div
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg"
                                        style={{ left: `${progress}%`, marginLeft: -6 }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-gray-600">
                                    <span>{fmt(elapsed)}</span>
                                    <span>{fmt(Math.max(0, 200 - elapsed))}</span>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-center sm:justify-start gap-3">
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={playRandom}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                                    <Icon name="Shuffle" size={15} />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                                    onClick={togglePlay}
                                    className="w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center transition-colors"
                                    style={{ boxShadow: isPlaying ? "0 0 20px rgba(0,212,255,0.4)" : "none" }}>
                                    <Icon name={isPlaying ? "Pause" : "Play"} size={22} />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    onClick={stopPlayback}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                                    <Icon name="Stop" size={15} />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={playRandom}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                                    <Icon name="Forward" size={15} />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right column */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Search */}
                    <motion.div variants={item} className="glass-panel p-5 rounded-2xl">
                        <h3 className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                            <Icon name="Search" size={14} className="text-cyan-400" /> Direct Access
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter track name..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && search && playSong(search)}
                                className="flex-1 bg-black/40 border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                            />
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => search && playSong(search)}
                                className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors">
                                <Icon name="Play" size={16} className="text-cyan-400" />
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* A-Z / List */}
                    <motion.div variants={item} className="glass-panel p-5 rounded-2xl flex-1 flex flex-col min-h-[220px]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-medium uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Icon name="Database" size={14} className="text-cyan-400" /> Library Index
                            </h3>
                            <button onClick={() => setShowLibrary(!showLibrary)} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-mono">
                                {showLibrary ? "Grid" : "List"}
                            </button>
                        </div>

                        {!showLibrary ? (
                            <motion.div layout className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 flex-1 content-start font-mono">
                                {alphabet.map((l, i) => (
                                    <motion.button
                                        key={l}
                                        initial={{ opacity: 0, scale: 0.7 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.015 }}
                                        whileHover={{ scale: 1.15, backgroundColor: "rgba(0,212,255,0.15)" }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => playLetter(l)}
                                        className="aspect-square rounded-lg bg-white/5 border border-white/5 hover:border-cyan-500/30 flex items-center justify-center text-[11px] font-semibold text-gray-500 hover:text-cyan-400 transition-colors"
                                    >
                                        {l}
                                    </motion.button>
                                ))}
                            </motion.div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-0.5 max-h-[200px] scrollbar-thin">
                                {filtered.length > 0 ? (
                                    filtered.map(song => (
                                        <motion.button
                                            key={song}
                                            whileHover={{ x: 4 }}
                                            onClick={() => playSong(song)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate flex items-center gap-2 ${
                                                currentSong === song ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"
                                            }`}
                                        >
                                            {currentSong === song && isPlaying && <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-pulse" />}
                                            {song}
                                        </motion.button>
                                    ))
                                ) : (
                                    <div className="text-xs text-muted-foreground p-3 text-center">No songs index matched</div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
