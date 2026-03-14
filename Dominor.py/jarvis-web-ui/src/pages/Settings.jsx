// Settings Page
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Icon } from "../components/Icons/Icons";
import { API_ORIGIN, getFunctions } from "../utils/api";

export default function Settings() {
    const { apiStatus, checkStatus } = useOutletContext();
    const [functions, setFunctions] = useState([]);
    const [loading, setLoading] = useState({});

    useEffect(() => {
        loadFunctions();
    }, []);

    const loadFunctions = async () => {
        setLoading(prev => ({ ...prev, functions: true }));
        const data = await getFunctions();
        setFunctions(data.functions || []);
        setLoading(prev => ({ ...prev, functions: false }));
    };

    const handleRefreshStatus = async () => {
        setLoading(prev => ({ ...prev, status: true }));
        await checkStatus();
        setLoading(prev => ({ ...prev, status: false }));
    };

    return (
        <div className="page settings-page">
            <div className="page-header">
                <h1>
                    <Icon name="Settings" size={28} />
                    Settings
                </h1>
                <p className="subtitle">Configure JARVIS and view system information</p>
            </div>

            {/* API Configuration */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Wifi" size={20} />
                    API Configuration
                </h2>

                <div className="setting-row">
                    <div className="setting-info">
                        <label>Backend URL</label>
                        <span className="setting-description">The API endpoint for JARVIS backend</span>
                    </div>
                    <div className="setting-value">
                        <code>{API_ORIGIN}</code>
                    </div>
                </div>

                <div className="setting-row">
                    <div className="setting-info">
                        <label>Connection Status</label>
                        <span className="setting-description">Current API connection status</span>
                    </div>
                    <div className="setting-value">
                        <span className={`status-badge ${apiStatus}`}>{apiStatus}</span>
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={handleRefreshStatus}
                            disabled={loading.status}
                        >
                            <Icon name="RefreshCw" size={14} />
                            {loading.status ? "Checking..." : "Refresh"}
                        </button>
                    </div>
                </div>
            </section>

            {/* Available Functions */}
            <section className="card">
                <div className="card-header-row">
                    <h2 className="card-title">
                        <Icon name="Zap" size={20} />
                        Available Functions ({functions.length})
                    </h2>
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={loadFunctions}
                        disabled={loading.functions}
                    >
                        <Icon name="RefreshCw" size={14} />
                        {loading.functions ? "Loading..." : "Reload"}
                    </button>
                </div>

                {loading.functions ? (
                    <p>Loading functions...</p>
                ) : functions.length > 0 ? (
                    <div className="functions-list">
                        {functions.map((fn) => (
                            <div key={fn} className="function-item">
                                <code>{fn}</code>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="help-text">No functions available. Make sure the backend is running.</p>
                )}
            </section>

            {/* Keyboard Shortcuts */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Activity" size={20} />
                    Tips & Shortcuts
                </h2>
                <div className="shortcuts-list">
                    <div className="shortcut-item">
                        <p className="shortcut-description">🎵 <strong>Music:</strong> Type a song name or click a letter to play music</p>
                    </div>
                    <div className="shortcut-item">
                        <p className="shortcut-description">📸 <strong>Screenshot:</strong> Click the screenshot button to capture your screen</p>
                    </div>
                    <div className="shortcut-item">
                        <p className="shortcut-description">⏱️ <strong>Timers:</strong> Use preset buttons or enter custom time</p>
                    </div>
                    <div className="shortcut-item">
                        <p className="shortcut-description">💬 <strong>AI Chat:</strong> Ask questions or use quick commands</p>
                    </div>
                    <div className="shortcut-item">
                        <p className="shortcut-description">📁 <strong>Files:</strong> Search for files anywhere on your computer</p>
                    </div>
                    <div className="shortcut-item">
                        <p className="shortcut-description">📧 <strong>Email:</strong> Fill out the form to send quick emails</p>
                    </div>
                </div>
            </section>

            {/* About */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="AI" size={20} />
                    About JARVIS
                </h2>
                <div className="about-info">
                    <div className="about-row">
                        <span className="about-label">Version</span>
                        <span className="about-value">2.0.0</span>
                    </div>
                    <div className="about-row">
                        <span className="about-label">Frontend</span>
                        <span className="about-value">React + Vite</span>
                    </div>
                    <div className="about-row">
                        <span className="about-label">Backend</span>
                        <span className="about-value">Python FastAPI</span>
                    </div>
                    <div className="about-row">
                        <span className="about-label">Author</span>
                        <span className="about-value">Dominor</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
