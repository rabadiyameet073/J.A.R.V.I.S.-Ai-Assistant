import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../Icons/Icons";
import { sendNLCommand, api, speak } from "../../utils/api";

const WEB_WAKE_WORD_KEY = "jarvis_web_wake_word";

// ── Voice Nav shortcuts (longest-match first) ──────────────────────────────
const voiceNavCommands = [
    ["open ai chat",          "/ai-chat"],
    ["go to ai chat",         "/ai-chat"],
    ["open chat",             "/ai-chat"],
    ["go to chat",            "/ai-chat"],
    ["ai chat",               "/ai-chat"],
    ["open automation",       "/ai-automation"],
    ["go to automation",      "/ai-automation"],
    ["ai automation",         "/ai-automation"],
    ["app launcher",          "/ai-automation"],
    ["prompt generator",      "/ai-automation"],
    ["open communication",    "/communication"],
    ["go to communication",   "/communication"],
    ["communication",         "/communication"],
    ["go to music",           "/music"],
    ["open music",            "/music"],
    ["music page",            "/music"],
    ["music",                 "/music"],
    ["go to system",          "/system"],
    ["open system",           "/system"],
    ["system monitor",        "/system"],
    ["system info",           "/system"],
    ["go to files",           "/files"],
    ["file manager",          "/files"],
    ["open files",            "/files"],
    ["email",                 "/communication"],
    ["whatsapp",              "/communication"],
    ["go to timers",          "/timers"],
    ["open timers",           "/timers"],
    ["timer page",            "/timers"],
    ["timers",                "/timers"],
    ["alarm",                 "/timers"],
    ["calculator",            "/timers"],
    ["open settings",         "/settings"],
    ["go to settings",        "/settings"],
    ["settings",              "/settings"],
    ["dashboard",             "/"],
    ["main page",             "/"],
    ["home page",             "/"],
    ["go home",               "/"],
    ["home",                  "/"],
];

function getWakeWord() {
    if (typeof window === "undefined") return "jarvis";
    const v = localStorage.getItem(WEB_WAKE_WORD_KEY);
    const s = (v || "jarvis").trim().toLowerCase();
    return s || "jarvis";
}

function stripWakePhrase(cmd, wakeWord) {
    // Accept:
    // - "hey/hello/hi jarvis <cmd>"
    // - "jarvis <cmd>"
    // - common ASR variations: jarvish / jarvice
    const wake = (wakeWord || "jarvis").trim().toLowerCase() || "jarvis";
    const wakeVariants = Array.from(new Set([wake, "jarvis", "jarvish", "jarvice"]));
    const greetings = ["hey", "hello", "hi"];
    const prefixes = [];
    for (const w of wakeVariants) {
        prefixes.push(w);
        for (const g of greetings) prefixes.push(`${g} ${w}`);
    }
    for (const p of prefixes) {
        if (cmd === p) return "";
        if (cmd.startsWith(`${p} `)) return cmd.slice(p.length).trim();
    }
    return null; // wake phrase missing
}

// ── Direct music voice actions ─────────────────────────────────────────────
function parseMusicCommand(cmd) {
    // "play [song name]"
    const playMatch = cmd.match(/^play\s+(.+)$/);
    if (playMatch) {
        const query = playMatch[1].trim();
        if (/^(random|a random song|something random|shuffle)$/.test(query)) {
            return { musicAction: "random", query: null };
        }
        return { musicAction: "play", query };
    }
    if (/^(stop|stop music|stop song|stop the music|stop the song|stop playing|end music|end song|cancel music)$/.test(cmd)) {
        return { musicAction: "stop" };
    }
    if (/^(pause|pause music|pause song|pause the music|hold on)$/.test(cmd)) {
        return { musicAction: "pause" };
    }
    if (/^(resume|resume music|resume song|continue music|continue song|unpause|resume playing|keep playing)$/.test(cmd)) {
        return { musicAction: "resume" };
    }
    if (/^(random|random song|play random|shuffle|shuffle music)$/.test(cmd)) {
        return { musicAction: "random" };
    }
    if (/^(next|next song|next track|skip|skip song|skip track)$/.test(cmd)) {
        return { musicAction: "next" };
    }
    if (/^(previous|previous song|previous track|last song|go back|back song|earlier song)$/.test(cmd)) {
        return { musicAction: "previous" };
    }
    return null;
}

function isScreenshotCommand(cmd) {
    return /^(take\s+)?(a\s+)?(screen\s*shot|screenshot|screen\s+capture|capture\s+screen|screen\s+grab)\b/.test(cmd);
}

function pageForCommand(cmd) {
    const c = (cmd || "").toLowerCase();
    if (!c) return null;
    if (parseMusicCommand(c)) return "/music";
    if (isScreenshotCommand(c) || /\b(files?|folder|read file|search file|create folder)\b/.test(c)) return "/files";
    if (/\b(ip address|system info|cpu|ram|battery|disk|volume|internet|network|wifi|bluetooth)\b/.test(c)) return "/system";
    if (/\b(whatsapp|email|call|message)\b/.test(c)) return "/communication";
    if (/\b(timer|alarm|stopwatch|weather)\b/.test(c)) return "/timers";
    if (/\b(ai chat|chat|ask ai|chatgpt)\b/.test(c)) return "/ai-chat";
    if (/\b(automation|prompt generator|prompt)\b/.test(c)) return "/ai-automation";
    if (/\b(settings?)\b/.test(c)) return "/settings";
    return null;
}

export default function VoiceAssistant({
    wsConnected,
    wsLastMessage,
    sendWsMessage,
    onAssistantEvent,
}) {
    const navigate     = useNavigate();
    const [isListening, setIsListening]     = useState(false);
    const [isOpen, setIsOpen]               = useState(false);
    const [statusText, setStatusText]       = useState("Ready");
    const [jarvisResponse, setJarvisResponse] = useState("");
    const [processing, setProcessing]       = useState(false);
    const [lastUserSaid, setLastUserSaid]   = useState("");
    const [voiceHistory, setVoiceHistory]   = useState([]);
    const processingTimer                   = useRef(null);
    const autoCloseTimer                    = useRef(null);
    const recognitionRef                    = useRef(null);

    const speakText = useCallback((text) => {
        const t = (text || "").trim();
        if (!t) return;

        // 1) Prefer backend TTS (keeps voice consistent with desktop Jarvis).
        // 2) Fallback to browser TTS so "Jarvis is online" is ALWAYS spoken.
        void speak(t).then((res) => {
            const failed = res?.ok === false || Boolean(res?.error) || Boolean(res?.detail);
            if (!failed) return;
            if (typeof window === "undefined") return;
            if (!("speechSynthesis" in window)) return;

            try {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(t);
                u.lang = "en-US";
                u.rate = 1.0;
                u.pitch = 1.0;
                window.speechSynthesis.speak(u);
            } catch (_) {}
        }).catch(() => {
            if (typeof window === "undefined") return;
            if (!("speechSynthesis" in window)) return;
            try {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(t);
                u.lang = "en-US";
                window.speechSynthesis.speak(u);
            } catch (_) {}
        });
    }, []);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const startProcessingTimeout = useCallback(() => {
        clearTimeout(processingTimer.current);
        processingTimer.current = setTimeout(() => {
            setProcessing(false);
            setStatusText("Ready");
        }, 15000);
    }, []);

    const scheduleAutoClose = useCallback(() => {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = setTimeout(() => setIsOpen(false), 14000);
    }, []);

    const showResponse = useCallback((text, status = "JARVIS") => {
        clearTimeout(processingTimer.current);
        setProcessing(false);
        setStatusText(status);
        setJarvisResponse(text);
        setIsOpen(true);
        setVoiceHistory(prev => [...prev.slice(-4), { user: lastUserSaid, jarvis: text }]);
        scheduleAutoClose();
        onAssistantEvent?.({ type: "assistant", text, status });
    }, [scheduleAutoClose, lastUserSaid]);

    const executeVoiceCommand = useCallback((raw, requireWakeWord = true) => {
        if (!raw) return;
        const cmd0 = raw.toLowerCase().trim();
        const wakeWord = getWakeWord();
        const stripped = requireWakeWord ? stripWakePhrase(cmd0, wakeWord) : cmd0;

        // If wake phrase missing, do nothing (avoid accidental triggers)
        if (stripped === null) {
            setLastUserSaid(raw);
            setStatusText(`You: "${raw}"`);
            setJarvisResponse("");
            setProcessing(false);
            setIsOpen(true);
            showResponse(`Say "hey ${wakeWord}" first.`, "Wake word");
            onAssistantEvent?.({ type: "user", text: raw });
            onAssistantEvent?.({ type: "system", text: `Wake-word missing (expected: hey ${wakeWord})` });
            return;
        }

        // Wake-only: "hey jarvis" → "Yes sir."
        if (stripped === "") {
            setLastUserSaid(raw);
            setStatusText(`You: "${raw}"`);
            setJarvisResponse("");
            setProcessing(false);
            setIsOpen(true);
            onAssistantEvent?.({ type: "user", text: raw });
            const greeting =
                "Hello sir. I am Jarvis — your personal AI assistant. I am available for you 24 hours a day and 7 days a week. What can I do for you, sir?";
            showResponse(greeting, "JARVIS");
            speakText(greeting);
            return;
        }

        const cmd = stripped;
        setLastUserSaid(raw);
        setStatusText(`You: "${raw}"`);
        setJarvisResponse("");
        setProcessing(true);
        setIsOpen(true);
        startProcessingTimeout();
        onAssistantEvent?.({ type: "user", text: raw });

        // Auto-open the relevant page for the command (keeps the web flow consistent)
        const page = pageForCommand(cmd);
        if (page && window.location.pathname !== page) {
            navigate(page);
        }

        // Navigation shortcuts + backend execution
        let navigated = false;
        for (const [key, path] of voiceNavCommands) {
            if (cmd.includes(key)) {
                showResponse(`Navigating to ${path === "/" ? "dashboard" : path.replace("/", "").replace("-", " ")}…`);
                setTimeout(() => navigate(path), 500);
                navigated = true;
                break;
            }
        }

        // Check if on AI chat page — inject into chat input
        if (window.location.pathname.includes("ai-chat")) {
            const chatInput = document.querySelector(".chat-input");
            if (chatInput) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, "value"
                ).set;
                nativeInputValueSetter.call(chatInput, raw);
                chatInput.dispatchEvent(new Event("input", { bubbles: true }));
                // Also trigger send after short delay
                setTimeout(() => {
                    const sendBtn = document.querySelector(".send-btn[data-primary]");
                    if (sendBtn) sendBtn.click();
                }, 300);
            }
        }

        // Send to backend (WS or HTTP)
        if (wsConnected) {
            sendWsMessage({ type: "command", message: cmd });
        } else {
            sendNLCommand(cmd, true).then(res => {
                showResponse(
                    res.message || res.response || (navigated ? "Done." : "I couldn't process that.")
                );
            }).catch(() => {
                const warnMsg = "Please setup locally and make the API status on.";
                showResponse(warnMsg, "Offline Warning");
                speakText(warnMsg);
            });
        }
    }, [
        wsConnected,
        sendWsMessage,
        navigate,
        showResponse,
        startProcessingTimeout,
        onAssistantEvent,
    ]);

    // ── Handle WebSocket backend messages ────────────────────────────────────
    useEffect(() => {
        if (!wsLastMessage) return;
        const data = wsLastMessage;
        const ch = data.channel;

        // Skip chat-channel messages (handled by AIChat page)
        if (ch === "chat" || ch === "aichat") return;

        if (data.type === "result" || data.type === "response") {
            const msg = data.message || data.response || data.result?.response || "Task complete.";
            showResponse(typeof msg === "string" ? msg : String(msg));
            onAssistantEvent?.({ type: "result", text: typeof msg === "string" ? msg : String(msg) });

            // Auto-navigate based on backend intent for a smoother web flow
            const intent = data.intent || data.result?.intent;
            const intentToPath = {
                media: "/music",
                screenshot: "/files",
                files: "/files",
                system_info: "/system",
                network: "/system",
                volume: "/system",
                communication: "/communication",
                timer: "/timers",
                alarm: "/timers",
                weather: "/timers",
                ai_chat: "/ai-chat",
                prompt_generation: "/ai-automation",
                automation: "/ai-automation",
            };
            const to = intentToPath[intent];
            if (to && window.location.pathname !== to) {
                navigate(to);
            }
        } else if (data.type === "pipeline_event") {
            setIsOpen(true);
            setProcessing(true);
            setStatusText("Processing…");
            setJarvisResponse(`[${data.stage || data.event}] ${data.message || ""}`);
            startProcessingTimeout();
            onAssistantEvent?.({ type: "pipeline_event", text: `[${data.stage || data.event}] ${data.message || ""}` });
        } else if (data.type === "error") {
            showResponse(`⚠ ${data.message}`, "Error");
            onAssistantEvent?.({ type: "error", text: data.message || "Error" });
        }
    }, [wsLastMessage, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Toggle mic on/off ─────────────────────────────────────────────────────
    const handleToggle = useCallback(async () => {
        if (isListening) {
            setIsListening(false);
            setStatusText("Ready");
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (_) {}
            }
            return;
        }

        setIsListening(true);
        setIsOpen(true);
        setLastUserSaid("");
        const boot = "Jarvis is online, sir.";
        setJarvisResponse(boot);
        speakText(boot);
        setProcessing(true);
        clearTimeout(autoCloseTimer.current);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setStatusText("Listening (browser mic)…");
            const rec = new SpeechRecognition();
            rec.lang = localStorage.getItem("jarvis_web_stt_lang") || "en-US";
            rec.interimResults = false;
            rec.maxAlternatives = 1;

            rec.onresult = (e) => {
                const heard = e.results[0][0].transcript;
                setIsListening(false);
                if (heard) {
                    executeVoiceCommand(heard, false);
                } else {
                    setProcessing(false);
                    setStatusText("No speech detected");
                    showResponse("I did not hear a clear command. Please try again.", "Listening");
                }
            };

            rec.onerror = (e) => {
                console.error("Browser speech recognition error", e);
                if (e.error === "not-allowed") {
                    setProcessing(false);
                    setIsListening(false);
                    setStatusText("Microphone permission denied");
                    showResponse("Microphone access denied by browser settings.", "Error");
                } else {
                    fallbackToBackendMic();
                }
            };

            rec.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = rec;
            try {
                rec.start();
            } catch (err) {
                console.error("Failed to start speech recognition", err);
                fallbackToBackendMic();
            }
        } else {
            fallbackToBackendMic();
        }
    }, [isListening, speakText, showResponse, executeVoiceCommand]);

    const fallbackToBackendMic = async () => {
        setStatusText("Listening (backend mic)…");
        try {
            const listenRes = await api.listenOnce();
            const heard = (listenRes?.message || "").trim();
            if (!heard || !listenRes?.success) {
                setProcessing(false);
                setStatusText("No speech detected");
                showResponse("I did not hear a clear command. Please try again.", "Listening");
                return;
            }
            executeVoiceCommand(heard, false);
        } catch (_) {
            setProcessing(false);
            setStatusText("Backend mic error");
            const warnMsg = "Backend voice listener failed. Please setup locally and make the API status on.";
            showResponse(warnMsg, "Error");
            speakText(warnMsg);
        } finally {
            setIsListening(false);
        }
    };

    // ── Spacebar shortcut (when not typing in an input) ──────────────────────
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.code !== "Space") return;
            if (e.repeat) return;
            const tag = document.activeElement?.tagName?.toLowerCase();
            if (["input", "textarea", "select"].includes(tag)) return;
            e.preventDefault();
            handleToggle();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [handleToggle]);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => () => {
        clearTimeout(processingTimer.current);
        clearTimeout(autoCloseTimer.current);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (_) {}
        }
    }, []);

    const wsLabel = wsConnected
        ? "🟢 Live — WebSocket connected"
        : "🟡 HTTP mode — WebSocket offline";

    const voiceCommands = [
        "play [song name]", "stop music", "stop song",
        "pause / resume", "next song", "previous song",
        "play random", "go to music", "open chat",
        "go home", "open settings", "go to files",
    ];

    return (
        <div className="voice-assistant-overlay">
            {isOpen && (
                <div className="voice-dialogue">
                    <div className="voice-dialogue-header">
                        <div className="va-header-icon">
                            <Icon name="AI" size={16} />
                        </div>
                        <span className="voice-status-text">{statusText}</span>
                        <button
                            className="close-btn"
                            onClick={() => setIsOpen(false)}
                            title="Close"
                        >
                            <Icon name="Close" size={16} />
                        </button>
                    </div>

                    {lastUserSaid && (
                        <div className="voice-you-said">
                            <Icon name="Mic" size={12} />
                            <span>"{lastUserSaid}"</span>
                        </div>
                    )}

                    <div className="voice-dialogue-content">
                        {processing && !jarvisResponse && (
                            <div className="processing-indicator">
                                <span /><span /><span />
                            </div>
                        )}
                        {jarvisResponse && (
                            <p className="jarvis-text">{jarvisResponse}</p>
                        )}
                        {!lastUserSaid && !processing && (
                            <div className="voice-hints">
                                <p className="voice-hint-title">Try saying:</p>
                                <div className="voice-hint-chips">
                                    {voiceCommands.map((c, i) => (
                                        <span key={i} className="voice-hint-chip">{c}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="voice-dialogue-footer">
                        <span className="ws-status-label">{wsLabel}</span>
                        <span className="voice-shortcut-hint">Space to toggle mic</span>
                    </div>
                </div>
            )}

            <button
                id="voice-orb-btn"
                className={`voice-orb${isListening ? " listening" : ""}${processing ? " processing" : ""}`}
                onClick={handleToggle}
                onContextMenu={e => { e.preventDefault(); setIsOpen(prev => !prev); }}
                title={isListening ? "Click to stop (or press Space)" : "Click to speak (or press Space)"}
                aria-label="Voice assistant"
            >
                <Icon name={isListening ? "Mic" : "Mic"} size={24} />
                {isListening && <div className="sonar-wave" />}
                {isListening && <div className="sonar-wave sonar-wave-2" />}
            </button>

            <style>{`
                .voice-assistant-overlay {
                    --primary-color: hsl(var(--primary, 190 100% 50%));
                    --accent-color: hsl(var(--accent, 195 100% 40%));
                    --primary-glow: rgba(0, 212, 255, 0.35);
                    --primary-glow-strong: rgba(0, 212, 255, 0.6);
                    --accent-glow: rgba(0, 137, 168, 0.45);
                    --bg-card: rgba(10, 10, 10, 0.85);
                    --border-color: hsl(var(--border, 0 0% 14%));
                    --border-light: rgba(255, 255, 255, 0.08);
                    --text-muted: hsl(var(--muted-foreground, 0 0% 50%));
                    --text-primary: #f3f4f6;
                    --text-accent: hsl(var(--primary, 190 100% 50%));
                    --shadow-glow: 0 0 30px rgba(0, 212, 255, 0.15);
                    --radius-lg: 16px;

                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.75rem;
                }
                /* ── Orb ── */
                .voice-orb {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    background: rgba(10, 10, 10, 0.8);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border: 3px solid var(--primary-color);
                    color: var(--primary-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 0 25px var(--primary-glow), inset 0 0 15px var(--primary-glow);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                    overflow: visible;
                    z-index: 2;
                }
                .voice-orb::before {
                    content: "";
                    position: absolute;
                    inset: -6px;
                    border-radius: 50%;
                    border: 1px solid var(--accent-color);
                    animation: orb-spin 8s linear infinite;
                    opacity: 0.5;
                }
                .voice-orb::after {
                    content: "";
                    position: absolute;
                    inset: -12px;
                    border-radius: 50%;
                    border: 1px dashed var(--primary-color);
                    animation: orb-spin 12s linear infinite reverse;
                    opacity: 0.3;
                }
                .voice-orb:hover {
                    transform: scale(1.15);
                    box-shadow: 0 0 40px var(--primary-glow-strong), inset 0 0 25px var(--primary-glow);
                    background: rgba(255, 255, 255, 0.05);
                }
                .voice-orb.listening {
                    border-color: var(--accent-color);
                    color: var(--accent-color);
                    box-shadow: 0 0 35px var(--accent-glow), inset 0 0 20px var(--accent-glow);
                    animation: orb-pulse-intense 0.8s infinite alternate;
                }
                .voice-orb.listening::before, .voice-orb.listening::after {
                    animation-duration: 3s;
                    border-color: var(--accent-color);
                    opacity: 0.8;
                }
                .voice-orb.processing {
                    border-color: var(--text-muted);
                    color: var(--text-muted);
                    box-shadow: 0 0 30px rgba(255,255,255,0.2), inset 0 0 15px rgba(255,255,255,0.1);
                    animation: orb-pulse 1.5s linear infinite;
                }
                .sonar-wave {
                    position: absolute;
                    inset: -4px;
                    border-radius: 50%;
                    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 60%);
                    z-index: -1;
                    animation: sonar 1s ease-out infinite;
                }
                .sonar-wave-2 {
                    animation-delay: 0.5s;
                }
                /* ── Dialogue ── */
                .voice-dialogue {
                    width: 360px;
                    background: var(--bg-card);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: var(--shadow-lg), var(--shadow-glow);
                    transform-origin: bottom right;
                    animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .voice-dialogue-header {
                    padding: 12px 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 13px;
                    color: var(--primary-color);
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }
                .va-header-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: transparent;
                    border: 1px solid var(--primary-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 10px var(--primary-glow);
                }
                .voice-status-text {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .close-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 6px;
                    transition: all 0.2s;
                }
                .close-btn:hover { background: rgba(255,255,255,0.1); color: var(--primary-color); }
                .voice-you-said {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    font-size: 13px;
                    color: var(--accent-color);
                    font-style: italic;
                }
                .voice-dialogue-content {
                    padding: 16px;
                    min-height: 80px;
                    color: var(--text-primary);
                    font-size: 14px;
                    line-height: 1.6;
                }
                .jarvis-text { margin: 0; word-break: break-word; text-shadow: 0 0 5px rgba(255,255,255,0.3); }
                .processing-indicator {
                    display: flex;
                    gap: 6px;
                    align-items: center;
                    height: 28px;
                }
                .processing-indicator span {
                    width: 10px;
                    height: 10px;
                    background: var(--primary-color);
                    border-radius: 50%;
                    animation: dot-bounce 1.4s infinite ease-in-out both;
                    box-shadow: 0 0 10px var(--primary-color);
                }
                .processing-indicator span:nth-child(1) { animation-delay: -0.32s; }
                .processing-indicator span:nth-child(2) { animation-delay: -0.16s; }
                .voice-hints { }
                .voice-hint-title {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin: 0 0 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
                .voice-hint-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .voice-hint-chip {
                    padding: 4px 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border-light);
                    border-radius: 20px;
                    font-size: 12px;
                    color: var(--text-accent);
                    transition: all 0.2s;
                }
                .voice-hint-chip:hover {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 10px var(--primary-glow);
                    background: rgba(255, 255, 255, 0.1);
                }
                .voice-dialogue-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 16px;
                    background: rgba(0,0,0,0.2);
                    border-top: 1px solid var(--border-color);
                    font-size: 11px;
                    color: var(--text-muted);
                }
                .voice-shortcut-hint { color: var(--text-muted); }
                /* ── Keyframes ── */
                @keyframes orb-pulse {
                    0%, 100% { transform: scale(1); }
                    50%       { transform: scale(1.05); }
                }
                @keyframes orb-pulse-intense {
                    0%   { transform: scale(1); box-shadow: 0 0 20px var(--accent-glow), inset 0 0 10px var(--accent-glow); }
                    100% { transform: scale(1.1); box-shadow: 0 0 50px var(--accent-color), inset 0 0 30px var(--accent-color); }
                }
                @keyframes orb-spin  { 100% { transform: rotate(360deg); } }
                @keyframes sonar {
                    0%   { transform: scale(1);   opacity: 0.8; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                @keyframes slide-up {
                    0%   { opacity: 0; transform: translateY(20px) scale(0.9); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes dot-bounce {
                    0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
                    40%           { transform: scale(1); opacity: 1; }
                }

                /* ── Mobile responsiveness ── */
                @media (max-width: 768px) {
                    .voice-assistant-overlay {
                        bottom: 1rem;
                        right: 1rem;
                    }
                    .voice-orb {
                        width: 60px;
                        height: 60px;
                        border-width: 2px;
                    }
                    .voice-orb::before { inset: -4px; }
                    .voice-orb::after { inset: -8px; }
                    .voice-dialogue {
                        width: calc(100vw - 2rem);
                        max-width: 340px;
                    }
                }
            `}</style>
        </div>
    );
}
