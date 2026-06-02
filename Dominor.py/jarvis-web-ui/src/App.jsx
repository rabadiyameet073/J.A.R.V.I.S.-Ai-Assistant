import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard";
import AssistantDashboard from "./pages/AssistantDashboard";
import Music from "./pages/Music";
import System from "./pages/System";
import Files from "./pages/Files";
import Communication from "./pages/Communication";
import Timers from "./pages/Timers";
import AIChat from "./pages/AIChat";
import AIAutomation from "./pages/AIAutomation";
import Settings from "./pages/Settings";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="assistant-dashboard" element={<AssistantDashboard />} />
                <Route path="music" element={<Music />} />
                <Route path="system" element={<System />} />
                <Route path="files" element={<Files />} />
                <Route path="communication" element={<Communication />} />
                <Route path="timers" element={<Timers />} />
                <Route path="ai-chat" element={<AIChat />} />
                <Route path="ai-automation" element={<AIAutomation />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}
