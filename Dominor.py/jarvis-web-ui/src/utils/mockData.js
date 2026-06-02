// Mock data for page demos when backend is not connected

export const mockSystemInfo = {
  platform: "Windows 11 Pro",
  cpu_name: "Intel Core i9-13900K @ 3.00GHz",
  cpu_percent: 12,
  ram_total: "64 GB",
  ram_percent: 34,
  battery_percent: 100,
  disk_total: "2 TB",
  disk_percent: 45,
  ip_address: "192.168.1.104",
  hostname: "JARVIS-MAIN",
};

export const mockNetworkInfo = {
  local_ip: "192.168.1.104",
  public_ip: "203.0.113.42",
  internet_connected: true,
  hostname: "JARVIS-MAIN",
};

export const mockCategories = [
  {
    icon: "Music",
    title: "Music Controls",
    description: "Play songs, control playback, browse by letter",
    features: ["Play by Name", "A-Z Browser", "Stop Music"],
    path: "/music",
  },
  {
    icon: "System",
    title: "System Monitor",
    description: "View system info, battery, launch apps",
    features: ["System Info", "Battery Status", "App Launcher"],
    path: "/system",
  },
  {
    icon: "Files",
    title: "File Manager",
    description: "Create folders, search files, read documents",
    features: ["Create Folders", "Search Files", "Read PDF/Text"],
    path: "/files",
  },
  {
    icon: "Mail",
    title: "Communication",
    description: "Send emails, web search, open WhatsApp",
    features: ["WhatsApp", "Email Sender", "Web Search"],
    path: "/communication",
  },
  {
    icon: "Timer",
    title: "Timers & Tools",
    description: "Set timers, alarms, and use calculator",
    features: ["Timers", "Alarms", "Calculator"],
    path: "/timers",
  },
  {
    icon: "Bot",
    title: "AI Assistant",
    description: "Chat with JARVIS AI for help",
    features: ["AI Chat", "Quick Commands", "Voice Responses"],
    path: "/ai-chat",
  },
  {
    icon: "Wand2",
    title: "AI Automation",
    description: "App launcher, prompt generator, tool integration",
    features: ["Smart Launcher", "Prompt Gen", "Shell Automation"],
    path: "/ai-automation",
  },
];

export const mockAssistantEvents = [
  { id: 1, type: "system", text: "System initialized and modules loaded.", at: "08:00 AM" },
  { id: 2, type: "assistant", text: "Good morning. All systems are online.", at: "08:01 AM" },
  { id: 3, type: "user", text: "What is my schedule?", at: "08:05 AM" },
  { id: 4, type: "assistant", text: "You have 3 meetings today. First one starts at 10 AM.", at: "08:05 AM" },
];

export const mockSongs = [
  "A Space Odyssey", "Beyond the Horizon", "Cybernetic Dreams", "Digital Sunset",
  "Echoes of Tomorrow", "Future City", "Galactic Voyage", "Holographic Memory",
  "Interstellar Drift", "Journey to Mars", "Kinetic Energy", "Lunar Base",
  "Neon Nights", "Orbiting Saturn", "Quantum Leap", "Retrograde", "Starlight",
  "Time Traveler", "Universal Scale", "Virtual Reality", "Warp Drive", "Xenon",
  "Zero Gravity"
];

export const mockAiResponses = [
  "I have executed the command successfully.",
  "That operation is complete.",
  "System diagnostics show all parameters are normal.",
  "I found exactly what you were looking for.",
  "The network is stable and fully operational.",
  "I'm adjusting the settings as requested.",
  "Task completed in 0.04 seconds.",
];

export function getMockAiResponse() {
  return mockAiResponses[Math.floor(Math.random() * mockAiResponses.length)];
}

export const mockSettings = {
  success: true,
  settings: {
    tts_rate: 175,
    tts_volume: 1.0,
    wake_word: "jarvis",
    asr_language: "en-US",
  },
  status: {
    tts_available: true,
    asr_available: true,
    ai_available: true,
  }
};
