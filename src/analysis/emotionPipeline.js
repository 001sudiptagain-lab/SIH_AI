/**
 * Unified Server-Side Emotion, SVI 2.0 & Multimodal Pipeline
 * Path: src/analysis/emotionPipeline.js
 * 
 * CORE ARCHITECTURAL PRINCIPLES:
 * 1. Single Source of Truth: All SVI, text, audio, and multimodal fusion state
 *    is calculated here. The client renders what the server emits.
 * 2. Deterministic Safety Override: Critical safety keywords in any supported language
 *    instantly set authoritative safety risk tiers, enforce SVI floors, and cannot be lowered by fusion.
 * 3. Unicode-Aware Regexes: Handles Hindi (Devanagari), Hinglish, Bengali, and English.
 * 4. Context & Negation Handling: Filters out third-person references ("my friend was sad"),
 *    hypotheticals ("what if someone dies in a movie"), and explicit negations ("I am not afraid").
 * 5. Explainable & Non-Diagnostic: Provides plain-language observation reasons.
 */

const {
  NEGATION_PATTERNS,
  FIRST_PERSON_PATTERNS,
  THIRD_PERSON_PATTERNS,
  HYPOTHETICAL_PATTERNS,
  RECOVERY_PATTERNS,
  SVI_DIMENSION_PATTERNS
} = require('./sviPatterns');

// Canonical Thresholds & Bands
const SVI_THRESHOLDS = {
  LOW: 25,
  MODERATE: 45,
  MODERATE_TO_HIGH: 65,
  HIGH: 84,
  SEVERE: 100
};

const SAFETY_SVI_FLOOR = {
  CRITICAL: 95,
  HIGH: 85,
  ELEVATED: 65,
  NONE: 0
};

const REASON_LABELS = {
  emotionalDistress: 'Severe emotional pain or grief',
  hopelessness: 'Expressed hopelessness or perceived lack of future',
  anxietyFear: 'Acute anxiety, panic, or fear markers',
  sleepDisruption: 'Severe sleep disruption or trauma-related insomnia',
  functionalImpairment: 'Loss of ability to perform daily functions',
  socialIsolation: 'Acute social isolation or feelings of abandonment',
  copingDifficulty: 'Overwhelmed coping capacity',
  persistentDistress: 'Chronic, unremitting distress duration',
  distressFrequency: 'High frequency of distress states',
  traumaIndicators: 'Active trauma or violence indicators',
  selfHarmSignal: 'Physical self-harm markers',
  suicidalIdeation: 'Expressed suicidal ideation',
  immediateDanger: 'Imminent life safety threat or active crisis plan'
};

class UnifiedEmotionPipeline {
  constructor(options = {}) {
    this.history = [];
    this.smoothedSvi = 15;
    this.currentSvi = 15;
    this.lastTrend = 'STABLE';
    this.turnCount = 0;
    this.signals = this._emptySignals();
    this.screeningAnswers = {};
    this.safetyState = 'NONE';
    this.lastAcousticFeatures = null;
    this.lastFacialFeatures = null;
    this.debug = Boolean(process.env.ANALYSIS_DEBUG === '1' || options.debug);
  }

  processScreeningAnswer(questionIndex, score) {
    const qIdx = parseInt(questionIndex, 10);
    const ansScore = Math.max(0, Math.min(3, parseInt(score, 10)));
    this.screeningAnswers[qIdx] = ansScore;

    // Map PHQ-2 / GAD-2 style answers to clinical dimension signals
    // Q0 (hopeless/down): mapped to hopelessness & emotionalDistress
    // Q1 (anxious/on edge): mapped to anxietyFear & copingDifficulty
    if (qIdx === 0) {
      const boost = ansScore === 3 ? 7 : (ansScore === 2 ? 5 : (ansScore === 1 ? 3 : 0));
      if (boost > 0) {
        this.signals.hopelessness = Math.max(this.signals.hopelessness, boost);
        this.signals.emotionalDistress = Math.max(this.signals.emotionalDistress, boost);
      }
    } else if (qIdx === 1) {
      const boost = ansScore === 3 ? 7 : (ansScore === 2 ? 5 : (ansScore === 1 ? 3 : 0));
      if (boost > 0) {
        this.signals.anxietyFear = Math.max(this.signals.anxietyFear, boost);
        this.signals.copingDifficulty = Math.max(this.signals.copingDifficulty, boost);
      }
    }

    return this.processTurn('', this.lastAcousticFeatures, this.lastFacialFeatures);
  }

  _emptySignals() {
    return {
      emotionalDistress: 0,
      hopelessness: 0,
      anxietyFear: 0,
      sleepDisruption: 0,
      functionalImpairment: 0,
      socialIsolation: 0,
      copingDifficulty: 0,
      persistentDistress: 0,
      distressFrequency: 0,
      traumaIndicators: 0,
      selfHarmSignal: 0,
      suicidalIdeation: 0,
      immediateDanger: 0
    };
  }

  /**
   * Evaluates contextual relevance, ensuring:
   * - Not a hypothetical or third-person mention without self-reference
   * - No negation within 40 characters before match OR 25 characters after match
   */
  isContextuallyRelevant(text, dimensionKey, matchIndex = -1, matchLength = 0) {
    const isSafety = ['selfHarmSignal', 'suicidalIdeation', 'immediateDanger'].includes(dimensionKey);

    // 1. Hypothetical check
    if (HYPOTHETICAL_PATTERNS.some(p => p.test(text))) {
      return false;
    }

    // 2. Third-person check: If third-person exists AND no first-person exists, reject
    const hasThirdPerson = THIRD_PERSON_PATTERNS.some(p => p.test(text));
    const hasFirstPerson = FIRST_PERSON_PATTERNS.some(p => p.test(text));
    if (hasThirdPerson && !hasFirstPerson) {
      return false;
    }

    // 3. Negation check within local clause boundary
    if (matchIndex >= 0) {
      const windowStart = Math.max(0, matchIndex - 35);
      const preFull = text.slice(windowStart, matchIndex);
      const clausePunct = /[,;।!?\n]/;
      const preParts = preFull.split(clausePunct);
      const preClause = preParts[preParts.length - 1];

      if (NEGATION_PATTERNS.some(p => p.test(preClause))) {
        return false;
      }

      const postEnd = Math.min(text.length, matchIndex + matchLength + 25);
      const postFull = text.slice(matchIndex + matchLength, postEnd);
      const postParts = postFull.split(clausePunct);
      const postClause = postParts[0];

      if (NEGATION_PATTERNS.some(p => p.test(postClause))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Score an utterance against patterns with context & negation checks
   */
  scoreDimension(text, patterns, dimensionKey) {
    let bestScore = 0;
    for (const pat of patterns) {
      const match = pat.re.exec(text);
      if (match) {
        if (this.isContextuallyRelevant(text, dimensionKey, match.index, match[0].length)) {
          bestScore = Math.max(bestScore, pat.w);
        }
      }
    }
    return bestScore;
  }

  /**
   * Detect language code and script family
   */
  detectLanguage(text) {
    if (!text || typeof text !== 'string') return { code: 'en', name: 'English' };
    if (/[\u0980-\u09FF]/.test(text)) return { code: 'bn', name: 'Bengali' };
    if (/[\u0900-\u097F]/.test(text)) return { code: 'hi', name: 'Hindi' };
    if (/\b(kya|kaise|kaisa|nahi|nahin|mera|meri|mere|hum|dard|hai|hu|hoon|bhi|kar|raha|rahi|samajh|chahta|chahti|bohot|thoda|aatmhatya|jaan|mar|jana|shant|theek|thik)\b/i.test(text)) {
      return { code: 'hi-Latn', name: 'Hinglish' };
    }
    return { code: 'en', name: 'English' };
  }

  /**
   * Primary turn processing method
   * @param {string} text - User transcription
   * @param {Object} clientAudio - Observable acoustic metrics
   * @param {Object} clientFace - Optional face metrics (if opted in)
   */
  processTurn(text = '', clientAudio = null, clientFace = null) {
    this.turnCount++;
    const safeText = (text || '').trim();
    const lang = this.detectLanguage(safeText);

    // 1. Check recovery / reassurance score
    let recoveryScore = 0;
    for (const r of RECOVERY_PATTERNS) {
      if (r.re.test(safeText)) {
        recoveryScore = Math.max(recoveryScore, r.w);
      }
    }

    // 2. Extract 13 SVI dimensional signals
    const currentTurnSignals = {};
    const safetyKeys = ['selfHarmSignal', 'suicidalIdeation', 'immediateDanger'];
    let hasCurrentAcuteTrigger = false;

    for (const [key, patterns] of Object.entries(SVI_DIMENSION_PATTERNS)) {
      const turnScore = this.scoreDimension(safeText, patterns, key);
      currentTurnSignals[key] = turnScore;
      if (safetyKeys.includes(key) && turnScore >= 7) {
        hasCurrentAcuteTrigger = true;
      }
    }

    // 3. Signal accumulation and decay dynamics
    for (const key of Object.keys(this.signals)) {
      const effective = currentTurnSignals[key] || 0;
      const isSafety = safetyKeys.includes(key);

      if (effective > 0) {
        if (isSafety) {
          this.signals[key] = Math.max(this.signals[key], effective);
        } else {
          // Responsive step up
          this.signals[key] = Math.min(10, Math.max(this.signals[key], effective));
        }
      } else {
        // Decay logic
        if (hasCurrentAcuteTrigger && isSafety) {
          continue; // Maintain active safety awareness during ongoing crisis
        }
        let decay = 1;
        if (recoveryScore >= 4) {
          decay = isSafety ? 6 : 4;
        } else if (!hasCurrentAcuteTrigger && isSafety) {
          decay = 3; // Smooth de-escalation when user ceases crisis talk
        }
        this.signals[key] = Math.max(0, this.signals[key] - decay);
      }
    }

    // 4. Determine Safety Tier (Authoritative)
    let safetyRisk = 'NONE';
    if (this.signals.immediateDanger >= 8) {
      safetyRisk = 'CRITICAL';
    } else if (this.signals.suicidalIdeation >= 7 || this.signals.selfHarmSignal >= 7) {
      safetyRisk = 'HIGH';
    } else if (this.signals.suicidalIdeation >= 4 || this.signals.selfHarmSignal >= 4 || this.signals.hopelessness >= 8) {
      safetyRisk = 'ELEVATED';
    }
    this.safetyState = safetyRisk;

    // 5. Calibrated Non-Linear Saturation Formula (docs/SVI_SPEC.md)
    const sortedScores = Object.values(this.signals).sort((a, b) => b - a);
    const sTop = sortedScores[0] * 0.50 + sortedScores[1] * 0.30 + sortedScores[2] * 0.20;
    const remainingSum = sortedScores.slice(3).reduce((acc, v) => acc + v, 0);
    const bBurden = Math.min(10, remainingSum / 4);

    let rawSVI = Math.round(sTop * 7.5 + bBurden * 2.5);

    // Apply authoritative safety floor
    const safetyFloor = SAFETY_SVI_FLOOR[safetyRisk] || 0;
    if (rawSVI < safetyFloor) {
      rawSVI = safetyFloor;
    }
    rawSVI = Math.max(1, Math.min(100, rawSVI));

    // 6. Temporal Smoothing & Trend Calculation
    const previousSvi = this.smoothedSvi;
    if (recoveryScore >= 4) {
      // Rapid responsive downward de-escalation when user confirms safety
      this.smoothedSvi = (this.smoothedSvi * 0.40) + (rawSVI * 0.60);
    } else if (safetyRisk === 'CRITICAL' || safetyRisk === 'HIGH') {
      // Immediate upward attack
      this.smoothedSvi = Math.max(this.smoothedSvi, rawSVI);
    } else if (rawSVI < this.smoothedSvi) {
      const decayRate = recoveryScore > 0 ? 0.55 : 0.75;
      this.smoothedSvi = (this.smoothedSvi * decayRate) + (rawSVI * (1 - decayRate));
    } else {
      this.smoothedSvi = (this.smoothedSvi * 0.40) + (rawSVI * 0.60);
    }

    this.currentSvi = Math.max(1, Math.min(100, Math.round(this.smoothedSvi)));

    let trend = 'STABLE';
    const delta = this.currentSvi - previousSvi;
    if (delta >= 3) trend = 'INCREASING';
    else if (delta <= -3) trend = 'DECREASING';
    this.lastTrend = trend;

    // 7. Resolve Level Band with Hysteresis
    const level = this._resolveLevelWithHysteresis(this.currentSvi);

    // 8. Reasons / Evidence extraction
    const reasons = [];
    for (const [key, val] of Object.entries(this.signals)) {
      if (val >= 6 && REASON_LABELS[key]) {
        reasons.push(REASON_LABELS[key]);
      }
    }

    // 9. Text Emotion & Distress
    const textDistress = Math.min(100, Math.round(sTop * 10));
    let textEmotion = 'calm';
    if (safetyRisk !== 'NONE') textEmotion = 'distress';
    else if (this.signals.anxietyFear >= 6) textEmotion = 'anxious';
    else if (this.signals.emotionalDistress >= 6) textEmotion = 'sad';
    else if (textDistress >= 40) textEmotion = 'anxious';
    else if (textDistress >= 20) textEmotion = 'neutral';

    // 10. Ingest & Validate Audio Features
    const audioState = this._processAudioFeatures(clientAudio);

    // 11. Ingest & Validate Face Features
    const faceState = this._processFaceFeatures(clientFace);

    // 12. Multimodal Fusion
    const fusionState = this._fuseModalities({
      text: { available: safeText.length > 0, score: textDistress, emotion: textEmotion },
      audio: audioState,
      face: faceState
    });

    const unifiedState = {
      type: 'analysis.update',
      turn: this.turnCount,
      language: lang.code,
      svi: {
        level: this.turnCount < 2 && this.currentSvi < 30 ? 'ASSESSING' : level,
        score: this.currentSvi,
        trend: this.lastTrend,
        reasons: reasons.slice(0, 3),
        safety: this.safetyState,
        status: safeText.length > 0 ? 'ready' : 'listening'
      },
      text: {
        available: safeText.length > 0,
        distress: textDistress,
        emotion: textEmotion,
        confidence: safeText.length > 0 ? 0.85 : 0.0,
        cues: reasons.slice(0, 2)
      },
      audio: audioState,
      face: faceState,
      fusion: fusionState
    };

    if (this.debug) {
      console.log(`[Analysis Turn ${this.turnCount}] SVI: ${this.currentSvi} (${level}) | Safety: ${this.safetyState} | Fusion: ${fusionState.score}`);
    }

    return unifiedState;
  }

  _resolveLevelWithHysteresis(score) {
    if (score >= SVI_THRESHOLDS.HIGH) return 'SEVERE';
    if (score >= SVI_THRESHOLDS.MODERATE_TO_HIGH) return 'HIGH';
    if (score >= SVI_THRESHOLDS.MODERATE) return 'MODERATE_TO_HIGH';
    if (score >= SVI_THRESHOLDS.LOW) return 'MODERATE';
    return 'LOW';
  }

  _processAudioFeatures(audio) {
    if (!audio || audio.available === false) {
      return {
        available: false,
        reason: 'no_speech_detected',
        distress: null,
        emotion: 'neutral',
        confidence: 0.0,
        quality: 'too_quiet',
        rate: null,
        pausesPerMin: null,
        speechRatio: 0.0
      };
    }

    // Derived signal validation
    const speechRatio = typeof audio.speechRatio === 'number' ? Math.max(0, Math.min(1, audio.speechRatio)) : 0;
    const isSpeaking = audio.available === true || speechRatio > 0.05;
    const rawDistress = typeof audio.acousticDistress === 'number' ? audio.acousticDistress : (typeof audio.distress === 'number' ? audio.distress : null);

    return {
      available: isSpeaking,
      distress: isSpeaking && rawDistress !== null ? Math.round(rawDistress) : null,
      emotion: isSpeaking ? (audio.emotion || 'neutral') : 'neutral',
      confidence: isSpeaking ? (audio.confidence || 0.65) : 0.0,
      quality: audio.quality || (isSpeaking ? 'good' : 'too_quiet'),
      rate: isSpeaking ? (audio.rate || null) : null,
      pausesPerMin: isSpeaking ? (audio.pausesPerMin || 0) : null,
      speechRatio: speechRatio
    };
  }

  _processFaceFeatures(face) {
    if (!face || face.available !== true) {
      return {
        available: false,
        reason: face ? (face.reason || 'camera_off') : 'camera_off',
        distress: null,
        emotion: null,
        confidence: 0.0
      };
    }

    return {
      available: true,
      distress: typeof face.distress === 'number' ? Math.round(face.distress) : 15,
      emotion: face.emotion || 'neutral',
      confidence: face.confidence || 0.70
    };
  }

  _fuseModalities({ text, audio, face }) {
    const weights = { text: 0.50, audio: 0.30, face: 0.20 };
    const missing = [];
    const activeValues = [];

    let totalWeight = 0;
    if (text.available && text.score !== null) {
      totalWeight += weights.text;
      activeValues.push(text.score);
    } else {
      missing.push('text');
    }

    if (audio.available && audio.distress !== null) {
      totalWeight += weights.audio;
      activeValues.push(audio.distress);
    } else {
      missing.push('audio');
    }

    if (face.available && face.distress !== null) {
      totalWeight += weights.face;
      activeValues.push(face.distress);
    } else {
      missing.push('face');
    }

    let fusedScore = 10;
    let agreement = 'insufficient_data';

    if (totalWeight > 0) {
      const normText = text.available && text.score !== null ? (weights.text / totalWeight) * text.score : 0;
      const normAudio = audio.available && audio.distress !== null ? (weights.audio / totalWeight) * audio.distress : 0;
      const normFace = face.available && face.distress !== null ? (weights.face / totalWeight) * face.distress : 0;
      fusedScore = Math.round(normText + normAudio + normFace);
    }

    if (activeValues.length >= 2) {
      const maxDiff = Math.max(...activeValues) - Math.min(...activeValues);
      if (maxDiff <= 15) agreement = 'strong_agreement';
      else if (maxDiff <= 30) agreement = 'moderate_agreement';
      else if (maxDiff <= 45) agreement = 'weak_agreement';
      else agreement = 'disagreement';
    }

    // Determine dominant emotion
    let dominant = text.available ? text.emotion : (audio.available ? audio.emotion : 'calm');
    if (fusedScore >= 75) dominant = 'urgent';
    else if (fusedScore >= 55) dominant = 'anxious';
    else if (fusedScore <= 20) dominant = 'calm';

    const reasons = [];
    if (text.available && text.score > 50) reasons.push('Linguistic expressions show elevated tension');
    if (audio.available && audio.distress > 50) reasons.push('Acoustic voice characteristics indicate arousal');
    if (face.available && face.distress > 50) reasons.push('Facial affect indicates observable strain');
    if (missing.includes('face')) reasons.push('Camera analysis inactive (audio & text only)');

    return {
      dominant: dominant,
      score: fusedScore,
      confidence: activeValues.length === 3 ? 0.85 : (activeValues.length === 2 ? 0.65 : 0.40),
      agreement: agreement,
      weights: {
        text: text.available ? parseFloat((weights.text / totalWeight).toFixed(2)) : 0,
        audio: audio.available ? parseFloat((weights.audio / totalWeight).toFixed(2)) : 0,
        face: face.available ? parseFloat((weights.face / totalWeight).toFixed(2)) : 0
      },
      missing: missing,
      reasons: reasons.slice(0, 3)
    };
  }
}

module.exports = {
  UnifiedEmotionPipeline,
  SVI_THRESHOLDS,
  SAFETY_SVI_FLOOR
};
