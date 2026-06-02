import re
import os

app_css_path = os.path.join("src", "App.css")
with open(app_css_path, "r", encoding="utf-8") as f:
    css = f.read()

# Replace button text elements that used to be to 'bg-primary' back to '#ffffff' for contrast since primary is vibrant
css = re.sub(
    r'(background:\s*var\(--primary(?:-dark)?\);\s*\n\s*color:\s*)var\(--bg-primary\);',
    r'\1#ffffff;',
    css
)

css = re.sub(
    r'(background:\s*var\(--(?:success|danger|warning|info)\);\s*\n\s*color:\s*)var\(--bg-primary\);',
    r'\1#ffffff;',
    css
)

with open(app_css_path, "w", encoding="utf-8") as f:
    f.write(css)

print("Button text colors fixed for colorful theme!")
