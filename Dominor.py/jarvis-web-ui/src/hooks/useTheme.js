// Theme hook for dark/light mode
import { useState, useEffect, useCallback } from "react";

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem("jarvis-theme");
        return saved || "dark";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("jarvis-theme", theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    return { theme, setTheme, toggleTheme };
}
