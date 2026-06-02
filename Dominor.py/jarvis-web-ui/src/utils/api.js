// API utility functions for JARVIS Web UI
// Backend: FastAPI on :8000  |  WebSocket: ws://localhost:8000/ws

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "http://localhost:8000";
const WS_ORIGIN = API_ORIGIN.replace(/^http/, "ws");

// ── Action name aliases ────────────────────────────────────────────────────
// Map legacy action names used by React pages → new backend action names
const ACTION_ALIASES = {
    // System
    "get_system_info":         "system_info",
    "get_battery_status":      "system_info",
    "get_ip_address":          "check_internet",
    "check_internet_connection": "check_internet",
    "get_date_day_info":       "time",
    "take_screenshot":         "screenshot",
    "get_motivational_quote":  "motivational_quote",
    "open_application":        "open_app",
    "open_whatsapp":           "open_app",
    // Music
    "play_song_by_name":       "play_music",
    "play_letter_song":        "play_music",
    "stop_all_music":          "stop_music",
    // Communication
    "whatsapp_call":           "send_whatsapp",
    "send_email_via_jarvis":   "send_email",
    "google_search_query":     "web_search",
    // Timers
    "voice_calculator":        "calculate",
};

function resolveAction(action, args) {
    const mapped = ACTION_ALIASES[action] || action;
    // Fix args key alignment
    if (action === "open_application") {
        return { action: mapped, args: { app_name: args.app_name || args.query || "" } };
    }
    if (action === "get_motivational_quote") {
        return { action: mapped, args: { query: "give me a motivational quote" } };
    }
    if (action === "play_letter_song") {
        return { action: mapped, args: { query: args.letter || args.query || "" } };
    }
    return { action: mapped, args };
}

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
    const resolved = resolveAction(action, args);
    const payload = { action: resolved.action, args: resolved.args };
    try {
        const res = await fetchWithTimeout(`${API_ORIGIN}/api/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }, 15000);

        const data = await res.json();
        return { ok: res.ok, ...data };
    } catch (e) {
        return { ok: false, error: e.message, detail: e.message };
    }
}

/**
 * Send a natural language command through the full pipeline
 * @param {string} text - Natural language command
 * @param {boolean} speak - Whether to also TTS the response
 */
export async function sendNLCommand(text, speak = true) {
    try {
        const res = await fetchWithTimeout(`${API_ORIGIN}/api/command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, speak }),
        }, 20000);
        const data = await res.json();
        return { ok: res.ok, ...data };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

/**
 * Direct endpoint calls for specific modules
 */
export const api = {
    // System
    systemInfo:    () => fetchWithTimeout(`${API_ORIGIN}/api/system/info`).then(r => r.json()),
    powerControl:  (action, delay = 0) => fetchWithTimeout(`${API_ORIGIN}/api/system/power`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, delay }),
    }).then(r => r.json()),
    volumeControl: (action, level) => fetchWithTimeout(`${API_ORIGIN}/api/system/volume`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, level }),
    }).then(r => r.json()),
    openApp:       (name) => fetchWithTimeout(`${API_ORIGIN}/api/system/open-app`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_name: name }),
    }).then(r => r.json()),
    openWebsite:   (site) => fetchWithTimeout(`${API_ORIGIN}/api/system/open-website`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site }),
    }).then(r => r.json()),
    network:       () => fetchWithTimeout(`${API_ORIGIN}/api/system/network`).then(r => r.json()),

    // Music
    playMusic:     (query, dir) => {
        const q = query != null ? String(query) : "";
        const random = q.toLowerCase() === "random";
        return fetchWithTimeout(`${API_ORIGIN}/api/music/play`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: random ? null : q,
                action: random ? "random" : "play",
                music_dir: dir,
            }),
        }).then(r => r.json());
    },
    stopMusic:     () => fetchWithTimeout(`${API_ORIGIN}/api/music/stop`, { method: "POST" }).then(r => r.json()),
    pauseMusic:    () => fetchWithTimeout(`${API_ORIGIN}/api/music/pause`, { method: "POST" }).then(r => r.json()),
    resumeMusic:   () => fetchWithTimeout(`${API_ORIGIN}/api/music/resume`, { method: "POST" }).then(r => r.json()),
    musicStatus:   () => fetchWithTimeout(`${API_ORIGIN}/api/music/status`).then(r => r.json()),
    listSongs:     (limit = 50) => fetchWithTimeout(`${API_ORIGIN}/api/music/list?limit=${limit}`).then(r => r.json()),

    // Files
    createFolder:  (name, path) => fetchWithTimeout(`${API_ORIGIN}/api/files/create-folder`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_name: name, parent_path: path }),
    }).then(r => r.json()),
    searchFile:    (q, path) => fetchWithTimeout(`${API_ORIGIN}/api/files/search`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: q, search_path: path }),
    }).then(r => r.json()),
    screenshot:    () => fetchWithTimeout(`${API_ORIGIN}/api/files/screenshot`, { method: "POST" }).then(r => r.json()),
    openFolder:    (path) => fetchWithTimeout(`${API_ORIGIN}/api/files/open-folder?path=${encodeURIComponent(path)}`, {
        method: "POST",
    }).then(r => r.json()),
    desktopFiles:  () => fetchWithTimeout(`${API_ORIGIN}/api/files/desktop`).then(r => r.json()),
    readFile:      (filepath, maxChars = 2000) => fetchWithTimeout(`${API_ORIGIN}/api/files/read`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath, max_chars: maxChars }),
    }).then(r => r.json()),

    // Communication
    sendWhatsApp:  (contact, message) => fetchWithTimeout(`${API_ORIGIN}/api/communication/whatsapp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_name: contact, message, action: "message" }),
    }).then(r => r.json()),
    getContacts:   () => fetchWithTimeout(`${API_ORIGIN}/api/communication/contacts`).then(r => r.json()),
    webSearch:     (q) => fetchWithTimeout(`${API_ORIGIN}/api/communication/search?query=${encodeURIComponent(q)}`, { method: "POST" }).then(r => r.json()),
    sendEmail:     (toEmail, subject, body) => fetchWithTimeout(`${API_ORIGIN}/api/communication/email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_email: toEmail, subject, body }),
    }).then(r => r.json()),

    // Timers
    setTimer:      (duration, label) => fetchWithTimeout(`${API_ORIGIN}/api/timers/set`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration, label }),
    }).then(r => r.json()),
    setAlarm:      (time_str, label) => fetchWithTimeout(`${API_ORIGIN}/api/timers/alarm`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time_str, label }),
    }).then(r => r.json()),
    calculate:     (expression) => fetchWithTimeout(`${API_ORIGIN}/api/timers/calculate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression }),
    }).then(r => r.json()),
    weather:       (city = "", days = 1) => fetchWithTimeout(`${API_ORIGIN}/api/timers/weather`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, days }),
    }).then(r => r.json()),
    listTimers:    () => fetchWithTimeout(`${API_ORIGIN}/api/timers/list`).then(r => r.json()),
    cancelTimer:   (id) => fetchWithTimeout(`${API_ORIGIN}/api/timers/cancel/${id}`, { method: "POST" }).then(r => r.json()),

    // AI
    aiChat:        (message) => fetchWithTimeout(`${API_ORIGIN}/api/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
    }, 30000).then(r => r.json()),
    aiQuote:       () => fetchWithTimeout(`${API_ORIGIN}/api/ai/quote`, {}, 25000).then(r => r.json()),
    resetChat:     () => fetchWithTimeout(`${API_ORIGIN}/api/ai/reset`, { method: "POST" }).then(r => r.json()),

    // Voice
    voiceStatus:   () => fetchWithTimeout(`${API_ORIGIN}/api/voice/status`).then(r => r.json()),
    startListening:() => fetchWithTimeout(`${API_ORIGIN}/api/voice/start`, { method: "POST" }).then(r => r.json()),
    stopListening: () => fetchWithTimeout(`${API_ORIGIN}/api/voice/stop`, { method: "POST" }).then(r => r.json()),
    listenOnce:    () => fetchWithTimeout(`${API_ORIGIN}/api/voice/listen`, {}, 20000).then(r => r.json()),

    // Settings
    getSettings:        () => fetchWithTimeout(`${API_ORIGIN}/api/settings/`).then(r => r.json()),
    listVoices:         () => fetchWithTimeout(`${API_ORIGIN}/api/settings/voices`).then(r => r.json()),
    saveVoiceSettings:  (tts_rate, tts_volume, wake_word, asr_language) => fetchWithTimeout(`${API_ORIGIN}/api/settings/voice`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            tts_rate, tts_volume, wake_word,
            ...(asr_language != null && asr_language !== "" ? { asr_language } : {}),
        }),
    }).then(r => r.json()),
    testVoice:          (text) => fetchWithTimeout(`${API_ORIGIN}/api/settings/test-voice${text ? `?text=${encodeURIComponent(text)}` : ""}`, {
        method: "POST",
    }).then(r => r.json()),

    // ── AI Automation — Feature 1: Smart App Launcher ──────────────────────
    launchApp: (appName) => fetchWithTimeout(`${API_ORIGIN}/api/automation/launch-app`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_name: appName }),
    }).then(r => r.json()),
    appSuggestions: (q = "", limit = 10) =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/app-suggestions?q=${encodeURIComponent(q)}&limit=${limit}`)
            .then(r => r.json()),
    launchHistory: (limit = 10) =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/launch-history?limit=${limit}`)
            .then(r => r.json()),

    // ── AI Automation — Feature 2: Prompt Generator ────────────────────────
    promptCategories: () =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/prompt-categories`).then(r => r.json()),
    promptTemplates: (category) =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/prompt-templates?category=${encodeURIComponent(category)}`)
            .then(r => r.json()),
    getPromptTemplate: (category, templateName) =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/prompt-template?category=${encodeURIComponent(category)}&template_name=${encodeURIComponent(templateName)}`)
            .then(r => r.json()),
    allTemplates: () =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/all-templates`).then(r => r.json()),
    generatePrompt: (category, templateName, variables, enhanceWithAi = false) =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/generate-prompt`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category, template_name: templateName, variables, enhance_with_ai: enhanceWithAi }),
        }).then(r => r.json()),
    quickPrompt: (description) =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/quick-prompt`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description }),
        }).then(r => r.json()),

    // ── AI Automation — Feature 3: Tool Integration ────────────────────────
    clipboardRead: () =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/clipboard-read`).then(r => r.json()),
    clipboardWrite: (text) =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/clipboard-write`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        }).then(r => r.json()),
    typeText: (text, interval = 0.03) =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/type-text`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, interval }),
        }).then(r => r.json()),
    runCommand: (command, timeout = 15) =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/run-command`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command, timeout }),
        }).then(r => r.json()),
    generateInject: (category, templateName, variables, targetApp = null, action = "clipboard") =>
        fetchWithTimeout(`${API_ORIGIN}/api/automation/generate-inject`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category, template_name: templateName, variables, target_app: targetApp, action }),
        }, 20000).then(r => r.json()),
};

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
