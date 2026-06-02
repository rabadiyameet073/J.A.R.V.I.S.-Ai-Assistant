// Activity logger hook
import { useState, useCallback } from "react";

export function useLogger() {
    const [logs, setLogs] = useState([]);

    const append = useCallback((message, type = "info") => {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            message,
            type, // "info", "success", "error", "warning"
        };
        setLogs((prev) => [entry, ...prev].slice(0, 100)); // Keep last 100 entries
    }, []);

    const clear = useCallback(() => {
        setLogs([]);
    }, []);

    const getLogText = useCallback(() => {
        return logs
            .map((l) => `${l.timestamp} [${l.type.toUpperCase()}] ${l.message}`)
            .join("\n");
    }, [logs]);

    return { logs, append, clear, getLogText };
}
