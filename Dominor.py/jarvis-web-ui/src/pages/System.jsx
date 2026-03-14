// System Page - System Info, App Launcher, Controls with Modals
import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Icon } from "../components/Icons/Icons";
import Modal, { ResultDisplay } from "../components/UI/Modal";

const quickActions = [
    { icon: "Cpu", label: "System Info", action: "get_system_info", color: "#3b82f6" },
    { icon: "Battery", label: "Battery", action: "get_battery_status", color: "#f59e0b" },
    { icon: "Globe", label: "IP Address", action: "get_ip_address", color: "#ec4899" },
    { icon: "Wifi", label: "Check Internet", action: "check_internet_connection", color: "#06b6d4" },
    { icon: "Calendar", label: "Date & Time", action: "get_date_day_info", color: "#8b5cf6" },
    { icon: "Screenshot", label: "Take Screenshot", action: "take_screenshot", color: "#10b981" },
    { icon: "Quote", label: "Motivate Me", action: "get_motivational_quote", color: "#f97316" },
];

const appShortcuts = [
    { name: "Chrome", color: "#4285F4" },
    { name: "Notepad", color: "#FFE66D" },
    { name: "Calculator", color: "#00BCB4" },
    { name: "Spotify", color: "#1DB954" },
    { name: "VS Code", color: "#007ACC" },
    { name: "Explorer", color: "#F0C14B" },
    { name: "Word", color: "#2B579A" },
    { name: "Excel", color: "#217346" },
];

export default function System() {
    const { runAction } = useOutletContext();
    const [loading, setLoading] = useState({});
    const [appName, setAppName] = useState("");

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalIcon, setModalIcon] = useState("");
    const [modalData, setModalData] = useState(null);

    const showModal = (title, icon, data) => {
        setModalTitle(title);
        setModalIcon(icon);
        setModalData(data);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalData(null);
    };

    const handleQuickAction = async (action) => {
        setLoading(prev => ({ ...prev, [action.action]: true }));
        const result = await runAction(action.action, {});
        setLoading(prev => ({ ...prev, [action.action]: false }));

        if (result.ok || result.result) {
            showModal(action.label, action.icon, result.result || "✓ Action completed successfully!");
        } else {
            showModal(action.label, action.icon, result.detail || "Action failed");
        }
    };

    const handleOpenApp = async (name) => {
        const appKey = `app_${name}`;
        setLoading(prev => ({ ...prev, [appKey]: true }));
        const result = await runAction("open_application", { app_name: name.toLowerCase() });
        setLoading(prev => ({ ...prev, [appKey]: false }));

        if (result.ok || result.result) {
            showModal("Open Application", "System", `✓ ${name} opened successfully!`);
        } else {
            showModal("Open Application", "System", result.detail || `Failed to open ${name}`);
        }
    };

    const handleOpenWhatsApp = async () => {
        setLoading(prev => ({ ...prev, whatsapp: true }));
        const result = await runAction("open_whatsapp", {});
        setLoading(prev => ({ ...prev, whatsapp: false }));

        if (result.ok || result.result) {
            showModal("WhatsApp", "Phone", "✓ WhatsApp opened successfully!");
        } else {
            showModal("WhatsApp", "Phone", result.detail || "Failed to open WhatsApp");
        }
    };

    const handleOpenCustomApp = async () => {
        if (!appName.trim()) {
            showModal("Open Application", "System", "Please enter an application name");
            return;
        }

        setLoading(prev => ({ ...prev, customApp: true }));
        const result = await runAction("open_application", { app_name: appName.toLowerCase() });
        setLoading(prev => ({ ...prev, customApp: false }));

        if (result.ok || result.result) {
            showModal("Open Application", "System", `✓ ${appName} opened successfully!`);
            setAppName("");
        } else {
            showModal("Open Application", "System", result.detail || `Failed to open ${appName}`);
        }
    };

    const handleSystemControl = async (action, label) => {
        setLoading(prev => ({ ...prev, [action]: true }));
        const result = await runAction(action, {});
        setLoading(prev => ({ ...prev, [action]: false }));

        if (result.ok || result.result) {
            showModal("System Control", "Settings", `✓ ${label} successful!`);
        } else {
            showModal("System Control", "Settings", result.detail || `${label} failed`);
        }
    };

    return (
        <div className="page system-page">
            <div className="page-header">
                <h1>
                    <Icon name="System" size={28} />
                    System Monitor
                </h1>
                <p className="subtitle">View system information and launch applications</p>
            </div>

            {/* Quick Actions */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Zap" size={20} />
                    Quick Actions
                </h2>
                <div className="quick-actions-grid">
                    {quickActions.map((action) => (
                        <button
                            key={action.action}
                            className={`quick-action-btn ${loading[action.action] ? 'loading' : ''}`}
                            onClick={() => handleQuickAction(action)}
                            disabled={loading[action.action]}
                            style={{ "--action-color": action.color }}
                        >
                            <div className="action-icon">
                                <Icon name={action.icon} size={24} />
                            </div>
                            <span className="action-label">
                                {loading[action.action] ? "Loading..." : action.label}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Open Application */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Folder" size={20} />
                    Open Application
                </h2>
                <div className="input-group">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter app name (e.g., chrome, notepad, spotify)"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleOpenCustomApp()}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleOpenCustomApp}
                        disabled={loading.customApp}
                    >
                        <Icon name="Play" size={16} />
                        {loading.customApp ? "Opening..." : "Open"}
                    </button>
                </div>

                {/* App Shortcuts */}
                <div className="app-shortcuts">
                    {appShortcuts.map((app) => (
                        <button
                            key={app.name}
                            className={`app-chip ${loading[`app_${app.name}`] ? 'loading' : ''}`}
                            onClick={() => handleOpenApp(app.name)}
                            disabled={loading[`app_${app.name}`]}
                            style={{ "--chip-color": app.color }}
                        >
                            {app.name}
                        </button>
                    ))}
                </div>

                <button
                    className={`btn btn-success whatsapp-btn ${loading.whatsapp ? 'loading' : ''}`}
                    onClick={handleOpenWhatsApp}
                    disabled={loading.whatsapp}
                >
                    <Icon name="Phone" size={16} />
                    {loading.whatsapp ? "Opening..." : "Open WhatsApp"}
                </button>
            </section>

            {/* System Controls */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Settings" size={20} />
                    System Controls
                </h2>
                <div className="control-buttons">
                    <button
                        className={`btn btn-primary ${loading.enable_wifi ? 'loading' : ''}`}
                        onClick={() => handleSystemControl("enable_wifi", "Enable WiFi")}
                        disabled={loading.enable_wifi}
                    >
                        Enable WiFi
                    </button>
                    <button
                        className={`btn btn-danger ${loading.disable_wifi ? 'loading' : ''}`}
                        onClick={() => handleSystemControl("disable_wifi", "Disable WiFi")}
                        disabled={loading.disable_wifi}
                    >
                        Disable WiFi
                    </button>
                    <button
                        className={`btn btn-primary ${loading.enable_bluetooth ? 'loading' : ''}`}
                        onClick={() => handleSystemControl("enable_bluetooth", "Enable Bluetooth")}
                        disabled={loading.enable_bluetooth}
                    >
                        Enable Bluetooth
                    </button>
                    <button
                        className={`btn btn-danger ${loading.disable_bluetooth ? 'loading' : ''}`}
                        onClick={() => handleSystemControl("disable_bluetooth", "Disable Bluetooth")}
                        disabled={loading.disable_bluetooth}
                    >
                        Disable Bluetooth
                    </button>
                </div>
            </section>

            {/* Result Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={modalTitle}
                icon={modalIcon}
            >
                <ResultDisplay data={modalData} />
            </Modal>
        </div>
    );
}
