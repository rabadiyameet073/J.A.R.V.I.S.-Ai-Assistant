// Dashboard Page - Info Page with Voice Control
import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icons/Icons";
import Modal, { ResultDisplay } from "../components/UI/Modal";
import { useVoiceRecognition } from "../hooks/useVoice";
import { getFunctions, getGreeting } from "../utils/api";

// Category cards with navigation
const categories = [
    {
        icon: "Music",
        title: "Music Controls",
        description: "Play songs, control playback, browse by letter",
        features: ["Play by Name", "A-Z Browser", "Stop Music"],
        path: "/music",
        color: "#ec4899",
        gradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)"
    },
    {
        icon: "System",
        title: "System Monitor",
        description: "View system info, battery, launch apps",
        features: ["System Info", "Battery Status", "App Launcher"],
        path: "/system",
        color: "#3b82f6",
        gradient: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)"
    },
    {
        icon: "Files",
        title: "File Manager",
        description: "Create folders, search files, read documents",
        features: ["Create Folders", "Search Files", "Read PDF/Text"],
        path: "/files",
        color: "#10b981",
        gradient: "linear-gradient(135deg, #10b981 0%, #22d3ee 100%)"
    },
    {
        icon: "Mail",
        title: "Communication",
        description: "Send emails, web search, open WhatsApp",
        features: ["WhatsApp", "Email Sender", "Web Search"],
        path: "/communication",
        color: "#f59e0b",
        gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
    },
    {
        icon: "Timer",
        title: "Timers & Tools",
        description: "Set timers, alarms, and use calculator",
        features: ["Timers", "Alarms", "Calculator"],
        path: "/timers",
        color: "#8b5cf6",
        gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)"
    },
    {
        icon: "AI",
        title: "AI Assistant",
        description: "Chat with JARVIS AI for help",
        features: ["AI Chat", "Quick Commands", "Voice Responses"],
        path: "/ai-chat",
        color: "#06b6d4",
        gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)"
    },
];

// Voice commands mapping
const voiceCommands = {
    "music": "/music",
    "play music": "/music",
    "system": "/system",
    "system info": "/system",
    "files": "/files",
    "file manager": "/files",
    "communication": "/communication",
    "email": "/communication",
    "whatsapp": "/communication",
    "timer": "/timers",
    "timers": "/timers",
    "calculator": "/timers",
    "alarm": "/timers",
    "chat": "/ai-chat",
    "ai": "/ai-chat",
    "ai chat": "/ai-chat",
    "settings": "/settings",
};

export default function Dashboard() {
    const { runAction, apiStatus, logs } = useOutletContext();
    const navigate = useNavigate();
    const [functionCount, setFunctionCount] = useState(0);

    // Voice control
    const voice = useVoiceRecognition();
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [voiceResult, setVoiceResult] = useState(null);
    const [showVoiceModal, setShowVoiceModal] = useState(false);

    useEffect(() => {
        getFunctions()
            .then(data => setFunctionCount(data.count || 29)) // 29 is fallback
            .catch(() => setFunctionCount(29)); // Fallback if API fails
    }, []);

    // Check permission on load
    useEffect(() => {
        if (voice.hasPermission === null && voice.isSupported) {
            // Show permission modal on first load
            setShowPermissionModal(true);
        }
    }, [voice.hasPermission, voice.isSupported]);

    // Handle voice command when transcript changes
    useEffect(() => {
        if (voice.transcript) {
            handleVoiceCommand(voice.transcript.toLowerCase());
        }
    }, [voice.transcript]);

    const handlePermissionRequest = async () => {
        const granted = await voice.requestPermission();
        setShowPermissionModal(false);
        if (granted) {
            setVoiceResult("✓ Microphone enabled! Click the mic button to give voice commands.");
            setShowVoiceModal(true);
        }
    };

    const handleVoiceCommand = (command) => {
        // Check for navigation commands
        for (const [key, path] of Object.entries(voiceCommands)) {
            if (command.includes(key)) {
                setVoiceResult(`Navigating to ${key}...`);
                setShowVoiceModal(true);
                setTimeout(() => navigate(path), 1000);
                return;
            }
        }

        // If no navigation command, show what was said
        setVoiceResult(`You said: "${command}"\n\nTry saying: "music", "system", "files", "timer", "chat", or "settings"`);
        setShowVoiceModal(true);
    };

    const handleMicClick = () => {
        if (!voice.hasPermission) {
            setShowPermissionModal(true);
        } else if (voice.isListening) {
            voice.stopListening();
        } else {
            voice.startListening();
        }
    };

    return (
        <div className="page dashboard-page">
            {/* Permission Modal */}
            {showPermissionModal && (
                <div className="modal-overlay" onClick={() => setShowPermissionModal(false)}>
                    <div className="modal-container permission-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="permission-icon">
                            <Icon name="AI" size={56} />
                        </div>
                        <h2>Enable Voice Control</h2>
                        <p>JARVIS can understand your voice commands! Allow microphone access to control the app hands-free.</p>
                        <div className="permission-features">
                            <span>🎤 Voice Navigation</span>
                            <span>🗣️ Voice Commands</span>
                            <span>🔊 Hands-free Control</span>
                        </div>
                        <div className="permission-buttons">
                            <button className="btn btn-primary" onClick={handlePermissionRequest}>
                                <Icon name="Mic" size={16} />
                                Allow Microphone
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowPermissionModal(false)}>
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Voice Result Modal */}
            <Modal
                isOpen={showVoiceModal}
                onClose={() => setShowVoiceModal(false)}
                title="Voice Command"
                icon="Mic"
            >
                <ResultDisplay data={voiceResult} />
            </Modal>

            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">
                        <Icon name="AI" size={16} />
                        AI-Powered Assistant
                    </div>
                    <h1 className="hero-title">
                        Welcome to <span className="gradient-text">J.A.R.V.I.S.</span>
                    </h1>
                    <p className="hero-subtitle">
                        Your Personal AI Assistant for System Control, Automation & More
                    </p>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <span className="hero-stat-value">{functionCount}</span>
                            <span className="hero-stat-label">Functions</span>
                        </div>
                        <div className="hero-stat">
                            <span className={`hero-stat-value status-${apiStatus}`}>{apiStatus}</span>
                            <span className="hero-stat-label">API Status</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hero-stat-value">{categories.length}</span>
                            <span className="hero-stat-label">Categories</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <button
                        className={`voice-button ${voice.isListening ? 'listening' : ''} ${voice.hasPermission ? 'enabled' : ''}`}
                        onClick={handleMicClick}
                        title={voice.isListening ? "Listening..." : "Click to speak"}
                    >
                        <Icon name="AI" size={56} />
                        {voice.isListening && <span className="voice-pulse"></span>}
                    </button>
                    <p className="voice-hint">
                        {voice.isListening ? "Listening..." : voice.hasPermission ? "Click to speak" : "Enable voice"}
                    </p>
                </div>
            </div>

            {/* Voice Commands Info */}
            {voice.hasPermission && (
                <section className="voice-info-card">
                    <Icon name="Mic" size={20} />
                    <span>Voice Control Active! Say: <strong>"music"</strong>, <strong>"system"</strong>, <strong>"files"</strong>, <strong>"timer"</strong>, <strong>"chat"</strong>, or <strong>"settings"</strong></span>
                </section>
            )}

            {/* Category Navigation Cards */}
            <section className="categories-section">
                <h2 className="section-title">Explore Categories</h2>
                <p className="section-subtitle">Click on any category or use voice commands to navigate</p>
                <div className="categories-grid">
                    {categories.map((cat) => (
                        <div
                            key={cat.path}
                            className="category-card"
                            onClick={() => navigate(cat.path)}
                            style={{ "--cat-color": cat.color, "--cat-gradient": cat.gradient }}
                        >
                            <div className="category-header">
                                <div className="category-icon">
                                    <Icon name={cat.icon} size={32} />
                                </div>
                                <div className="category-arrow">
                                    <Icon name="ArrowRight" size={20} />
                                </div>
                            </div>
                            <h3 className="category-title">{cat.title}</h3>
                            <p className="category-desc">{cat.description}</p>
                            <div className="category-features">
                                {cat.features.map((f, i) => (
                                    <span key={i} className="category-feature-tag">{f}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Quick Access to Settings */}
            <section className="quick-settings-section">
                <div className="settings-banner" onClick={() => navigate("/settings")}>
                    <div className="settings-info">
                        <Icon name="Settings" size={24} />
                        <div>
                            <h3>Settings & Configuration</h3>
                            <p>View API status, available functions, and system configuration</p>
                        </div>
                    </div>
                    <Icon name="ArrowRight" size={20} />
                </div>
            </section>

            {/* Recent Activity Preview */}
            {logs.length > 0 && (
                <section className="activity-preview">
                    <h2 className="section-title">Recent Activity</h2>
                    <div className="activity-list">
                        {logs.slice(0, 3).map((log) => (
                            <div key={log.id} className={`activity-item activity-${log.type}`}>
                                <span className="activity-time">{log.timestamp}</span>
                                <span className="activity-message">{log.message}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
