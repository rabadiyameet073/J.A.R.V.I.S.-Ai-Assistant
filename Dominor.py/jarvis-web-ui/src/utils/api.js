// API utility functions for JARVIS Web UI

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "http://localhost:8000";
const WS_ORIGIN = API_ORIGIN.replace(/^http/, "ws");

// Helper to add timeout to fetch
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out - API may be slow or offline');
        }
        throw error;
    }
}

/**
 * Check API status
 */
export async function checkApiStatus() {
    try {
        const res = await fetchWithTimeout(`${API_ORIGIN}/api/status`, {}, 5000);
        if (res.ok) {
            const data = await res.json();
            return { online: true, ...data };
        }
        return { online: false };
    } catch (e) {
        return { online: false, error: e.message };
    }
}

/**
 * Run a JARVIS action
 * @param {string} action - Function name to call
 * @param {object} args - Arguments to pass
 */
export async function runAction(action, args = {}) {
    const payload = { action, args };
    try {
        const res = await fetchWithTimeout(`${API_ORIGIN}/api/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }, 15000); // 15 second timeout for actions

        const data = await res.json();
        return { ok: res.ok, ...data };
    } catch (e) {
        return { ok: false, error: e.message, detail: e.message };
    }
}

/**
 * Get list of available functions
 */
export async function getFunctions() {
    try {
        const res = await fetchWithTimeout(`${API_ORIGIN}/api/functions`, {}, 5000);
        if (res.ok) {
            return await res.json();
        }
        return { functions: [], count: 0 };
    } catch (e) {
        return { functions: [], count: 0, error: e.message };
    }
}

/**
 * Make JARVIS speak text
 * @param {string} text - Text to speak
 */
export async function speak(text) {
    try {
        const res = await fetchWithTimeout(`${API_ORIGIN}/api/speak?text=${encodeURIComponent(text)}`, {
            method: "POST"
        }, 10000);
        return await res.json();
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

/**
 * Get music status
 */
export async function getMusicStatus() {
    try {
        const res = await fetchWithTimeout(`${API_ORIGIN}/api/music/status`, {}, 5000);
        if (res.ok) {
            return await res.json();
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Get JARVIS greeting
 */
export async function getGreeting() {
    try {
        const res = await fetchWithTimeout(`${API_ORIGIN}/api/greet`, {}, 5000);
        if (res.ok) {
            const data = await res.json();
            return data.greeting;
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Send a chat message to JARVIS
 * @param {string} message - User message
 * @param {Array} history - Optional chat history
 */
export async function sendChatMessage(message, history = null) {
    try {
        const payload = { message };
        if (history) payload.history = history;

        const res = await fetchWithTimeout(`${API_ORIGIN}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }, 30000); // 30s timeout for AI responses

        const data = await res.json();
        return { ok: res.ok, ...data };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

/**
 * Send a natural language command
 * @param {string} message - Natural language command
 */
export async function sendCommand(message) {
    try {
        const res = await fetchWithTimeout(`${API_ORIGIN}/api/command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        }, 15000);

        const data = await res.json();
        return { ok: res.ok, ...data };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

/**
 * Create a WebSocket connection to JARVIS
 * @param {object} handlers - { onMessage, onOpen, onClose, onError }
 * @returns {{ send, close }} WebSocket control object
 */
export function createWebSocket(handlers = {}) {
    const ws = new WebSocket(`${WS_ORIGIN}/ws`);

    ws.onopen = () => {
        handlers.onOpen?.();
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handlers.onMessage?.(data);
        } catch {
            handlers.onMessage?.({ type: "raw", message: event.data });
        }
    };

    ws.onclose = () => {
        handlers.onClose?.();
    };

    ws.onerror = (err) => {
        handlers.onError?.(err);
    };

    return {
        send: (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(typeof data === "string" ? data : JSON.stringify(data));
            }
        },
        close: () => ws.close(),
        get readyState() { return ws.readyState; }
    };
}

export { API_ORIGIN, WS_ORIGIN };
