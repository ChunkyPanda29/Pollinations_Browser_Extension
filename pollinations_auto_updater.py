import requests
import json
import os
import subprocess
from datetime import datetime

REPO_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(REPO_DIR, "models.json")

def fetch_api_models():
    print("🛰️ Scouting Pollinations Official API for Quad-Modal Capability & Premium Registry...")
    try:
        # 1. Image & Video Models
        img_vid_resp = requests.get("https://gen.pollinations.ai/image/models", timeout=10).json()
        image_models, video_models = [],[]
        
        for m in img_vid_resp:
            name = m.get("name")
            if not name: continue
            
            inputs = m.get("input_modalities",[])
            outputs = m.get("output_modalities",[])
            is_paid = " 💎" if m.get("paid_only") else ""
            
            if "video" in outputs:
                type_label = "T2V/I2V" if "image" in inputs else "T2V"
                label = f"{name}{is_paid} ({type_label})"
                video_models.append({"name": name, "label": label})
            else:
                type_label = "T2I/I2I" if "image" in inputs else "T2I"
                label = f"{name}{is_paid} ({type_label})"
                image_models.append({"name": name, "label": label})

        # 2. Text Models
        text_resp = requests.get("https://gen.pollinations.ai/text/models", timeout=10).json()
        text_models =[]
        for m in text_resp:
            name = m.get("name")
            is_paid = " 💎" if m.get("paid_only") else ""
            text_models.append({"name": name, "label": f"{name}{is_paid} (LLM)"})

        # 3. Audio Models (NEW: NOW EXTRACTS VOICES)
        audio_resp = requests.get("https://gen.pollinations.ai/audio/models", timeout=10).json()
        audio_models =[]
        for m in audio_resp:
            name = m.get("name")
            is_paid = " 💎" if m.get("paid_only") else ""
            voices = m.get("voices",[]) # Extract voices if they exist
            audio_models.append({
                "name": name, 
                "label": f"{name}{is_paid} (Audio)",
                "voices": voices
            })

        return {
            "image": sorted(image_models, key=lambda x: x['name']), 
            "video": sorted(video_models, key=lambda x: x['name']), 
            "text": sorted(text_models, key=lambda x: x['name']),
            "audio": sorted(audio_models, key=lambda x: x['name'])
        }
    except Exception as e:
        print(f"❌ API Fetch Failed: {e}")
        return None

def git_sync():
    try:
        status = subprocess.run(["git", "status", "--porcelain", "models.json"], capture_output=True, text=True, cwd=REPO_DIR)
        if not status.stdout.strip():
            print("   ✅ No changes to models.json.")
            return

        subprocess.run(["git", "add", "models.json"], cwd=REPO_DIR)
        date_str = datetime.now().strftime("%Y-%m-%d")
        subprocess.run(["git", "commit", "-m", f"🤖 Model Registry Auto-Update ({date_str}) [skip ci]"], cwd=REPO_DIR)
        subprocess.run(["git", "push", "origin", "main"], cwd=REPO_DIR)
        print("🚀 GitHub updated successfully.")
    except Exception as e:
        print(f"⚠️ Git push failed: {e}")

if __name__ == "__main__":
    live_models = fetch_api_models()
    if live_models:
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(live_models, f, indent=4)
        print(f"✅ Generated {len(live_models['image'])} Image, {len(live_models['video'])} Video, {len(live_models['text'])} Text, and {len(live_models['audio'])} Audio models.")
        
        if "GITHUB_ACTIONS" not in os.environ: 
             print("ℹ️ Local run complete. Remember to git add/commit/push manually if testing.")
        else:
             git_sync()