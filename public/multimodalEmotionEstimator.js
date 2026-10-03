// ============================================================================
// MultimodalEmotionEstimator — browser-compatible UMD/Vanilla JS
// Fuses text (from SVIEngine), audio (from AudioEmotionEstimator), and facial affect.
// ============================================================================

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MultimodalEmotionEstimator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const BASE_WEIGHTS = { text: 0.50, audio: 0.30, facial: 0.20 };
  const SMOOTHING = 0.40;

  class MultimodalEmotionEstimator {
    constructor() {
      this.smoothed = 6;
      this.prevComposite = 6;
      this.recentEmotionHistory = [];
    }

    /**
     * Produce a unified emotion estimate from available signals with dynamic weight renormalization & disagreement analysis.
     */
    estimate(textDistress = 10, audioDistress = null, facialDistress = null, options = {}) {
      const tVal = (textDistress !== undefined && textDistress !== null) ? Math.min(100, Math.max(0, textDistress)) : null;
      const aVal = (audioDistress !== undefined && audioDistress !== null) ? Math.min(100, Math.max(0, audioDistress)) : null;
      const fVal = (facialDistress !== undefined && facialDistress !== null) ? Math.min(100, Math.max(0, facialDistress)) : null;

      // Track modality availability
      const availableModalities = [];
      const unavailableModalities = [];

      if (tVal !== null) availableModalities.push('text');
      else unavailableModalities.push('text');

      if (aVal !== null) availableModalities.push('audio');
      else unavailableModalities.push('audio');

      if (fVal !== null) availableModalities.push('facial');
      else unavailableModalities.push('facial');

      // Dynamic weight renormalization
      let totalWeight = 0;
      if (tVal !== null) totalWeight += BASE_WEIGHTS.text;
      if (aVal !== null) totalWeight += BASE_WEIGHTS.audio;
      if (fVal !== null) totalWeight += BASE_WEIGHTS.facial;

      let wText = 0, wAudio = 0, wFacial = 0;
      let raw = 10;

      if (totalWeight > 0) {
        wText = tVal !== null ? parseFloat((BASE_WEIGHTS.text / totalWeight).toFixed(3)) : 0;
        wAudio = aVal !== null ? parseFloat((BASE_WEIGHTS.audio / totalWeight).toFixed(3)) : 0;
        wFacial = fVal !== null ? parseFloat((BASE_WEIGHTS.facial / totalWeight).toFixed(3)) : 0;

        raw =
          (tVal || 0) * wText +
          (aVal || 0) * wAudio +
          (fVal || 0) * wFacial;
      }

      // Temporal smoothing
      this.smoothed = this.smoothed * SMOOTHING + raw * (1 - SMOOTHING);
      const composite = Math.round(Math.min(100, Math.max(0, this.smoothed)));

      // Disagreement analysis
      const validVals = [tVal, aVal, fVal].filter(v => v !== null);
      let agreement = 'insufficient_data';

      if (validVals.length >= 2) {
        const maxDiff = Math.max(...validVals) - Math.min(...validVals);
        if (maxDiff <= 15) agreement = 'strong_agreement';
        else if (maxDiff <= 30) agreement = 'moderate_agreement';
        else if (maxDiff <= 45) agreement = 'weak_agreement';
        else agreement = 'disagreement';
      }

      // Explicit Emotion Category Determination
      let dominant = 'calm';

      const tEmotion = options.textEmotion;
      const aEmotion = options.audioEmotion;
      const fEmotion = options.facialEmotion;
      const textAnger = options.textAngerScore || 0;
      const audioAnger = options.acousticAngerScore || 0;
      const textFrustration = options.textFrustrationScore || 0;
      const audioFrustration = options.acousticFrustrationScore || 0;

      const isAngryAudio = aEmotion === 'angry' || audioAnger >= 50;
      const isAngryText = tEmotion === 'angry' || textAnger >= 50;
      const isAngryFace = fEmotion === 'angry';

      const isFrustratedAudio = aEmotion === 'frustrated' || audioFrustration >= 40;
      const isFrustratedText = tEmotion === 'frustrated' || textFrustration >= 40;

      // Multimodal Emotion Fusion Decision Logic
      // Check for Joy / Positive first if supported by modalities
      if (tEmotion === 'joy' || tEmotion === 'happy' || fEmotion === 'happy') {
        if ((aVal === null || aVal < 45) && (tVal === null || tVal < 40)) {
          dominant = 'happy';
        }
      }

      if (dominant !== 'happy') {
        if ((isAngryAudio && isAngryText) || (isAngryAudio && isAngryFace) || (isAngryText && isAngryFace) || (isAngryAudio && (aVal || 0) >= 60) || (isAngryText && (tVal || 0) >= 60)) {
          dominant = 'angry';
        } else if (aEmotion === 'urgent' || tEmotion === 'urgent') {
          dominant = 'urgent';
        } else if ((tEmotion === 'anxious' && (tVal || 0) >= 35) || (aEmotion === 'anxious' && (aVal || 0) >= 50)) {
          dominant = 'anxious';
        } else if ((tEmotion === 'sad' && (tVal || 0) >= 35) || (aEmotion === 'sad' && (aVal || 0) >= 45) || (fEmotion === 'sad' && composite >= 40)) {
          // Sadness requires actual semantic evidence (tVal >= 35) or distinct acoustic/facial markers
          dominant = 'sad';
        } else if (isFrustratedAudio || isFrustratedText || (aVal !== null && aVal >= 55 && composite >= 50)) {
          dominant = 'frustrated';
        } else if (composite >= 75) {
          dominant = (composite >= 70 && validVals.length === 3) ? 'distress' : 'urgent';
        } else if (composite >= 55) {
          dominant = 'anxious';
        } else if (composite >= 42 && (tEmotion === 'sad' || fEmotion === 'sad')) {
          dominant = 'sad';
        } else if (composite >= 28) {
          dominant = 'neutral';
        } else {
          dominant = 'calm';
        }
      }

      this.recentEmotionHistory.push(dominant);
      if (this.recentEmotionHistory.length > 5) this.recentEmotionHistory.shift();

      // Confidence calculation
      let countBase = 0.05;
      if (validVals.length === 3) countBase = 0.35;
      else if (validVals.length === 2) countBase = 0.25;
      else if (validVals.length === 1) countBase = 0.15;

      let agreementBonus = 0.15;
      if (agreement === 'strong_agreement') agreementBonus = 0.45;
      else if (agreement === 'moderate_agreement') agreementBonus = 0.35;
      else if (agreement === 'weak_agreement') agreementBonus = 0.20;
      else if (agreement === 'disagreement') agreementBonus = 0.05;

      const delta = Math.abs(composite - this.prevComposite);
      const stabilityBonus = delta < 5 ? 0.10 : 0.02;
      this.prevComposite = composite;

      const confidence = parseFloat(Math.min(1, Math.max(0.1, countBase + agreementBonus + stabilityBonus)).toFixed(2));

      // Explainable reasons
      const reasons = [];
      if (tVal !== null) {
        const detail = tEmotion && tEmotion !== 'neutral' ? `, tone: ${tEmotion}` : '';
        reasons.push(`Text signals indicate ${tVal >= 50 ? 'elevated' : 'low'} distress (${tVal}/100${detail})`);
      }
      if (aVal !== null) {
        const detail = aEmotion && aEmotion !== 'neutral' ? `, acoustic tone: ${aEmotion}` : '';
        reasons.push(`Acoustic features indicate ${aVal >= 50 ? 'heightened tension' : 'calm/normal tone'} (${aVal}/100${detail})`);
      }
      if (fVal !== null) {
        const detail = fEmotion ? `, face: ${fEmotion}` : '';
        reasons.push(`Facial analysis indicates ${fVal >= 50 ? 'negative affect' : 'neutral/calm affect'} (${fVal}/100${detail})`);
      }

      if (agreement === 'strong_agreement') reasons.push('High agreement across available modalities');
      else if (agreement === 'disagreement') reasons.push('Modality disagreement detected — contextual signal treated with caution');
      else if (agreement === 'insufficient_data') reasons.push('Limited modality data available');

      return {
        dominant,
        composite,
        confidence,
        textDistress: tVal,
        audioDistress: aVal,
        facialDistress: fVal,
        modalities: {
          text: { value: tVal, available: tVal !== null },
          audio: { value: aVal, available: aVal !== null },
          facial: { value: fVal, available: fVal !== null },
        },
        contributions: {
          text: wText,
          audio: wAudio,
          facial: wFacial,
        },
        availableModalities,
        unavailableModalities,
        agreement,
        reasons,
        timestamp: Date.now()
      };
    }

    reset() {
      this.smoothed = 10;
      this.prevComposite = 10;
      this.recentEmotionHistory = [];
    }
  }

  return MultimodalEmotionEstimator;
}));
