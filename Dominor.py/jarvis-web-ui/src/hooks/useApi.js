// Custom hook for API calls with loading and error states
import { useState, useCallback } from "react";
import { runAction as apiRunAction, checkApiStatus, speak } from "../utils/api";

export function useApi(logger) {
    const [loading, setLoading] = useState(false);
    const [apiStatus, setApiStatus] = useState("unknown");

    const checkStatus = useCallback(async () => {
        try {
            const result = await checkApiStatus();
            if (result.online) {
                setApiStatus("online");
                logger?.append("API connected successfully", "success");
            } else {
                setApiStatus("offline");
                logger?.append("API unreachable", "error");
            }
            return result;
        } catch (e) {
            setApiStatus("offline");
            logger?.append("Cannot connect to API", "error");
            return { online: false };
        }
    }, [logger]);

    const runAction = useCallback(async (action, args = {}) => {
        setLoading(true);
        logger?.append(`Calling: ${action} ${JSON.stringify(args)}`, "info");

        try {
            const result = await apiRunAction(action, args);
            if (result.ok) {
                logger?.append(`Success: ${JSON.stringify(result.result || result)}`, "success");
            } else {
                logger?.append(`Error: ${result.detail || result.error || "Unknown error"}`, "error");
            }
            return result;
        } catch (e) {
            logger?.append(`Network error: ${e.message}`, "error");
            const warnMsg = "Please setup locally and make the API status on.";
            void speak(warnMsg).then((res) => {
                const failed = res?.ok === false || Boolean(res?.error) || Boolean(res?.detail);
                if (!failed) return;
                if (typeof window === "undefined") return;
                if (!("speechSynthesis" in window)) return;
                try {
                    window.speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(warnMsg);
                    u.lang = "en-US";
                    window.speechSynthesis.speak(u);
                } catch (_) {}
            }).catch(() => {
                if (typeof window === "undefined") return;
                if (!("speechSynthesis" in window)) return;
                try {
                    window.speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(warnMsg);
                    u.lang = "en-US";
                    window.speechSynthesis.speak(u);
                } catch (_) {}
            });
            return { ok: false, error: e.message };
        } finally {
            setLoading(false);
        }
    }, [logger]);

    return { loading, apiStatus, checkStatus, runAction };
}
