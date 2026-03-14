// Main Layout wrapper component
import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useLogger } from "../../hooks/useLogger";
import { useApi } from "../../hooks/useApi";
import { useTheme } from "../../hooks/useTheme";
import { Icon } from "../Icons/Icons";

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [logOpen, setLogOpen] = useState(false);
    const logger = useLogger();
    const { logs, append, clear, getLogText } = logger;
    const { apiStatus, checkStatus, runAction, loading } = useApi(logger);
    const { theme, toggleTheme } = useTheme();

    // Check API status on mount
    useEffect(() => {
        checkStatus();
    }, []);

    // Context to pass to pages
    const pageContext = {
        logs,
        append,
        clear,
        runAction,
        loading,
        apiStatus,
        checkStatus,
    };

    return (
        <div className="app-layout" data-theme={theme}>
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="main-wrapper">
                <Header
                    apiStatus={apiStatus}
                    onRefreshStatus={checkStatus}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                />

                <main className="main-content">
                    <Outlet context={pageContext} />
                </main>

                {/* Activity Log Panel */}
                <div className={`log-panel ${logOpen ? "open" : ""}`}>
                    <button
                        className="log-toggle"
                        onClick={() => setLogOpen(!logOpen)}
                    >
                        <Icon name="Activity" size={16} />
                        <span>Activity Log ({logs.length})</span>
                        <Icon name={logOpen ? "ChevronDown" : "ChevronRight"} size={16} />
                    </button>

                    {logOpen && (
                        <div className="log-content">
                            <div className="log-actions">
                                <button className="btn btn-sm btn-secondary" onClick={clear}>
                                    <Icon name="Trash" size={14} />
                                    Clear
                                </button>
                                <a
                                    className="btn btn-sm btn-secondary"
                                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(getLogText())}`}
                                    download={`jarvis-log-${new Date().toISOString().slice(0, 10)}.txt`}
                                >
                                    <Icon name="Download" size={14} />
                                    Download
                                </a>
                            </div>
                            <div className="log-entries">
                                {logs.length === 0 ? (
                                    <div className="log-empty">No activity yet...</div>
                                ) : (
                                    logs.map((log) => (
                                        <div key={log.id} className={`log-entry log-${log.type}`}>
                                            <span className="log-time">{log.timestamp}</span>
                                            <span className="log-message">{log.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
