# 🌸 Pollinations Bridge (Browser Extension)

> **A unified "Bring Your Own Pollen" (BYOP) workspace for Pollinations.ai.**  
> Generate Image, Video, and Text directly from your browser sidebar using your own API Key.

<!-- Badges -->
[![Chrome](https://img.shields.io/badge/Chrome-Available-blue?logo=google-chrome)](https://chrome.google.com/webstore/detail/YOUR_ID_HERE)
[![Edge](https://img.shields.io/badge/Edge-Available-0078D7?logo=microsoft-edge)](https://microsoftedge.microsoft.com/addons/detail/YOUR_ID_HERE)
[![Firefox](https://img.shields.io/badge/Firefox-Coming_Soon-ff7139?logo=firefox)](https://addons.mozilla.org/)
[![Pollinations.ai](https://img.shields.io/badge/API-Pollinations.ai-pink)](https://pollinations.ai/)
[![Pollinations GitHub](https://img.shields.io/badge/Source-Pollinations_Repo-black)](https://github.com/pollinations/pollinations)
[![License](https://img.shields.io/badge/License-MIT-green)](https://opensource.org/licenses/MIT)

---

## 🎨 Themes & Customization
The extension features a clean, rounded UI with highly customizable aesthetics.  
Go to **Settings (⚙️)** to mix and match:
*   **Backgrounds:** Dark, Mid-Gray, Light.
*   **Accents:** 🌸 Pollinations Pink or 🔵 Deep Blue.

### 🌸 Pink Accent
| **Dark Mode** | **Mid Mode** | **Light Mode** |
|:---:|:---:|:---:|
| <img src="assets/dark.png" width="200"> | <img src="assets/mid.png" width="200"> | <img src="assets/light.png" width="200"> |

### 🔵 Blue Accent
| **Dark Mode** | **Mid Mode** | **Light Mode** |
|:---:|:---:|:---:|
| <img src="assets/darkb.png" width="200"> | <img src="assets/midb.png" width="200"> | <img src="assets/lightb.png" width="200"> |

---

## ✨ Features
- **Zero-VRAM:** Runs entirely on Pollinations.ai infrastructure.
- **BYOP (Bring Your Own Pollen):** 
  - **Option A:** One-click login with Pollinations.ai (OAuth).
  - **Option B:** Manually paste your API Key.
  - *Keys are stored locally in your browser and never transmitted to us.*
- **Multimodal Generation:**
  - 🎨 **Image:** Flux & Turbo models with custom aspect ratios & seeds.
  - 🎥 **Video:** Text-to-Video & Image-to-Video.
  - 💬 **Text:** LLM Chat for quick assistance.
- **Context Aware:** 
  - Right-click any image on the web to send it to the generator as a reference (I2I).
  - Highlight text and right-click to send it to the LLM.
- **Local Uploads:** Upload up to 4 local reference images for I2I generation.
- **Direct Download:** Save generations as clean `.jpg`, `.mp4`, or `.txt` files.

---

## 📥 Installation

| Browser | Status | Store Link |
| :--- | :--- | :--- |
| **Google Chrome** | ✅ Review Pending | [Chrome Web Store](LINK_HERE) |
| **Microsoft Edge** | ✅ Review Pending | [Edge Add-ons](LINK_HERE) |
| **Brave / Vivaldi** | ✅ Compatible | Use Chrome Store Link |
| **Firefox** | 🚧 Coming Soon | *Check back shortly* |

### Developer Installation (Load Unpacked)
1. Clone or download this repository.
2. Open your browser's extension manager (`chrome://extensions/` or `edge://extensions/`).
3. Toggle **Developer mode** (usually top right).
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.

---

## ⚙️ Configuration
1. Click the **Settings (⚙️)** icon in the extension.
2. Click **"Connect with Pollinations"** to authorize the extension automatically.
3. *Alternatively*, enter your **Pollinations API Key** manually (Get one at [enter.pollinations.ai](https://enter.pollinations.ai)).
4. (Optional) Check your Pollen Balance directly inside the extension.

## 🔒 Privacy & Security
This extension connects **directly** to `gen.pollinations.ai`. 
*   No intermediate servers.
*   No tracking analytics.
*   API Keys are stored in `chrome.storage.local`.

---
*Built for the Pollinations.ai Community.*