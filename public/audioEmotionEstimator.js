// ============================================================================
// AudioEmotionEstimator — Adaptive baseline acoustic feature extraction
// Ported & Calibrated for SAATHI AI
// 
// CORRECTIONS APPLIED:
// 1. Adaptive Noise Floor: Calibrates ambient floor during the first 1.5 seconds.
//    Speech threshold adapts to (noiseFloor * 2.2 + 0.005), preventing the 98% Speech bug.
// 2. Per-Session Baselines: Measures user's conversational baseline RMS and detects
//    relative deviation rather than penalizing loud mics.
// 3. Removed Fake Jitter: Peak FFT bin is no longer masqueraded as F0 jitter.
//    Returns null for pitchVariation when true F0 autocorrelation is unavailable.
// 4. Honest Confidence: Derived from SNR and active speech duration.
// ============================================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioEmotionEstimator = factory().AudioEmotionEstimator;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const SMOOTHING = 0.12;
  const DISTRESS_SMOOTHING = 0.15;
  const HISTORY_FRAMES = 60;

  class AudioEmotionEstimator {
    constructor() {
      this.smoothedRms = 0;
      this.speechFrames = 0;
      this.totalFrames = 0;
      this.smoothedDistress = 6;
      this.rmsHistory = [];
      this.stateHistory = [];

      // Adaptive Noise Floor & Baseline Calibration
      this.calibratedFrames = 0;
      this.ambientNoiseFloor = 0.008; // Initial estimate
      this.speechBaselineRms = null; // Learned conversational baseline
      this.isCalibrated = false;
    }

    /**
     * Updates acoustic telemetry with each audio frame
     * @param {number} rms - Raw or normalized RMS (0 - 1)
     * @param {AnalyserNode} analyser - Optional Web Audio AnalyserNode
     * @returns {Object} Acoustic features
     */
    update(rms, analyser) {
      // 1. Ambient noise floor calibration during initial 30 frames (~1.5s)
      if (this.calibratedFrames < 30) {
        this.calibratedFrames++;
        this.ambientNoiseFloor = (this.ambientNoiseFloor * 0.85) + (rms * 0.15);
        if (this.calibratedFrames >= 30) {
          this.isCalibrated = true;
        }
      }

      // Dynamic speech threshold adapted to ambient noise
      const dynamicSpeechFloor = Math.max(0.008, this.ambientNoiseFloor * 2.2 + 0.004);

      const isSpike = this.detectSpike(rms);
      const effectiveRms = isSpike ? this.smoothedRms : rms;
      this.smoothedRms = this.smoothedRms * (1 - SMOOTHING) + effectiveRms * SMOOTHING;

      this.rmsHistory.push(effectiveRms);
      if (this.rmsHistory.length > HISTORY_FRAMES) this.rmsHistory.shift();

      const isSpeech = effectiveRms > dynamicSpeechFloor;
      this.stateHistory.push(isSpeech);
      if (this.stateHistory.length > HISTORY_FRAMES) this.stateHistory.shift();

      // Learn user's speech baseline when actively speaking
      if (isSpeech) {
        if (this.speechBaselineRms === null) {
          this.speechBaselineRms = this.smoothedRms;
        } else {
          this.speechBaselineRms = (this.speechBaselineRms * 0.95) + (this.smoothedRms * 0.05);
        }
      }

      this.totalFrames++;
      if (isSpeech) this.speechFrames++;
      if (this.totalFrames > HISTORY_FRAMES) {
        this.totalFrames = Math.round(this.totalFrames * 0.8);
        this.speechFrames = Math.round(this.speechFrames * 0.8);
      }
      const speechRatio = this.totalFrames > 0 ? this.speechFrames / this.totalFrames : 0;
      const silenceRatio = Math.max(0, 1 - speechRatio);

      const windowDurationSec = (this.stateHistory.length * 50) / 1000 || 3;

      // Count pauses (minimum 4 consecutive quiet frames ~200ms)
      let pauseCount = 0;
      let pauseLength = 0;
      for (let i = 0; i < this.stateHistory.length; i++) {
        if (!this.stateHistory[i]) {
          pauseLength++;
        } else {
          if (pauseLength >= 4) pauseCount++;
          pauseLength = 0;
        }
      }
      if (pauseLength >= 4) pauseCount++;
      const pauseFrequency = Math.min(60, Math.round((pauseCount / windowDurationSec) * 60));

      // Intensity variance
      let intensityVariance = 0;
      if (this.rmsHistory.length > 1) {
        const mean = this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length;
        const sqDiffs = this.rmsHistory.map(v => Math.pow(v - mean, 2));
        intensityVariance = Math.min(1, parseFloat((sqDiffs.reduce((a, b) => a + b, 0) / this.rmsHistory.length).toFixed(4)));
      }

      // Spectral Tilt (High/Low frequency ratio above/below 1 kHz)
      let spectralTilt = 0.5;
      if (analyser && isSpeech) {
        try {
          const freqData = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(freqData);
          const mid = Math.floor(freqData.length / 2);
          let lowSum = 0, highSum = 0;
          for (let i = 0; i < mid; i++) lowSum += freqData[i];
          for (let i = mid; i < freqData.length; i++) highSum += freqData[i];
          const total = lowSum + highSum;
          spectralTilt = total > 0 ? highSum / total : 0.5;
        } catch (e) {
          spectralTilt = 0.5;
        }
      }

      // Relative Acoustic Deviation from learned speech baseline
      const baseline = this.speechBaselineRms || 0.08;
      const relativeElevation = Math.max(0, (this.smoothedRms - baseline) / Math.max(0.02, baseline));
      const hasHighEnergy = relativeElevation > 0.8 && this.smoothedRms > 0.12;
      const hasHighTilt = spectralTilt > 0.65;
      const hasHighVariance = intensityVariance > 0.02;

      // Realistic Acoustic Distress Signal
      let rawDistress = 8;
      if (hasHighEnergy) rawDistress += Math.min(35, relativeElevation * 25);
      if (hasHighTilt) rawDistress += (spectralTilt - 0.65) * 50;
      if (hasHighVariance) rawDistress += Math.min(20, (intensityVariance - 0.02) * 1000);
      if (pauseFrequency > 12) rawDistress += 10;

      rawDistress = Math.min(100, Math.max(0, rawDistress));
      this.smoothedDistress = this.smoothedDistress * (1 - DISTRESS_SMOOTHING) + rawDistress * DISTRESS_SMOOTHING;
      const acousticDistress = Math.round(this.smoothedDistress);

      // Honest Confidence derivation based on Signal-to-Noise Ratio (SNR) and Speech Activity
      let confidence = 0.0;
      if (speechRatio >= 0.15 && this.isCalibrated) {
        const snr = this.smoothedRms / Math.max(0.001, this.ambientNoiseFloor);
        if (snr > 3.0) confidence = 0.80;
        else if (snr > 1.8) confidence = 0.65;
        else confidence = 0.45;
      } else if (speechRatio > 0.05) {
        confidence = 0.35;
      }

      // Evidence-based Acoustic Emotion Classification
      let emotion = 'neutral';
      if (confidence < 0.35 || speechRatio < 0.08) {
        emotion = 'neutral';
      } else if (hasHighEnergy && hasHighTilt) {
        emotion = 'urgent';
      } else if (acousticDistress >= 55) {
        emotion = 'anxious';
      } else if (hasHighTilt || hasHighVariance) {
        emotion = 'frustrated';
      } else if (acousticDistress <= 20) {
        emotion = 'calm';
      } else {
        emotion = 'neutral';
      }

      return {
        rms: parseFloat(this.smoothedRms.toFixed(4)),
        spectralTilt: parseFloat(spectralTilt.toFixed(3)),
        speechRatio: parseFloat(speechRatio.toFixed(3)),
        silenceRatio: parseFloat(silenceRatio.toFixed(3)),
        speakingRate: null, // Accurate rate requires transcript word counts
        pauseFrequency,
        intensityVariance,
        pitchVariation: null, // Honestly null unless true F0 autocorrelation is active
        jitter: null, // Discarded peak FFT bin proxy
        acousticDistress,
        emotion,
        confidence: parseFloat(confidence.toFixed(2))
      };
    }

    detectSpike(rms) {
      if (this.rmsHistory.length < 3) return false;
      const recentMean = this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length;
      const prevRms = this.rmsHistory[this.rmsHistory.length - 1];
      return rms > 0.1 && rms > recentMean * 4 && prevRms < 0.03;
    }

    reset() {
      this.smoothedRms = 0;
      this.speechFrames = 0;
      this.totalFrames = 0;
      this.smoothedDistress = 6;
      this.rmsHistory = [];
      this.stateHistory = [];
      this.calibratedFrames = 0;
      this.speechBaselineRms = null;
      this.isCalibrated = false;
    }
  }

  return { AudioEmotionEstimator };
}));
