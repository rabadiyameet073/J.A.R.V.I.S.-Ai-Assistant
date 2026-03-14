// Files Manager Page
import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Icon } from "../components/Icons/Icons";

export default function Files() {
    const { runAction } = useOutletContext();
    const [folderName, setFolderName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [textFilePath, setTextFilePath] = useState("");
    const [pdfFilePath, setPdfFilePath] = useState("");
    const [loading, setLoading] = useState({});
    const [results, setResults] = useState({});

    const handleCreateFolder = async () => {
        if (!folderName.trim()) return;
        setLoading(prev => ({ ...prev, folder: true }));
        const result = await runAction("create_folder", { folder_name: folderName });
        setLoading(prev => ({ ...prev, folder: false }));
        if (result.ok) {
            setResults(prev => ({ ...prev, createFolder: result.result || `Folder "${folderName}" created on Desktop` }));
            setFolderName("");
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(prev => ({ ...prev, search: true }));
        const result = await runAction("search_file_with_location", { filename: searchQuery });
        setLoading(prev => ({ ...prev, search: false }));
        if (result.ok || result.result) {
            setResults(prev => ({ ...prev, search: result.result }));
        }
    };

    const handleReadTextFile = async () => {
        if (!textFilePath.trim()) return;
        setLoading(prev => ({ ...prev, textFile: true }));
        const result = await runAction("read_text_file", { filepath: textFilePath });
        setLoading(prev => ({ ...prev, textFile: false }));
        if (result.ok || result.result) {
            setResults(prev => ({ ...prev, textFile: result.result }));
        }
    };

    const handleReadPdf = async () => {
        if (!pdfFilePath.trim()) return;
        setLoading(prev => ({ ...prev, pdfFile: true }));
        const result = await runAction("read_pdf_file", { filepath: pdfFilePath });
        setLoading(prev => ({ ...prev, pdfFile: false }));
        if (result.ok || result.result) {
            setResults(prev => ({ ...prev, pdfFile: result.result }));
        }
    };

    const handleTakeScreenshot = async () => {
        setLoading(prev => ({ ...prev, screenshot: true }));
        const result = await runAction("take_screenshot", {});
        setLoading(prev => ({ ...prev, screenshot: false }));
        if (result.ok) {
            setResults(prev => ({ ...prev, screenshot: result.result || "Screenshot saved successfully" }));
        }
    };

    const clearResults = () => setResults({});

    return (
        <div className="page files-page">
            <div className="page-header">
                <h1>
                    <Icon name="Files" size={28} />
                    Files Manager
                </h1>
                <p className="subtitle">Create folders, search files, and read documents</p>
            </div>

            {/* Quick Actions */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Zap" size={20} />
                    Quick Actions
                </h2>
                <div className="button-group">
                    <button
                        className="btn btn-success"
                        onClick={handleTakeScreenshot}
                        disabled={loading.screenshot}
                    >
                        <Icon name="Screenshot" size={16} />
                        {loading.screenshot ? "Taking..." : "Take Screenshot"}
                    </button>
                </div>
            </section>

            {/* Create Folder */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="FolderPlus" size={20} />
                    Create Folder
                </h2>
                <div className="input-group">
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter folder name..."
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleCreateFolder()}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleCreateFolder}
                        disabled={loading.folder || !folderName.trim()}
                    >
                        <Icon name="FolderPlus" size={16} />
                        {loading.folder ? "Creating..." : "Create"}
                    </button>
                </div>
                <p className="help-text">Creates a folder on your Desktop</p>
            </section>

            {/* Search Files */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="Search" size={20} />
                    Search Files
                </h2>
                <div className="input-group">
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter filename to search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleSearch}
                        disabled={loading.search || !searchQuery.trim()}
                    >
                        <Icon name="Search" size={16} />
                        {loading.search ? "Searching..." : "Search"}
                    </button>
                </div>
            </section>

            {/* Read Text File */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="File" size={20} />
                    Read Text File
                </h2>
                <div className="input-group">
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter full file path (e.g., C:\Users\You\file.txt)"
                        value={textFilePath}
                        onChange={(e) => setTextFilePath(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleReadTextFile()}
                    />
                    <button
                        className="btn btn-secondary"
                        onClick={handleReadTextFile}
                        disabled={loading.textFile || !textFilePath.trim()}
                    >
                        <Icon name="File" size={16} />
                        {loading.textFile ? "Reading..." : "Read"}
                    </button>
                </div>
            </section>

            {/* Read PDF */}
            <section className="card">
                <h2 className="card-title">
                    <Icon name="File" size={20} />
                    Read PDF
                </h2>
                <div className="input-group">
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter PDF file path (reads first 3 pages)"
                        value={pdfFilePath}
                        onChange={(e) => setPdfFilePath(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleReadPdf()}
                    />
                    <button
                        className="btn btn-secondary"
                        onClick={handleReadPdf}
                        disabled={loading.pdfFile || !pdfFilePath.trim()}
                    >
                        <Icon name="File" size={16} />
                        {loading.pdfFile ? "Reading..." : "Read PDF"}
                    </button>
                </div>
            </section>

            {/* Results Display */}
            {Object.keys(results).length > 0 && (
                <section className="card">
                    <div className="card-header-row">
                        <h2 className="card-title">
                            <Icon name="File" size={20} />
                            Results
                        </h2>
                        <button className="btn btn-sm btn-secondary" onClick={clearResults}>
                            Clear
                        </button>
                    </div>
                    <div className="results-display">
                        {Object.entries(results).map(([key, value]) => (
                            <div key={key} className="result-item">
                                <strong>{key}:</strong>
                                <pre>{typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}</pre>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
