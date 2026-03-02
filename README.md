# 🌸 Pollinations Bridge (Chrome Extension)

> **A unified "Bring Your Own Pollen" (BYOP) workspace for Pollinations.ai.**  
> Generate Image, Video, and Text directly from your browser sidebar using your own API Key.

[![Pollinations.ai](https://img.shields.io/badge/API-Pollinations.ai-pink)](https://pollinations.ai/)
[![Pollinations GitHub](https://img.shields.io/badge/Source-Pollinations_Repo-black)](https://github.com/pollinations/pollinations)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 🎨 Themes & Interface
The extension features a clean, rounded UI with three distinct themes to match your browser setup. Theme can be changed in **Settings (⚙️)**.
| **Dark Mode** | **Mid Mode** | **Light Mode** |
|:---:|:---:|:---:|
| <img src="assets/dark.png" width="200"> | <img src="assets/mid.png" width="200"> | <img src="assets/light.png" width="200"> |

---

## ✨ Features
- **Zero-VRAM:** Runs entirely on Pollinations.ai infrastructure.
- **BYOP (Bring Your Own Pollen):** Enter your own API Key or login with Pollinations.ai. Stored locally in your browser (never transmitted to third parties).
- **Multimodal Generation:**
  - 🎨 **Image:** Flux & Turbo models with custom aspect ratios.
  - 🎥 **Video:** Text-to-Video & Image-to-Video (Wan Model).
  - 💬 **Text:** LLM Chat for quick assistance.
- **Context Aware:** Right-click any image on the web or highlight text and right click to send it to the generator as a reference.
- **Local Uploads:** Upload up to 4 local reference images for I2I generation.
- **Direct Download:** Save generations as clean `.jpg`, `.mp4`, or `.txt` files.

## 📥 Installation

### Option 1: Chrome Web Store
*(Link coming soon once reviewed)*

### Option 2: Load Unpacked (Developer Mode)
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.

## ⚙️ Configuration
1. Click the **Settings (⚙️)** icon in the extension.
2. Choose to **"Connect with Pollinations"** to authorise the extension directly with Pollinations AI, or enter your **Pollinations API Key** (Get one at [enter.pollinations.ai](https://enter.pollinations.ai)).
3. (Optional) Check your Pollen Balance directly inside the extension.

## 🔒 Privacy
This extension connects directly to `gen.pollinations.ai`. No user data, prompts, or API keys are sent to any intermediate servers. Keys are stored in `chrome.storage.local`.

---
*Built for the Pollinations.ai Community.*
