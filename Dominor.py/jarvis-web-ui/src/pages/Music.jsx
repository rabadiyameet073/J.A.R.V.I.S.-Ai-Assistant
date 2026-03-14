// Music Page - Play Music with Player UI
import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { Icon } from "../components/Icons/Icons";
import Modal, { ResultDisplay } from "../components/UI/Modal";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Music() {
    const { runAction } = useOutletContext();
    const [loading, setLoading] = useState({});
    const [songName, setSongName] = useState("");

    // Player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSong, setCurrentSong] = useState(null);
    const [progress, setProgress] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const progressInterval = useRef(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalData, setModalData] = useState(null);

    // Simulate progress when playing
    useEffect(() => {
        if (isPlaying) {
            progressInterval.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(progressInterval.current);
                        setIsPlaying(false);
                        return 0;
                    }
                    return prev + 0.5; // ~3.3 minutes per song
                });
            }, 1000);
        } else {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        }
        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, [isPlaying]);

    const showModal = (title, data) => {
        setModalTitle(title);
        setModalData(data);
        setModalOpen(true);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlayByName = async () => {
        if (!songName.trim()) {
            showModal("Play Music", "Please enter a song name");
            return;
        }

        setLoading(prev => ({ ...prev, playName: true }));
        const result = await runAction("play_song_by_name", { query: songName });
        setLoading(prev => ({ ...prev, playName: false }));

        if (result.ok || result.result) {
            setCurrentSong(songName);
            setIsPlaying(true);
            setProgress(0);
            setElapsedTime(0);
            showModal("Now Playing", `🎵 Playing: ${songName}`);
        } else {
            showModal("Music", result.detail || "Could not play the song");
        }
    };

    const handlePlayByLetter = async (letter) => {
        setLoading(prev => ({ ...prev, [letter]: true }));
        const result = await runAction("play_song_by_letter", { letter: letter });
        setLoading(prev => ({ ...prev, [letter]: false }));

        if (result.ok || result.result) {
            setCurrentSong(`Song starting with "${letter}"`);
            setIsPlaying(true);
            setProgress(0);
            setElapsedTime(0);
            showModal("Now Playing", `🎵 Playing song starting with "${letter}"`);
        } else {
            showModal("Music", result.detail || `No songs found starting with ${letter}`);
        }
    };

    const handleStop = async () => {
        setLoading(prev => ({ ...prev, stop: true }));
        await runAction("stop_music", {});
        setLoading(prev => ({ ...prev, stop: false }));

        setIsPlaying(false);
        setCurrentSong(null);
        setProgress(0);
        setElapsedTime(0);
        showModal("Music Stopped", "Music playback has been stopped");
    };

    const togglePlayPause = () => {
        if (currentSong) {
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="page music-page">
            <div className="page-header">
                <h1>
                    <Icon name="Music" size={28} />
                    Music Controls
                </h1>
                <p className="subtitle">Play and control your music library</p>
            </div>

            {/* Now Playing Card */}
            <section className="card player-card">
                <div className="player-container">
                    <div className="player-artwork">
                        <div className={`artwork-circle ${isPlaying ? 'spinning' : ''}`}>
                            <Icon name="Music" size={48} />
                        </div>
                    </div>

                    <div className="player-info">
                        <h3 className="now-playing-label">
                            {isPlaying ? "Now Playing" : currentSong ? "Paused" : "Not Playing"}
                        </h3>
                        <p className="song-title">
                            {currentSong || "Select a song to play"}
                        </p>

                        {/* Progress Bar */}
                        <div className="progress-container">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                ></div>
                                <div
                                    className="progress-knob"
                                    style={{ left: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="progress-times">
                                <span>{formatTime(elapsedTime)}</span>
                                <span>{formatTime(Math.floor(200 * (1 - progress / 100)))}</span>
                            </div>
                        </div>

                        {/* Playback Controls */}
                        <div className="playback-controls">
                            <button className="control-btn" disabled>
                                <Icon name="ArrowLeft" size={20} />
                            </button>
                            <button
                                className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
                                onClick={togglePlayPause}
                                disabled={!currentSong}
                            >
                                <Icon name={isPlaying ? "Pause" : "Play"} size={28} />
                            </button>
                            <button className="control-btn" disabled>
                                <Icon name="ArrowRight" size={20} />
                            </button>
                            <button
                                className="control-btn stop-btn"
                                onClick={handleStop}
                                disabled={!currentSong || loading.stop}
                            >
                                <Icon name="Close" size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Play by Name */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Search" size={20} />
                    Play by Name
                </h2>
                <div className="input-group">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter song name..."
                        value={songName}
                        onChange={(e) => setSongName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handlePlayByName()}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handlePlayByName}
                        disabled={loading.playName}
                    >
                        <Icon name="Play" size={16} />
                        {loading.playName ? "Playing..." : "Play"}
                    </button>
                </div>
            </section>

            {/* A-Z Grid */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Music" size={20} />
                    Browse by Letter
                </h2>
                <p className="card-description">Click a letter to play a random song starting with that letter</p>
                <div className="alphabet-grid">
                    {alphabet.map((letter) => (
                        <button
                            key={letter}
                            className={`letter-btn ${loading[letter] ? 'loading' : ''}`}
                            onClick={() => handlePlayByLetter(letter)}
                            disabled={loading[letter]}
                        >
                            {loading[letter] ? "..." : letter}
                        </button>
                    ))}
                </div>
            </section>

            {/* Quick Controls */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Zap" size={20} />
                    Quick Controls
                </h2>
                <div className="quick-actions-grid">
                    <button
                        className={`quick-action-btn ${loading.stop ? 'loading' : ''}`}
                        onClick={handleStop}
                        disabled={loading.stop}
                        style={{ "--action-color": "#ef4444" }}
                    >
                        <div className="action-icon">
                            <Icon name="Close" size={24} />
                        </div>
                        <span className="action-label">
                            {loading.stop ? "Stopping..." : "Stop Music"}
                        </span>
                    </button>
                </div>
            </section>

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                icon="Music"
            >
                <ResultDisplay data={modalData} />
            </Modal>
        </div>
    );
}
