// Modal Component for displaying results
import React from "react";
import { Icon } from "../Icons/Icons";

export default function Modal({ isOpen, onClose, title, children, icon }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {icon && <Icon name={icon} size={24} />}
                        {title}
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <Icon name="Close" size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Result display component for different types
export function ResultDisplay({ type, data }) {
    if (!data) return <p className="result-empty">No data available</p>;

    // Format object data into nice cards
    if (typeof data === "object" && !Array.isArray(data)) {
        return (
            <div className="result-grid">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="result-item-card">
                        <span className="result-label">{formatLabel(key)}</span>
                        <span className="result-value">
                            {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    // String data
    return (
        <div className="result-text">
            <pre>{String(data)}</pre>
        </div>
    );
}

// Format label from snake_case to Title Case
function formatLabel(str) {
    return str
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
