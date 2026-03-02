# 🌸 Pollinations Bridge (Browser Extension)

[![Built with Pollinations](https://img.shields.io/badge/Built%20with-Pollinations-8a2be2?style=for-the-badge&logo=data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20viewBox%3D%220%200%20124%20124%22%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%2262%22%20r%3D%2262%22%20fill%3D%22%23ffffff%22/%3E%3C/svg%3E&logoColor=white&labelColor=6a0dad)](https://pollinations.ai/)

> **A unified "Bring Your Own Pollen" (BYOP) workspace for Pollinations.ai.**  
> Generate Image, Video, and Text directly from your browser sidebar using your own API Key.

<!-- Badges -->
[![Chrome](https://img.shields.io/badge/Chrome-Pending_Review-orange?logo=google-chrome)](https://chrome.google.com/webstore/detail/bllpfpbfokmiadkpkkaichhbaplcphdb)
[![Edge](https://img.shields.io/badge/Edge-Pending_Review-orange?logo=microsoft-edge)](https://microsoftedge.microsoft.com/addons/detail/0RDCKG3RGJZ9)
[![Firefox](https://img.shields.io/badge/Firefox-Pending_Review-orange?logo=firefox)](https://addons.mozilla.org/en-US/firefox/addon/pollinations-extension/)
[![Pollinations GitHub](https://img.shields.io/badge/Source-Pollinations_Repo-black)](https://github.com/pollinations/pollinations)
[![License](https://img.shields.io/badge/License-MIT-green)](https://opensource.org/licenses/MIT)

<br>
<img src="assets/banner.png" width="100%" alt="Pollinations Bridge Banner">
<br>

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
| **Google Chrome** | ⏳ Pending Review | [Chrome Web Store](https://chrome.google.com/webstore/detail/bllpfpbfokmiadkpkkaichhbaplcphdb) |
| **Microsoft Edge** | ⏳ Pending Review | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/0RDCKG3RGJZ9) |
| **Mozilla Firefox**| ⏳ Pending Review | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/pollinations-extension/) |
| **Brave / Vivaldi** | ✅ Compatible | Use Chrome Store Link |

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
*   API Keys are stored strictly in `chrome.storage.local`.

---

## 🌸 Powered By Pollinations.ai
This extension is proudly built on top of the [Pollinations.ai](https://pollinations.ai/) infrastructure, utilizing their official BYOP (Bring Your Own Pollen) integration.

<a href="https://pollinations.ai/">
  <img src="https://raw.githubusercontent.com/pollinations/pollinations/main/assets/logo-text.svg" height="40" alt="Pollinations.ai Logo">
</a>

*Pollinations offers free, open-source AI generation for images, video, and text. Support their mission by joining their [Discord](https://discord.gg/pollinations) or contributing to their [GitHub](https://github.com/pollinations/pollinations).*