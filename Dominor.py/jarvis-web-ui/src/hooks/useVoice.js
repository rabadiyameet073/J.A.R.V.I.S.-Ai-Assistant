// Voice Recognition Hook for JARVIS
import { useState, useEffect, useCallback, useRef } from "react";

export function useVoiceRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [hasPermission, setHasPermission] = useState(null); // null = not checked, true/false
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);

    // Check if browser supports speech recognition
    const isSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    // Request microphone permission
    const requestPermission = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately, we just needed permission
            setHasPermission(true);
            setError(null);
            return true;
        } catch (err) {
            console.error("Microphone permission denied:", err);
            setHasPermission(false);
            setError("Microphone permission denied. Please allow microphone access.");
            return false;
        }
    }, []);

    // Initialize recognition
    useEffect(() => {
        if (!isSupported) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            setIsListening(false);
        };

        recognitionRef.current.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setError(`Voice error: ${event.error}`);
            setIsListening(false);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [isSupported]);

    // Start listening
    const startListening = useCallback(() => {
        if (!recognitionRef.current || !hasPermission) return;

        setTranscript("");
        setError(null);
        setIsListening(true);

        try {
            recognitionRef.current.start();
        } catch (err) {
            console.error("Failed to start recognition:", err);
            setIsListening(false);
        }
    }, [hasPermission]);

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    return {
        isSupported,
        isListening,
        transcript,
        hasPermission,
        error,
        requestPermission,
        startListening,
        stopListening,
    };
}
