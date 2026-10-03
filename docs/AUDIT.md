# AUDIT: SUNO AI Telemetry, SVI, Emotion & Multimodal Panel

**Target Application:** SUNO AI v0.6.7 (Port 3000 / WebSocket `/voice-ws`)  
**Scope:** Right-side "Stress / Emotion / Multimodal" panel, voice pipeline telemetry, SVI calculation, audio analysis, multimodal fusion, and follow-up assessment screening flow.  
**Auditor:** Antigravity AI  
**Date:** 2026-10-03  

---

## 1. End-to-End Data Path Tracing for Every Panel Element

Below is the complete trace from **source signal → computation → WebSocket / state message → client state → rendered DOM element**.

| Panel Element | Rendered DOM ID / Selector | Source Signal | Computation Pipeline | Range | Can be Null? | Signal Type |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AI Provider** | `#saathiAiProviderSelect` | User UI select dropdown | Local select value (`'gemini'` / `'ollama'`) sent in WS `session.start` | string | No | User Setting / Config |
| **Voice Backend Connected** | `#saathiBackendDot`, `#saathiBackendText` | WS connection lifecycle | `this.ws.onopen` / `onclose` in `public/voiceAssistant.js` | CSS class, string | No | Real Transport State |
| **Latency Badge** | `#vdLatencyVal` | Assistant response timestamp | Measured `(Date.now() - turnStartTime) / 1000` on turn completion | `0.0s` - `99.9s` | Yes (`"—"`) | Real Measured Latency |
| **SVI Level Badge** | `#vdSeverityBadge`, `#vdBadgeText` | SVI composite score + safety flags | Clamped/smoothed SVI score mapped against thresholds (Low / Moderate / High / Severe / Assessing) | Categorical string | No (shows Assessing if samples < 2) | Derived Composite with Hysteresis |
| **SVI Score /100** | `#vdSviNum` | Conversational text, acoustic distress, safety flags | Client-side EMA `(distress*0.45 + fear*0.30 + acoustic*0.25)` in `voice-live.js` line 1569 | `1` - `100` | No | Hybrid Composite |
| **SVI Trend Tag** | `#vdTrendArrow`, `#vdTrendText`, `#vdTrendTag` | Rolling 3.2s `this.sviHistory` window | `currentSvi - oldestSvi` delta threshold (>= 3: `Increasing`, <= -3: `Decreasing`, else `Stable`) | `Stable`, `Increasing`, `Decreasing` | No | Real Empirical Delta |
| **SVI Progress Bar** | `#vdSviProgressBar` | `this.currentSvi` | `style.width = Math.min(100, Math.max(5, currentSvi))%` | `5%` - `100%` | No | Rendered UI Bar |
| **Contributing Factors** | `#vdContributingFactors` | SVI Engine reasons or distress tier | `sviEngine.observe(text).reasons` or fallback tier bullets | Array of strings | Yes (falls back to defaults) | Rule-based Explainability |
| **Voice Tone Label** | `#vdAcousticToneVal` | `audioEmotionEstimator.js` | Classified from acoustic distress, tilt, jitter, anger score, speaking rate | `Neutral, Calm, Anxious, Frustrated, Angry, Sad, Overwhelmed, Urgent, Happy` | Yes (shows `"—"` when speech < 5%) | Heuristic Acoustic Estimate |
| **Acoustic Distress /100** | `#vdAcousticDistressVal` | `AudioEmotionEstimator.smoothedDistress` | `update(rms, analyser)` combining energy spikes, tilt > 0.65, variance, jitter | `0` - `100` | Yes (shows `"—"` when not speaking) | Heuristic Acoustic Model |
| **Speaking Rate** | `#vdVoiceRate` | Word count / speech duration | `tracker.wordsSpoken / (speakingDurationMs / 60000)` capped at 300 wpm | `0` - `300 wpm` | Yes (shows `"—"` or `"..."`) | Measured Speech Dynamics |
| **Pauses / min** | `#vdVoicePauses` | Silent frame transitions | `tracker.pauseCount / (speakingDurationMs / 60000)` | `0` - `60/min` | Yes (shows `"—"`) | Measured Acoustic Events |
| **Speech %** | `#vdVoiceSpeechPct` | `speechFrames / totalFrames` | Fraction of rolling frames with `RMS > SPEECH_RMS_FLOOR` | `0%` - `100%` | No (defaults to `0%`) | Measured Audio Activity |
| **Voice Confidence** | `#vdVoiceConfidence` | Fixed step table in `audioEmotionEstimator.js` | `0.85` default, `0.7` if pitch/jitter null, `0.3` if no speech | `0%` - `100%` | Yes (shows `"—"`) | Hard-coded heuristic |
| **Multimodal Dominant** | `#vdMultimodalDominant` | `MultimodalEmotionEstimator.estimate()` | Highest weighted modality match + threshold rules | Categorical string | No (defaults to Calm) | Heuristic Multi-signal Fusion |
| **Multimodal Score /100** | `#vdMultimodalScore` | Weighted fusion of text, audio, face | `raw = text*0.50 + audio*0.30 + face*0.20` with renormalization | `0` - `100` | No | Heuristic Composite |
| **Multimodal Agreement** | `#vdMultimodalAgreement` | Spread across available modalities | Max difference across active modality values (`<= 15` strong, `<= 30` moderate, etc.) | Categorical string | No (`Insufficient Data` when < 2 modalities) | Calculated Dispersion Metric |
| **Multimodal Confidence** | `#vdMultimodalConfidence` | Number of active modalities + agreement penalty | Base `0.35` (3) / `0.25` (2) / `0.15` (1) adjusted by spread | `0%` - `100%` | No | Hardcoded Heuristic |
| **Multimodal Reasons** | `#vdMultimodalReasons` | Modality alignment / evidence rules | List of qualitative evidence bullets | Array of strings | No | Rule-based Explainability |
| **Face Emotion & Score** | `#vdCamFaceBadge`, `#vdFaceEmoji`, `#vdFaceDominant`, `#vdFaceScore`, `#vdFaceAffectVal` | Local video camera stream | `faceapi.detectSingleFace().withFaceExpressions()` | Dominant emotion + `0` - `100%` distress | Yes (`Off`, `Loading`, or detected) | Local ML Model (`TinyFaceDetector`) |
| **Camera Action Button** | `#vdCamActionBtn`, `#vdCamActionText` | Camera state toggle | Event listener calling `toggleCameraEmotionDetection()` | `Enable...` / `Disable...` | No | Local Camera Controller |
| **Questionnaire Flow** | `#vdAssessmentNavBtn` | Button click | Swaps view from Page 1 to Page 2 (Key Indicators & Helplines) | Navigation Action | No | Hardcoded UI Page Swap |

---

## 2. Detailed Verification of Suspected Defects

### Defect 1: Text and SVI — Substring matching, English-only keyword list, arbitrary intensity
- **Status:** **CONFIRMED**
- **Location:** [`server.js`](file:///home/ice/Downloads/suno-aii-main/server.js#L20-L45)
- **Evidence:** `analyzeEmotion()` in `server.js` uses:
  ```javascript
  for (const [emotion, words] of Object.entries(emotionKeywords)) {
    let count = 0;
    words.forEach(w => {
      if (lower.includes(w)) count++;
    });
    if (count > 0) {
      detectedEmotions.push({ emotion, intensity: Math.min(count * 30 + 40, 100) });
    }
  }
  ```
  - `"mad"` matches `"made"`, `"roommate"`, `"madness"`.
  - `"tired"` in `"I'm tired of waiting"` is flagged as `stress`.
  - `"lost"` matches in `"I lost my keys"`.
  - Arbitrary intensity `count * 30 + 40` forces a minimum score of 70 for 1 single keyword match.
  - No negation (`"I am not sad"` registers as `sadness`).
  - English keywords only — 0 support for Hindi, Hinglish, Bengali, or Devanagari.

### Defect 2: ASCII Word Boundaries `\b` Breaking Hindi & Bengali Scripts
- **Status:** **CONFIRMED**
- **Location:** [`public/sviEngine.js`](file:///home/ice/Downloads/suno-aii-main/public/sviEngine.js#L30-L125) and [`SAATHI-AI-PROTOTYPE/saathi-ai/src/lib/svi/sviEngine.ts`](file:///home/ice/Downloads/SAATHI-AI-PROTOTYPE_FIXED.zip)
- **Evidence:** 
  Standard JavaScript regex `\b` considers only `[a-zA-Z0-9_]` as word characters. Characters from Devanagari (`\u0900-\u097F`) and Bengali (`\u0980-\u09FF`) are treated as non-word symbols.
  `/\b(mar jaana|marna|suicide)\b/i.test("मैं अभी सुसाइड करना चाहता हूँ")` evaluates to `false`.
  Because 12 out of 13 SVI dimensions in SAATHI had English and Romanized patterns with `\b`, any native Hindi or Bengali input was completely invisible to all dimensions except `immediateDanger`. Consequently, users speaking in Hindi Devanagari scored near 0 across all 12 dimensions, freezing SVI at `10 / LOW / Stable`.

### Defect 3: SVI Composite Dilution (130 Denominator)
- **Status:** **CONFIRMED**
- **Location:** [`public/sviEngine.js`](file:///home/ice/Downloads/suno-aii-main/public/sviEngine.js#L246-L247)
- **Evidence:**
  `let rawScore = keys.reduce((s, k) => s + this.sigs[k], 0);`  
  `let score = Math.round((rawScore / 130) * 100);`  
  Each of the 13 dimensions is scored 0–10 (total 130 max). If a caller is suffering severe grief, despair, social isolation, and anxiety (scoring 8 on 4 dimensions = 32 points), `32 / 130 * 100 = 24.6` (score 25), displaying **LOW**. Even high-distress callers rarely manifest all 13 clinical symptoms at once. Dividing by 130 drastically dilutes acute distress.

### Defect 4: Single Regex Hit, No Negation, No First-Person Guard on Dimensions
- **Status:** **CONFIRMED**
- **Location:** [`public/sviEngine.js`](file:///home/ice/Downloads/suno-aii-main/public/sviEngine.js#L129-L144), [`public/voice-live.js`](file:///home/ice/Downloads/suno-aii-main/public/voice-live.js#L1180-L1230)
- **Evidence:**
  In `sviEngine.js`, `isContextuallyRelevant` only guarded `['selfHarmSignal', 'suicidalIdeation', 'immediateDanger']`.
  Dimensions like `hopelessness`, `socialIsolation`, and `persistentDistress` had zero first-person checks. Statements like `"my cousin was alone"`, `"since yesterday"`, or `"he stopped working"` trigger maximum scores on those dimensions without any check for negations (`"I don't feel hopeless"`).

### Defect 5: Turn Gating & Decay Suppression
- **Status:** **CONFIRMED**
- **Location:** [`SAATHI-AI-PROTOTYPE/saathi-ai/src/lib/svi/sviEngine.ts`](file:///home/ice/Downloads/SAATHI-AI-PROTOTYPE_FIXED.zip) line 185, [`public/sviEngine.js`](file:///home/ice/Downloads/suno-aii-main/public/sviEngine.js#L202)
- **Evidence:**
  `MIN_TURNS = 2` locks the UI in `ASSESSING...` for the first turn even if the user delivers an emergency distress statement. Furthermore, when `hasCurrentAcuteRisk` was true, the previous engine latched signals indefinitely, while if absent, it decayed without considering temporal trajectory.

### Defect 6: Speech % Noise Floor Floor Clamping (98% Speech bug)
- **Status:** **CONFIRMED**
- **Location:** [`public/audioEmotionEstimator.js`](file:///home/ice/Downloads/suno-aii-main/public/audioEmotionEstimator.js#L17-L40), [`public/voiceAssistant.js`](file:///home/ice/Downloads/suno-aii-main/public/voiceAssistant.js#L202)
- **Evidence:**
  `SPEECH_RMS_FLOOR = 0.015` in `audioEmotionEstimator.js`.
  In `voiceAssistant.js` line 202, `this.inputPreGain.gain.value = 2.8;`, and in line 223 channel data is multiplied by another `2.5x` digital boost (total `7.0x` amplification!).
  With a 7x gain boost, background room noise, computer fans, and air conditioning readily exceed `0.015` RMS (representing ~0.002 raw RMS). Every single frame is tagged `isSpeech = true`, causing `speechRatio` to peg at `98% - 100%` continuously even when the room is silent.

### Defect 7: Fake Pitch & Jitter from FFT Peak Bin
- **Status:** **CONFIRMED**
- **Location:** [`public/audioEmotionEstimator.js`](file:///home/ice/Downloads/suno-aii-main/public/audioEmotionEstimator.js#L94-L117)
- **Evidence:**
  ```javascript
  for (let i = 1; i < freqData.length; i++) {
    if (freqData[i] > maxVal) {
      maxVal = freqData[i];
      peakBin = i;
    }
  }
  // Jitter: relative shift between consecutive fundamental frequency peaks
  for (let i = 1; i < this.freqHistory.length; i++) {
    diffSum += Math.abs(this.freqHistory[i] - this.freqHistory[i - 1]);
  }
  jitter = Math.min(1, parseFloat(((diffSum / (this.freqHistory.length - 1)) / Math.max(1, fMean)).toFixed(3)));
  ```
  The highest magnitude bin in a 64-bin FFT is almost never the fundamental frequency (F0); it is typically the 1st or 2nd formant (F1/F2 around 500-1500Hz) or background acoustic resonance. Deriving "jitter" from FFT peak bin jumps is scientifically invalid.

### Defect 8: Speaking Rate & Pause Frequency Anomalies
- **Status:** **CONFIRMED**
- **Location:** [`public/audioEmotionEstimator.js`](file:///home/ice/Downloads/suno-aii-main/public/audioEmotionEstimator.js#L52-L70), [`public/voice-live.js`](file:///home/ice/Downloads/suno-aii-main/public/voice-live.js#L1744-L1770)
- **Evidence:**
  In `audioEmotionEstimator.js`, `speakingRate` counted VAD burst transitions per second over a 3-second window, not syllables or words.
  Meanwhile, in `voice-live.js`, speaking rate tried to divide `tracker.wordsSpoken` by time, but `wordsSpoken` was updated on every interim transcript, blowing up to 300 wpm.
  Pauses required `pauseLength >= 2` consecutive silent 50ms frames; with the noise floor pinned at 98%, silence frames almost never reached 2, yielding `0/min` pauses.

### Defect 9: Loudness Treated as Absolute Distress
- **Status:** **CONFIRMED**
- **Location:** [`public/audioEmotionEstimator.js`](file:///home/ice/Downloads/suno-aii-main/public/audioEmotionEstimator.js#L130-L159)
- **Evidence:**
  `rawDistress += (this.smoothedRms - 0.18) * 150;`
  `angerEvidence = energyBonus * 0.4 ...`
  Uses fixed absolute thresholds (`0.18`). Depending on microphone sensitivity or user positioning, a calm user with a close-talking headset is classified as `Angry/Anxious`, while a distressed user with a quiet microphone registers as `Calm`.

### Defect 10: Hard-Coded Confidence Steps
- **Status:** **CONFIRMED**
- **Location:** [`public/audioEmotionEstimator.js`](file:///home/ice/Downloads/suno-aii-main/public/audioEmotionEstimator.js#L164-L170)
- **Evidence:**
  `let confidence = 0.85;`
  `if (!isSpeech) confidence = 0.3; else if (pitchVariation === null) confidence = 0.7;`
  Confidence is completely synthetic rather than being derived from signal-to-noise ratio (SNR), audio clipping, or speech length.

### Defect 11: Acoustic Distress vs Multimodal Disagreement (28 vs 6)
- **Status:** **CONFIRMED**
- **Location:** [`public/multimodalEmotionEstimator.js`](file:///home/ice/Downloads/suno-aii-main/public/multimodalEmotionEstimator.js#L15-L68), [`public/voice-live.js`](file:///home/ice/Downloads/suno-aii-main/public/voice-live.js#L1485)
- **Evidence:**
  In `MultimodalEmotionEstimator`, `raw = (tVal||0)*0.5 + (aVal||0)*0.3 + (fVal||0)*0.2`.
  When camera was off (`fVal = null`), dynamic weights should be `text: 0.625`, `audio: 0.375`.
  However, in `voice-live.js`, before speech or on short turns, `sviResult.score` was `0`, so `tVal = 0`.
  `(0 * 0.625) + (28 * 0.375) = 10.5`.
  With smoothing `smoothed = smoothed*0.4 + raw*0.6`, it decayed to `6/100`, while the Acoustic box displayed `28/100`.
  The UI showed `Distress: 28` right above `Multimodal: 6/100 (Calm)`, confusing the user.

### Defect 12: Dual Competing Pipelines & Missing Single Source of Truth
- **Status:** **CONFIRMED**
- **Location:** [`server.js`](file:///home/ice/Downloads/suno-aii-main/server.js#L20-L45), [`server.js`](file:///home/ice/Downloads/suno-aii-main/server.js#L1052), [`server.js`](file:///home/ice/Downloads/suno-aii-main/server.js#L1287), [`public/voice-live.js`](file:///home/ice/Downloads/suno-aii-main/public/voice-live.js#L1142)
- **Evidence:**
  Three independent emotion systems exist:
  1. `analyzeEmotion()` in `server.js` (used for chat text).
  2. `MultimodalEmotionEstimator` in `src/audio/emotion_estimator.js` (invoked in `handleFallbackTurn`, returns `{ state, intensity }` but its rich scores are never sent to the client).
  3. Client-side re-computation: `public/sviEngine.js`, `public/audioEmotionEstimator.js`, and `public/multimodalEmotionEstimator.js` running on the client in `voice-live.js`, disconnected from what the server LLM knows or what NHAA calculates.

### Defect 13: Port Mismatch & Start Scripts
- **Status:** **CONFIRMED**
- **Location:** [`start_web.bat`](file:///home/ice/Downloads/suno-aii-main/start_web.bat#L20), [`start.bat`](file:///home/ice/Downloads/suno-aii-main/start.bat#L32), [`main.py`](file:///home/ice/Downloads/suno-aii-main/main.py#L26), [`server.js`](file:///home/ice/Downloads/suno-aii-main/server.js#L11)
- **Evidence:**
  `main.py` defaults to `5000`.
  `start.bat` and `start_web.bat` launch `http://localhost:5000`.
  `server.js` defaults to `process.env.PORT || 3000`.
  Users launching from batch scripts see a connection error unless `.env` is unified.

### Defect 14: Vercel WebSocket Incompatibility
- **Status:** **CONFIRMED**
- **Location:** [`vercel.json`](file:///home/ice/Downloads/suno-aii-main/vercel.json#L19-L21)
- **Evidence:**
  `vercel.json` attempts to route `/voice-ws` to `@vercel/node`.
  AWS Lambda / Vercel Serverless functions have execution timeouts and do not support persistent stateful WebSockets. This configuration is invalid on Vercel without a dedicated server or third-party WebSocket broker. (Flagged for audit; not changing deployment targets per prompt instructions).

---

## 3. Plan for Phase 1 & Phase 2 Architecture

1. **Single Source of Truth (`src/analysis/emotionPipeline.js`):**
   - Centralize NLP, SVI 2.0, acoustic feature ingestion, and multimodal fusion on the server.
   - Per turn / audio window, broadcast a single `analysis.update` WebSocket message.
   - Client becomes a pure renderer: no duplicate re-calculations.
2. **True Multilingual Unicode Regexes:**
   - Migrate all patterns from ASCII `\b` to Unicode-aware lookaround boundaries: `(?<![\p{L}\p{M}])` and `(?![\p{L}\p{M}])` with `/u` flag.
   - Add native Devanagari and Bengali lexicons across all 13 SVI dimensions.
3. **Adaptive Audio Calibration:**
   - Dynamically sample the room noise floor during the first 1.5 seconds.
   - Set adaptive threshold `noiseFloor * 2.2 + 0.005` instead of fixed `0.015`.
4. **Calibrated SVI Formula:**
   - Instead of dividing by 130, use non-linear clinical saturation curve where 3+ high-severity dimensions properly scale into `HIGH` (60–80).
5. **Authoritative Safety Override:**
   - Pre-flight scanner guarantees instant `HIGH` or `CRITICAL` for acute danger, displaying official Indian helplines (Tele-MANAS `14416`, Emergency `112`, KIRAN `1800-599-0019`).
