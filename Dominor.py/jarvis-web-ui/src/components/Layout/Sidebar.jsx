// Sidebar navigation component
import React from "react";
import { NavLink } from "react-router-dom";
import { Icon } from "../Icons/Icons";

const navItems = [
    { path: "/", icon: "Dashboard", labelKey: "sidebar.dashboard", label: "Dashboard" },
    { path: "/assistant-dashboard", icon: "Activity", labelKey: "sidebar.assistant", label: "Assistant" },
    { path: "/music", icon: "Music", labelKey: "sidebar.music", label: "Music" },
    { path: "/system", icon: "System", labelKey: "sidebar.system", label: "System" },
    { path: "/files", icon: "Files", labelKey: "sidebar.files", label: "Files" },
    { path: "/communication", icon: "Communication", labelKey: "sidebar.communication", label: "Communication" },
    { path: "/timers", icon: "Timer", labelKey: "sidebar.timers", label: "Timers" },
    { path: "/ai-chat", icon: "AI", labelKey: "sidebar.aiChat", label: "AI Chat" },
    { path: "/ai-automation", icon: "Wand", labelKey: "sidebar.aiAutomation", label: "AI Automation" },
    { path: "/settings", icon: "Settings", labelKey: "sidebar.settings", label: "Settings" },
];

export default function Sidebar({ isOpen, onClose, t = (key, fallback) => fallback || key }) {
    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div className="sidebar-overlay" onClick={onClose} />
            )}

            <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <Icon name="Robot" size={32} />
                        <span className="logo-text">JARVIS</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item, idx) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `nav-item animate-entry ${isActive ? "active" : ""}`
                            }
                            onClick={onClose}
                            style={{ animationDelay: `${0.05 * idx}s` }}
                        >
                            <Icon name={item.icon} size={20} />
                            <span className="nav-label">{t(item.labelKey, item.label)}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="version-info">
                        <span>v1.0.0</span>
                    </div>
                </div>
            </aside>
        </>
    );
}
