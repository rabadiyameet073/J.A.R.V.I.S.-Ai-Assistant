import os
import re

def clean_gradients_and_glows(filepath):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found.")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove inline gradient strings in Dashboard.jsx
    if "Dashboard.jsx" in filepath:
        content = re.sub(
            r'gradient:\s*"linear-gradient\([^"]+"\s*',
            r'gradient: "var(--bg-card)" ',
            content
        )
        content = re.sub(r'className="gradient-text"', r'className="solid-text"', content)

    # Remove gradients in AIChat.jsx (Tailwind-like or raw CSS)
    if "AIChat.jsx" in filepath:
        content = re.sub(
            r'background:\s*"linear-gradient\([^"]+"\s*',
            r'background: "var(--bg-input)" ',
            content
        )
        content = re.sub(
            r'linear-gradient\([^)]+\)',
            r'var(--bg-input)',
            content
        )

    # Comprehensive CSS Cleanup
    if filepath.endswith(".css"):
        # Replace colored linear gradients with monochrome ones or solids
        content = re.sub(
            r'linear-gradient\([^)]*(#ec4899|#8b5cf6|#06b6d4|#3b82f6|rgba\(\d+,\s*\d+,\s*\d+)[^)]*\)',
            r'var(--bg-input)',
            content
        )
        
        # Remove any colored box-shadows (like the status dots)
        content = re.sub(
            r'box-shadow:\s*0\s+0\s+\d+px\s+var\(--(success|danger|warning|info)\);',
            r'',
            content
        )
        
        content = re.sub(
            r'radial-gradient\([^)]+\)',
            r'none',
            content
        )

        content = re.sub(
            r'\.gradient-text\s*\{[^}]+\}',
            r'.gradient-text { color: var(--primary); font-weight: bold; }',
            content
        )
        content = re.sub(
            r'\.action-glow\s*\{[^}]+\}',
            r'.action-glow { display: none; }',
            content
        )

        # Ensure light mode cards aren't pure black by overriding some stuff
        content = re.sub(
            r'rgba\(255,\s*255,\s*255,\s*0\.1\)',
            r'var(--bg-input)',
            content
        )
        content = re.sub(
            r'rgba\(\d+,\s*\d+,\s*\d+,\s*0\.\d+\)',
            r'transparent',
            content
        )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Cleaned {filepath}")

files_to_clean = [
    "src/App.css",
    "src/index.css",
    "src/pages/Dashboard.jsx",
    "src/pages/AIChat.jsx",
    "src/components/UI/VoiceAssistant.jsx"
]

for file in files_to_clean:
    clean_gradients_and_glows(file)

print("Done cleaning gradients and glows.")
