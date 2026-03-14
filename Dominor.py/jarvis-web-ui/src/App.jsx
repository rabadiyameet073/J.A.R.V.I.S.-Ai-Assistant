// App.jsx - Main application with routing
import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard";
import Music from "./pages/Music";
import System from "./pages/System";
import Files from "./pages/Files";
import Communication from "./pages/Communication";
import Timers from "./pages/Timers";
import AIChat from "./pages/AIChat";
import Settings from "./pages/Settings";
import "./App.css";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="music" element={<Music />} />
                <Route path="system" element={<System />} />
                <Route path="files" element={<Files />} />
                <Route path="communication" element={<Communication />} />
                <Route path="timers" element={<Timers />} />
                <Route path="ai-chat" element={<AIChat />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}
