// Sidebar navigation component
import React from "react";
import { NavLink } from "react-router-dom";
import { Icon } from "../Icons/Icons";

const navItems = [
    { path: "/", icon: "Dashboard", label: "Dashboard" },
    { path: "/music", icon: "Music", label: "Music" },
    { path: "/system", icon: "System", label: "System" },
    { path: "/files", icon: "Files", label: "Files" },
    { path: "/communication", icon: "Communication", label: "Communication" },
    { path: "/timers", icon: "Timer", label: "Timers" },
    { path: "/ai-chat", icon: "AI", label: "AI Chat" },
    { path: "/settings", icon: "Settings", label: "Settings" },
];

export default function Sidebar({ isOpen, onClose }) {
    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div className="sidebar-overlay" onClick={onClose} />
            )}

            <aside className={`sidebar ${isOpen ? "open" : ""}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <Icon name="Robot" size={32} />
                        <span className="logo-text">JARVIS</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? "active" : ""}`
                            }
                            onClick={onClose}
                        >
                            <Icon name={item.icon} size={20} />
                            <span className="nav-label">{item.label}</span>
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
