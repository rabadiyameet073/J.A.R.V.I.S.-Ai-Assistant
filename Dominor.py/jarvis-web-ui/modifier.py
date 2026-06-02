import re
import os

app_css_path = os.path.join("src", "App.css")
with open(app_css_path, "r", encoding="utf-8") as f:
    css = f.read()

# Remove main app-layout background gradient (now handled in index.css)
css = re.sub(
    r"(\.app-layout\s*\{[\s\S]*?)(background:\s*linear-gradient[^\;]+;)",
    r"\1background: var(--bg-primary);",
    css
)

# Remove holographic main content background gradient
css = re.sub(
    r"(\.main-content\s*\{[\s\S]*?)(background:[^}]+;)",
    r"\1/* background removed for minimalist look */",
    css
)

# Replace logo-text gradient with solid primary text
css = re.sub(
    r"(\.logo-text\s*\{[\s\S]*?)(background:\s*linear-gradient[^\}]+})",
    r"\1\n  color: var(--text-primary);\n}",
    css
)

# Update nav-item hovers and active states to be pure high contrast
css = re.sub(
    r"(\.nav-item:hover\s*\{[\s\S]*?)(background:\s*rgba[^\;]+;)",
    r"\1background: var(--bg-input);\n  color: var(--primary);",
    css
)

css = re.sub(
    r"(\.nav-item\.active\s*\{[\s\S]*?)(background:\s*linear-gradient[^\;]+;)",
    r"\1background: var(--bg-card);\n  color: var(--primary);\n  border-left: 4px solid var(--primary);",
    css
)

# Nav cards
css = re.sub(
    r"(\.nav-card::after\s*\{[\s\S]*?)(background:.*?;)",
    r"\1background: transparent;",
    css
)

# Remove var(--shadow-glow) everywhere
css = re.sub(r",?\s*var\(--shadow-glow\)", "", css)
css = re.sub(r",?\s*var\(--shadow-glow-accent\)", "", css)

# Make cards sharper and simpler
css = re.sub(
    r"(\.card::before\s*\{[\s\S]*?\}\n)",
    r"/* removed card::before overlay */\n",
    css
)

# Buttons: High-Contrast Inverted Solid Colors
# Primary Button
css = re.sub(
    r"(\.btn-primary\s*\{[\s\S]*?)(background:\s*linear-gradient[^\;]+;)",
    r"\1background: var(--primary);\n  color: var(--bg-primary);",
    css
)
css = re.sub(
    r"(\.btn-primary:hover\s*\{[\s\S]*?)(background:\s*linear-gradient[^\;]+;)",
    r"\1background: var(--primary-dark);\n  transform: scale(0.98);",
    css
)

# Secondary Button
css = re.sub(
    r"(\.btn-secondary\s*\{[\s\S]*?)(background:\s*var\(--bg-input\);)",
    r"\1background: transparent;\n  color: var(--primary);\n  border: 1px solid var(--primary);",
    css
)
css = re.sub(
    r"(\.btn-secondary:hover\s*\{[\s\S]*?)(border-color:\s*var\(--primary\);)",
    r"\1background: var(--primary);\n  color: var(--bg-primary);",
    css
)

# Success, Danger, Warning, Info buttons
for btn_type in ["success", "danger", "warning", "info"]:
    css = re.sub(
        rf"(\.btn-{btn_type}\s*\{{[\s\S]*?)(background:\s*linear-gradient[^;]+;)",
        rf"\1background: var(--{btn_type});\n  color: var(--bg-primary);",
        css
    )

# Fix Inputs Focus Outline
css = re.sub(
    r"(\.input:focus,\s*\.textarea:focus\s*\{[\s\S]*?)(box-shadow:\s*0 0 0 3px [^;]+;)",
    r"\1box-shadow: none;\n  border: 1px solid var(--primary);",
    css
)

# Enhance animations by changing transitions to be sharper
css = re.sub(
    r"transition:\s*all var\(--transition-fast\)",
    r"transition: all var(--transition-normal)",
    css
)

with open(app_css_path, "w", encoding="utf-8") as f:
    f.write(css)

print("App.css successfully modified for premium monochrome!")
