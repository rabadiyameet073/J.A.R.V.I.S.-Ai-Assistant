// Header component with status and controls
import React from "react";
import { Icon } from "../Icons/Icons";
import { LANG_OPTIONS } from "../../i18n/uiLanguage";

export default function Header({
    apiStatus,
    onRefreshStatus,
    theme,
    onToggleTheme,
    onToggleSidebar,
    sidebarOpen = false,
    pageTitle,
    uiLanguage = "en",
    onChangeUiLanguage,
    t = (key, fallback) => fallback || key,
}) {
    return (
        <header className="app-header">
            <div className="header-left">
                <button
                    type="button"
                    className="btn-icon mobile-menu-btn"
                    onClick={onToggleSidebar}
                    aria-expanded={sidebarOpen}
                    aria-label="Toggle menu"
                >
                    <Icon name="Menu" size={24} />
                </button>
                <h1 className="page-title">{pageTitle || t("brand.control", "JARVIS Web Control")}</h1>
            </div>

            <div className="header-right">
                <select
                    className="lang-select"
                    value={uiLanguage}
                    onChange={(e) => onChangeUiLanguage?.(e.target.value)}
                    aria-label="Language"
                    title="UI Language"
                >
                    {LANG_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>{opt.label}</option>
                    ))}
                </select>
                <div className="status-indicator">
                    <span className={`status-dot ${apiStatus}`}></span>
                    <span className="status-text">{t("status.api", "API")}: {apiStatus}</span>
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
