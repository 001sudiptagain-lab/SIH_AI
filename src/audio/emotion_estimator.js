/**
 * Multimodal Emotion & Conversational State Estimator
 * Combines acoustic dynamics (pitch, speaking rate, silence ratios, loudness)
 * with textual sentiment, conversational cues, and confidence scoring.
 * 
 * CORE PRINCIPLE:
 * Emotion estimation is probabilistic conversational intelligence, NEVER a medical diagnosis.
 * Non-mirroring: Estimates states to choose appropriate calming or supportive prosody.
 */

const VALID_EMOTION_STATES = [
  'neutral',
  'happy',
  'excited',
  'curious',
  'calm',
  'sad',
  'frustrated',
  'angry',
  'anxious',
  'confused',
  'overwhelmed',
  'tired',
  'urgent',
  'distressed'
];

class MultimodalEmotionEstimator {
  constructor(options = {}) {
    this.smoothingFactor = options.smoothingFactor || 0.40; // Weight given to previous state
    this.confidenceThreshold = options.confidenceThreshold || 0.40;
    
    // Track conversation emotion trajectory over time
    this.stateHistory = [];
    this.currentSmoothedState = {
      state: 'neutral',
      confidence: 0.8,
      intensity: 0.2,
      scores: {}
    };
    VALID_EMOTION_STATES.forEach(st => this.currentSmoothedState.scores[st] = 0.1);
    this.currentSmoothedState.scores['neutral'] = 0.25;
  }

  /**
   * Estimate emotion from both text cues and acoustic features
   * @param {string} text - User transcript
   * @param {Object} audioFeatures - Extracted acoustic dynamics (WPM, silence ratio, RMS, etc.)
   * @param {Object} context - Previous turn memory or metadata
   */
  estimateEmotion(text = '', audioFeatures = {}, context = {}) {
    const rawScores = {};
    VALID_EMOTION_STATES.forEach(st => rawScores[st] = 0.05);
    rawScores['neutral'] = 0.20;

    const lower = (text || '').toLowerCase().trim();
    const words = lower.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // --- 1. Textual Cues & Sentiment Indicators ---
    // A. Happy / Excited
    if (/(yay|awesome|great|fantastic|amazing|happy|love|so good|excellent|finally|ho gaya|badhiya|shandar|khush|anondo)/i.test(lower)) {
      rawScores['happy'] += 0.45;
      rawScores['excited'] += lower.includes('!') ? 0.35 : 0.2;
    }

    // B. Frustrated / Annoyed
    if (/(annoying|frustrated|stupid|irritating|hate this|not working|why won't|again and again|bekar|dimag kharab|tang aa gaya|pagol hoye jabo)/i.test(lower)) {
      rawScores['frustrated'] += 0.55;
    }

    // C. Angry / Hostile
    if (/(furious|shut up|idiot|ridiculous|worst|bakwas|gussa|rag)/i.test(lower) || (lower === lower.toUpperCase() && wordCount > 3 && /[A-Z]/.test(text))) {
      rawScores['angry'] += 0.50;
      rawScores['frustrated'] += 0.30;
    }

    // D. Sad / Down
    if (/(sad|crying|depressed|heartbroken|unhappy|lonely|hurt|miss them|dukhi|rona|kharab lag raha|kosto|mon kharap)/i.test(lower)) {
      rawScores['sad'] += 0.55;
      rawScores['tired'] += 0.25;
    }

    // E. Anxious / Worried / Fearful
    if (/(worried|anxious|scared|nervous|afraid|panic|freaking out|darr|chinta|tension|ghabrahant|bhoe)/i.test(lower)) {
      rawScores['anxious'] += 0.50;
      rawScores['distressed'] += 0.30;
    }

    // F. Confused / Questioning
    if (/(confused|don't understand|what do you mean|how does|samajh nahi|bujhte parchi na|huh\?|what\?)/i.test(lower) || lower.endsWith('?')) {
      rawScores['confused'] += 0.40;
      rawScores['curious'] += 0.35;
    }

    // G. Overwhelmed
    if (/(too much|can't take it|so much pressure|exhausted|give up|bohot jyada|aar parchi na)/i.test(lower)) {
      rawScores['overwhelmed'] += 0.55;
      rawScores['tired'] += 0.35;
    }

    // H. Urgent / Emergency
    if (/(urgent|emergency|hurry|quick|asap|fast|jaldi|turant|ekhoni)/i.test(lower)) {
      rawScores['urgent'] += 0.60;
    }

    // --- 2. Acoustic Feature Fusion (Audio Dynamics) ---
    const {
      speakingRateWPM = 120,
      silenceRatio = 0.15,
      pauseFrequencyPerMin = 4,
      rms = 15,
      jitter = 0.02
    } = audioFeatures;

    // High speaking rate + elevated energy -> Excited or Urgent / Frustrated
    if (speakingRateWPM > 175) {
      if (rawScores['happy'] > 0.3 || rawScores['excited'] > 0.3) {
        rawScores['excited'] += 0.25;
      } else if (rawScores['frustrated'] > 0.3 || rawScores['angry'] > 0.3) {
        rawScores['frustrated'] += 0.20;
      } else {
        rawScores['urgent'] += 0.20;
      }
    }

    // Low speaking rate + high silence ratio -> Sad, Tired, or Hesitant
    if (speakingRateWPM > 0 && speakingRateWPM < 85 && silenceRatio > 0.30) {
      rawScores['sad'] += 0.20;
      rawScores['tired'] += 0.25;
      rawScores['overwhelmed'] += 0.15;
    }

    // Loud bursts / High RMS volume
    if (rms > 45) {
      if (rawScores['angry'] > 0.3 || rawScores['frustrated'] > 0.3) {
        rawScores['angry'] += 0.20;
      } else if (rawScores['excited'] > 0.3) {
        rawScores['excited'] += 0.15;
      }
    }

    // Frequent hesitations / Stutter pauses
    if (pauseFrequencyPerMin > 9) {
      rawScores['confused'] += 0.20;
      rawScores['anxious'] += 0.20;
    }

    // --- 3. Normalization & Winner Selection ---
    let maxScore = -1;
    let detectedState = 'neutral';

    for (const [state, score] of Object.entries(rawScores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedState = state;
      }
    }

    // Compute relative confidence (0.0 to 1.0)
    const totalScore = Object.values(rawScores).reduce((a, b) => a + b, 0);
    const confidence = Math.min(1.0, Number((maxScore / (totalScore * 0.45)).toFixed(2)));

    // Calculate intensity (0.0 - subtle to 1.0 - extreme)
    let intensity = Math.min(1.0, Math.max(0.1, Number(((maxScore - 0.3) * 1.5).toFixed(2))));
    if (detectedState === 'neutral' || detectedState === 'calm') {
      intensity = 0.2;
    }

    // --- 4. Temporal Emotion Smoothing ---
    // Prevent sharp, unnatural personality swinging across consecutive turns
    const prevScores = this.currentSmoothedState.scores;
    const smoothedScores = {};
    let smoothedMax = -1;
    let smoothedState = 'neutral';

    for (const state of VALID_EMOTION_STATES) {
      const p = prevScores[state] || 0.1;
      const c = rawScores[state] || 0.1;
      // Linear blend: (previous * factor) + (current * (1 - factor))
      const blended = Number(((p * this.smoothingFactor) + (c * (1 - this.smoothingFactor))).toFixed(3));
      smoothedScores[state] = blended;

      if (blended > smoothedMax) {
        smoothedMax = blended;
        smoothedState = state;
      }
    }

    // Low confidence safeguard: If current detection confidence is below threshold, retain stable state
    let finalState = smoothedState;
    if (confidence < this.confidenceThreshold) {
      finalState = this.currentSmoothedState.state || 'neutral';
    }

    const result = {
      state: finalState,
      rawDetectedState: detectedState,
      confidence: confidence,
      intensity: intensity,
      scores: smoothedScores,
      isLowConfidence: confidence < this.confidenceThreshold,
      timestamp: Date.now()
    };

    this.currentSmoothedState = result;
    this.stateHistory.push(result);
    if (this.stateHistory.length > 20) this.stateHistory.shift();

    return result;
  }

  getTrajectory() {
    return this.stateHistory.map(h => ({
      state: h.state,
      confidence: h.confidence,
      intensity: h.intensity
    }));
  }

  reset() {
    this.stateHistory = [];
    this.currentSmoothedState = {
      state: 'neutral',
      confidence: 0.8,
      intensity: 0.2,
      scores: {}
    };
  }
}

module.exports = { MultimodalEmotionEstimator, VALID_EMOTION_STATES };
