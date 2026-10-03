# RESEARCH & TECHNICAL SPECIFICATION: SAATHI AI Telemetry & Emotional Intelligence

**Author:** Antigravity AI  
**Scope:** Multilingual text distress, acoustic emotion correlates, local vs. cloud speech models, computer vision affect boundary conditions, and non-diagnostic framing.  
**Date:** 2026-10-03  

---

## 1. Validated Multilingual Options for Text Emotion & Stress Signals

### 1.1 Evaluated Paradigms
We evaluated three architectural paradigms for multilingual emotion & stress signal extraction across Hindi (Devanagari script), Hinglish (Romanized Hindi), Bengali (বাংলা script), and English:

| Criterion | (a) LLM Structured Classification (Gemini JSON Schema) | (b) Small Multilingual Encoder (e.g. XLM-RoBERTa / IndicBERT) | (c) Unicode-Aware Rule-Based Lexicon & Grammar Engine |
| :--- | :--- | :--- | :--- |
| **Latency** | 250ms – 600ms per turn (async or background) | 60ms – 120ms (server CPU/GPU requirement: ~500MB RAM) | < 2ms (Synchronous, deterministic, in-process) |
| **Nuance & Context** | **High**: Deep comprehension of sarcasm, negation, idioms, and multi-turn context | **Moderate**: High accuracy on standard phrases, weaker on novel code-mixing | **Low-Moderate**: Relies on dictionary coverage, negation windows, and lookarounds |
| **Cost & Dependencies**| Requires API key; network call; quota constraints | Requires PyTorch/ONNX runtime in Node (heavier bundle) | Zero cost; zero external dependency; runs offline |
| **Safety Reliability** | Non-deterministic; potential for prompt drift or refusal | Probabilistic; risk of edge-case miss on acute self-harm | **Authoritative & 100% deterministic**; zero hallucination |

### 1.2 Recommended Architecture
**Hybrid Two-Tier Pipeline (Deterministic Guard + Structured Classification):**
1. **Tier 1 (Authoritative Deterministic Rules — Zero-Latency Pre-Flight):**
   - Implemented in Node.js using Unicode-aware lookarounds `(?<![\p{L}\p{M}])` and `(?![\p{L}\p{M}])` with the `/u` flag.
   - Comprehensive multilingual dictionaries covering Devanagari Hindi, Romanized Hinglish, Bengali, and English across all 13 SVI dimensions and acute safety triggers (suicide, self-harm, active violence).
   - Authoritative override: Tier 1 rules can **only escalate risk upward**, never downward.
2. **Tier 2 (Nuanced Contextual Evaluation — Fallback/Background):**
   - For nuanced, ambiguous, or multi-turn narrative texts, use lightweight structured output JSON schema from the primary LLM (Gemini 2.5 Flash / 3.1 Flash Lite) when available, or the deterministic fallback parser when offline.

---

## 2. Acoustic Correlates of Stress and Arousal (eGeMAPS Standards)

### 2.1 Published Empirical Evidence
The Geneva Minimalistic Acoustic Parameter Set (eGeMAPS, Eyben et al., IEEE TAC 2015) and psychological acoustic literature identify specific correlates for physiological arousal and emotional distress:

1. **Fundamental Frequency ($F_0$ / Pitch):**
   - Arousal and acute panic strongly elevate median $F_0$ and increase $F_0$ standard deviation (pitch variability).
   - Depressive distress and emotional blunting produce monotonic, compressed $F_0$ range with low median pitch.
2. **Energy & Intensity Dynamics (RMS / Loudness):**
   - Vocal strain from acute anger/panic causes elevated vocal tract subglottal pressure, resulting in high RMS and sharp intensity onset slopes.
   - However, **absolute RMS is highly confounded by microphone distance, room acoustics, and pre-amp gain**. Published literature mandates **per-session baselining and dynamic normalization** ($\Delta \text{RMS}$ from speech baseline), not fixed absolute floors.
3. **Spectral Tilt & High-Frequency Alpha Ratio:**
   - Vocal tension flattens spectral drop-off, shifting energy toward higher frequencies ($> 1000\text{ Hz}$). The ratio of energy above $1\text{ kHz}$ to total energy reflects acoustic tension and vocal effort.
4. **Temporal Dynamics (Speech Rate & Pause Ratio):**
   - Hesitation, cognitive overload, and trauma recount correlate with prolonged silent pauses ($> 250\text{ ms}$) and pause ratios $> 35\%$.
   - Rapid bursts ($> 180\text{ WPM}$) correlate with panic and hyperarousal.

### 2.2 Feasibility in the Browser / Web Audio API
- **Retain & Calibrate:**
  - **Speech Activity Ratio & Pause Rate:** Feasible and reliable using an adaptive noise-floor threshold ($\text{NoiseFloor} \times 2.0 + 0.004$) calibrated during the first 1.5 seconds of silence.
  - **Spectral Tilt (Alpha Ratio):** Feasible via `AnalyserNode.getByteFrequencyData` by comparing high-frequency bins ($> 1\text{ kHz}$) to low-frequency bins ($< 1\text{ kHz}$).
  - **Speaking Rate (WPM):** Feasible only when measuring actual words spoken from finalized STT transcripts divided by cumulative speaking time. (Discard VAD burst counting as a proxy for WPM).
- **Drop / Refactor:**
  - **FFT Peak Bin as Pitch / Jitter:** Dropped. FFT peak bin tracking captures vocal formants, not $F_0$. Jitter cannot be calculated from a 64-bin FFT. Real pitch tracking requires time-domain autocorrelation or the YIN algorithm on raw PCM. When raw PCM pitch tracking is unavailable, pitch variation is reported as `null` and excluded from scoring rather than fabricated.

---

## 3. Pretrained Speech-Emotion Model Feasibility

We evaluated pretrained speech emotion recognition (SER) models (e.g., `wav2vec 2.0-emotion`, `emotion2vec`):
- **Model Footprint:** ~360 MB – 1.2 GB download.
- **Inference Latency:** On CPU in Node.js or browser ONNX, latency ranges from 400ms to 1200ms per 3-second chunk, imposing unacceptable CPU thermal load and UI stutter.
- **Language Bias:** Almost all open SER checkpoints are trained on English datasets (RAVDESS, IEMOCAP, CREMA-D) or standard Mandarin. Performance on South Asian languages (Hindi, Bengali, Indian-accented English) shows severe domain degradation.
- **Recommendation:** Do **not** embed a multi-gigabyte neural SER model into SAATHI AI. Retain the lightweight, non-invasive acoustic prosody analyzer, clearly labeled as an **Auxiliary Heuristic Indicator**.

---

## 4. Facial Emotion Detection (face-api.js) Constraints & Guardrails

### 4.1 Known Limitations
1. **Demographic Disparities:** Convolutional affect models trained on Western benchmarks (AffectNet, RAF-DB) exhibit lower accuracy on non-Caucasian faces and diverse lighting.
2. **Optical Confounders:** Thick eyeglasses, facial hair, angled head poses ($> 30^\circ$), and backlighting degrade face bounding-box confidence.
3. **Affective Ambiguity:** Smiling during acute distress (nervous smiling or conversational masking) can lead visual models to classify a distressed person as "happy".

### 4.2 Explicit Availability & Quality Guardrails
- **Default State:** Camera is strictly **OFF** by default. Activation is 100% opt-in.
- **Availability State:** If no face is detected, detection confidence is $< 0.40$, or face size is $< 80\text{px}$, the signal is declared `available: false` with reason `"no_face_detected"` or `"low_confidence"`.
- **Zero Fallback Neutrality:** When unavailable, facial affect is **never** coerced to `"neutral"` or `0` distress; it is omitted from multimodal fusion entirely.

---

## 5. Non-Diagnostic Clinical & Ethical Framing

1. **Non-Diagnostic Disclaimer:** Stress Vulnerability Index (SVI) is an **operational decision-support indicator** derived from conversational dialogue and prosody. It is **not** a diagnostic instrument, medical advice, or psychiatric evaluation.
2. **Language Contrast & Accessibility:** Disclaimer text must meet WCAG 2.1 AA contrast standards ($> 4.5:1$ contrast ratio).
3. **Calm, Actionable Helplines:** When high stress or safety risk is detected, the UI displays vetted national 24x7 crisis helplines in India:
   - **Tele-MANAS (Ministry of Health & Family Welfare):** `14416` or `1800-891-4416` (24x7 Toll-Free, Multilingual).
   - **National Emergency Response Support System (ERSS):** `112`.
   - **KIRAN Mental Health Helpline:** `1800-599-0019`.
   - **Vandrevala Foundation Helpline:** `+91 9999 666 555`.
