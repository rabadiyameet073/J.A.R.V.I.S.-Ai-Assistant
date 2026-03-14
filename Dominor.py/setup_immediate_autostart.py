import winreg
import os
import shutil

# Get paths
script_dir = os.path.dirname(os.path.abspath(__file__))
bat_file = os.path.join(script_dir, "start_jarvis_autorun.bat")

# Add to registry for IMMEDIATE startup (registry runs faster than Startup folder)
try:
    reg_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    reg_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, reg_path, 0, winreg.KEY_SET_VALUE)
    
    # Point directly to the batch file for fastest startup
    winreg.SetValueEx(reg_key, "JarvisAI", 0, winreg.REG_SZ, bat_file)
    winreg.CloseKey(reg_key)
    
    print("[OK] Registry entry created for IMMEDIATE startup")
    print(f"[OK] Path: {bat_file}")
    
except Exception as e:
    print(f"[ERROR] Registry error: {e}")

# Remove VBS from Startup folder (we're using registry instead - faster)
startup_folder = os.path.join(os.getenv("APPDATA"), "Microsoft", "Windows", "Start Menu", "Programs", "Startup")
vbs_file = os.path.join(startup_folder, "start_jarvis.vbs")

if os.path.exists(vbs_file):
    try:
        os.remove(vbs_file)
        print("[OK] Removed slow VBS file from Startup folder")
    except:
        print("[!] Could not remove VBS file")

print("\n" + "="*50)
print("  IMMEDIATE AUTO-START CONFIGURED!")
print("="*50)
print("\nJarvis will now start within 5-10 seconds of login!")
print("Registry method is much faster than Startup folder.")
print("\nRestart your PC to test!")
