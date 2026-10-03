# 🌊 SAATHI AI — Emotionally Supportive AI Companion & Voice Assistant (v0.6.7)

> **Repository:** [https://github.com/001sudiptagain-lab/SIH_AI.git](https://github.com/001sudiptagain-lab/SIH_AI.git)  
> **Co-Founder & CEO:** Team Saathi  
> **Platform:** Node.js, Express, WebSocket, Web Audio API, Gemini 1.5 Live, Local SVI 2.0 Engine, Multimodal Emotion Telemetry

---

## 🌟 Overview

**SAATHI AI** is a real-time, emotionally supportive AI companion and voice assistant. Built with an immersive **Deep Ocean Blue & Electric Azure** aesthetic, it delivers ultra-low-latency bidirectional conversational voice, multimodal emotion recognition, real-time stress index monitoring (SVI 2.0), and safety triage protocols.

---

## ✨ Key Capabilities & Features

### 🎙️ 1. Real-Time Hands-Free Live Voice Mode
- **Circular Multi-Harmonic Quantum Audio Stage**: Real-time 60 FPS Canvas rendering synced dynamically to microphone frequency and RMS amplitude.
- **Hardware Microphone Selector**: Auto-detects and enumerates external/Bluetooth mics (e.g. CMF Buds, HD Audio Digital Microphones) with hotplug support.
- **Zero-Latency Live Audio Level Meter**: Decibel meter visualization reacting directly to user utterance.
- **Natural Streaming Voice Interaction**: Bidirectional audio streaming with real-time barge-in interruption.
- **Multilingual Support**: Hindi (हिन्दी), English (US), Bengali (বাংলা), and real-time Auto-Detection.

### 🧠 2. Clinical-Grade Stress & Emotion Telemetry (SVI 2.0)
- **Stress Vulnerability Index (SVI)**: Real-time 0–100 vulnerability score combining acoustic prosody, speech rate, pause patterns, and semantic sentiment.
- **Contextual Emotion & Tone Tracking**: Acoustic distress estimation, voice rate (WPM), speech ratio, and confidence metric.
- **Privacy-First Face Emotion Detection**: Local client-side face expression estimation via `face-api.js` (no video sent to external servers).
- **NHAA Clinical Triage Protocol**: Real-time detection of crisis markers (suicidal ideation, self-harm, threat/intimidation, severe distress) with instant emergency helpline routing (Tele-MANAS, KIRAN, Vandrevala Foundation, AASRA, NIMHANS).

### 🎨 3. Deep Ocean Blue Design System
- **Unified Palette**: Deep obsidian blue (`#030d1a`), midnight navy (`#071428`), deep azure (`#2563c8`), and luminous electric blue (`#3b82f6`).
- **Glassmorphic Floating Dock**: Seamless frosted pill chat dock identical across both text feed and Live Voice modes.
- **Dynamic Background Atmosphere**: Fluid canvas silk ribbons and organic cosmic vignettes.
- **Collapsible Sidebar**: Real-time session history, memory turn tracking, and user profile management.

### ⚡ 4. Multi-Engine Intelligence & Fallbacks
- **Google Gemini Live (Flash / Pro)**: Real-time cloud reasoning and empathic conversational dialog.
- **Local Ollama Integration**: Privacy-first, zero-cloud fallback for offline environments.
- **NHAA Triage Board**: Live dashboard accessible at `/nhaa-dashboard` for real-time risk assessment monitoring.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher
- **Python (Optional for local GUI)**: Python 3.10+ with `pip`

---

### Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/001sudiptagain-lab/SIH_AI.git
   cd SIH_AI
   ```

2. **Install Node.js Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your API credentials:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Note: You can also configure your Gemini API Key directly inside the in-app Settings modal).*

4. **Start the Application:**
   ```bash
   npm start
   ```

5. **Open in Browser:**
   - **Main Assistant:** [http://localhost:3000](http://localhost:3000)
   - **NHAA Triage Board:** [http://localhost:3000/nhaa-dashboard](http://localhost:3000/nhaa-dashboard)

---

## 📁 Repository Structure

```text
├── public/                               # Frontend Client Assets
│   ├── index.html                        # Main UI (Chat feed + Live Voice Stage + Telemetry Popup)
│   ├── style.css                         # Deep Ocean Blue Design System & Glassmorphic Components
│   ├── app.js                            # App state, message pipeline, background animation, UI actions
│   ├── voice-live.js                     # Live Voice manager, Canvas Quantum Orb, Telemetry UI
│   ├── voiceAssistant.js                 # Web Audio API, ScriptProcessor, WebSocket live audio client
│   ├── sviEngine.js                      # SVI 2.0 Stress Vulnerability Index computation
│   ├── audioEmotionEstimator.js          # Acoustic prosody & speech feature extractor
│   ├── multimodalEmotionEstimator.js     # Fused speech, acoustic & facial expression analyzer
│   ├── nhaa_dashboard.html               # Clinical Triage & Risk Assessment Board
│   ├── models/                           # Client-side face-api weight manifests and models
│   └── vendor/                           # Third-party libraries (face-api.min.js)
├── src/                                  # Modular Backend & Logic
│   ├── audio/                            # Prosody controller, emotion estimators, speech features
│   ├── engine/                           # SVI calculator, risk classifiers, recommenders
│   ├── nlp/                              # Sentiment scanners, language detectors, safety analyzers
│   └── security/                         # PII sanitization & privacy guardrails
├── config/                               # Triage thresholds, safety keywords, support pathways
├── docs/                                 # Specifications, clinical audits, research whitepapers
│   ├── AUDIT.md                          # Clinical & technical compliance audit
│   ├── EVAL_REPORT.md                    # Evaluation metrics and benchmark report
│   ├── RESEARCH.md                       # SVI acoustic & multimodal research
│   └── SVI_SPEC.md                       # Mathematical specification for SVI 2.0
├── server.js                             # Express + HTTP + WebSocket server
├── package.json                          # Project manifest & npm scripts
├── CHANGELOG.md                          # Detailed session changelog & design updates
└── README.md                             # Project overview & documentation
```

---

## 🔒 Safety & Privacy Principles

1. **Local Audio Processing**: VAD (Voice Activity Detection), acoustic energy, and prosody metrics are computed directly on the client machine via the Web Audio API.
2. **Local Face Emotion Processing**: WebCam facial expression estimation executes 100% in-browser via TensorFlow.js / `face-api.js`. No raw camera streams are transmitted or recorded.
3. **Clinical Guardrails**: SAATHI AI is designed as an emotionally supportive companion. It provides transparent disclaimers that conversation-based indicators are non-clinical, and automatically presents 24/7 national toll-free helplines upon detecting critical distress.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System), JavaScript (ES6+), Web Audio API, Canvas 2D, marked.js, highlight.js, GSAP.
- **Backend**: Node.js, Express, `ws` (WebSockets), `@google/genai` SDK.
- **AI Models**: Google Gemini 1.5 Flash / Pro, Ollama local inference.
- **Deployment**: Docker, Nixpacks, Node.js production servers.

---

## 👨‍💻 Leadership & Development
 
- **Co-Founder & CEO:** Sudipta Gain
- **GitHub:** [@001sudiptagain-lab](https://github.com/001sudiptagain-lab)
- **Repository:** [SIH_AI](https://github.com/001sudiptagain-lab/SIH_AI.git)

---

*SAATHI AI v0.6.7 — Emotionally Supportive AI Companion & Real-Time Voice Assistant.*
