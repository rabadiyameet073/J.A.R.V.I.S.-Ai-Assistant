// Header component with status and controls
import React from "react";
import { Icon } from "../Icons/Icons";

export default function Header({
    apiStatus,
    onRefreshStatus,
    theme,
    onToggleTheme,
    onToggleSidebar,
    pageTitle
}) {
    return (
        <header className="app-header">
            <div className="header-left">
                <button
                    className="btn-icon mobile-menu-btn"
                    onClick={onToggleSidebar}
                    aria-label="Toggle menu"
                >
                    <Icon name="Menu" size={24} />
                </button>
                <h1 className="page-title">{pageTitle || "JARVIS Web Control"}</h1>
            </div>

            <div className="header-right">
                <div className="status-indicator">
                    <span className={`status-dot ${apiStatus}`}></span>
                    <span className="status-text">API: {apiStatus}</span>
                    <button
                        className="btn-icon"
                        onClick={onRefreshStatus}
                        aria-label="Refresh status"
                    >
                        <Icon name="Refresh" size={16} />
                    </button>
                </div>

                <button
                    className="btn-icon theme-toggle"
                    onClick={onToggleTheme}
                    aria-label="Toggle theme"
                >
                    <Icon name={theme === "dark" ? "Sun" : "Moon"} size={20} />
                </button>
            </div>
        </header>
    );
}
