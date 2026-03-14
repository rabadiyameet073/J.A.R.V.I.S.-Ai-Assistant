// Communication Page - Email, Search, WhatsApp (No Phone Dialer)
import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Icon } from "../components/Icons/Icons";
import Modal, { ResultDisplay } from "../components/UI/Modal";

export default function Communication() {
    const { runAction } = useOutletContext();
    const [loading, setLoading] = useState({});

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalIcon, setModalIcon] = useState("");
    const [modalData, setModalData] = useState(null);

    // Email state
    const [emailTo, setEmailTo] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");

    // Search state
    const [searchQuery, setSearchQuery] = useState("");

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

    // Open WhatsApp
    const handleOpenWhatsApp = async () => {
        setLoading(prev => ({ ...prev, whatsapp: true }));
        const result = await runAction("open_whatsapp", {});
        setLoading(prev => ({ ...prev, whatsapp: false }));
        showModal("WhatsApp", "Phone", result.ok ? "✓ WhatsApp opened successfully!" : (result.detail || "Failed to open WhatsApp"));
    };

    // Send Email
    const handleSendEmail = async () => {
        if (!emailTo || !emailSubject || !emailBody) {
            showModal("Email", "Mail", "Please fill in all email fields (To, Subject, Body)");
            return;
        }

        setLoading(prev => ({ ...prev, email: true }));
        const result = await runAction("send_email", {
            to: emailTo,
            subject: emailSubject,
            body: emailBody
        });
        setLoading(prev => ({ ...prev, email: false }));

        if (result.ok) {
            showModal("Email Sent", "Mail", "✓ Email sent successfully!");
            setEmailTo("");
            setEmailSubject("");
            setEmailBody("");
        } else {
            showModal("Email", "Mail", result.detail || "Failed to send email");
        }
    };

    // Google Search
    const handleGoogleSearch = async () => {
        if (!searchQuery.trim()) {
            showModal("Search", "Search", "Please enter a search query");
            return;
        }

        setLoading(prev => ({ ...prev, google: true }));
        const result = await runAction("google_search", { query: searchQuery });
        setLoading(prev => ({ ...prev, google: false }));
        showModal("Google Search", "Search", result.ok ? `✓ Searching for: "${searchQuery}"` : (result.detail || "Search failed"));
    };

    // Web Search
    const handleWebSearch = async () => {
        if (!searchQuery.trim()) {
            showModal("Search", "Globe", "Please enter a search query");
            return;
        }

        setLoading(prev => ({ ...prev, web: true }));
        const result = await runAction("web_search", { query: searchQuery });
        setLoading(prev => ({ ...prev, web: false }));
        showModal("Web Search", "Globe", result.ok ? `✓ Web search for: "${searchQuery}"` : (result.detail || "Search failed"));
    };

    return (
        <div className="page communication-page">
            <div className="page-header">
                <h1>
                    <Icon name="Phone" size={28} />
                    Communication
                </h1>
                <p className="subtitle">Send emails, search the web, and open WhatsApp</p>
            </div>

            {/* Quick Actions */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Zap" size={20} />
                    Quick Actions
                </h2>
                <div className="quick-actions-grid">
                    <button
                        className={`quick-action-btn ${loading.whatsapp ? 'loading' : ''}`}
                        onClick={handleOpenWhatsApp}
                        disabled={loading.whatsapp}
                        style={{ "--action-color": "#25D366" }}
                    >
                        <div className="action-icon">
                            <Icon name="Phone" size={24} />
                        </div>
                        <span className="action-label">
                            {loading.whatsapp ? "Opening..." : "Open WhatsApp"}
                        </span>
                    </button>
                </div>
            </section>

            {/* Email Composer */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Mail" size={20} />
                    Send Email
                </h2>
                <div className="form-group">
                    <label>To (Email Address)</label>
                    <input
                        type="email"
                        className="form-input"
                        placeholder="recipient@example.com"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Subject</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Email subject..."
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Message</label>
                    <textarea
                        className="form-input form-textarea"
                        placeholder="Type your message here..."
                        rows={4}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                    ></textarea>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSendEmail}
                    disabled={loading.email}
                >
                    <Icon name="Send" size={16} />
                    {loading.email ? "Sending..." : "Send Email"}
                </button>
            </section>

            {/* Web Search */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Search" size={20} />
                    Web Search
                </h2>
                <div className="form-group">
                    <label>Search Query</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="What do you want to search for?"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleGoogleSearch()}
                    />
                </div>
                <div className="search-buttons">
                    <button
                        className="btn btn-primary"
                        onClick={handleGoogleSearch}
                        disabled={loading.google}
                    >
                        <Icon name="Search" size={16} />
                        {loading.google ? "Searching..." : "Google Search"}
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleWebSearch}
                        disabled={loading.web}
                    >
                        <Icon name="Globe" size={16} />
                        {loading.web ? "Searching..." : "Web Search"}
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
