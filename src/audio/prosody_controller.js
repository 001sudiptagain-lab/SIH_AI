/**
 * Dedicated Prosody Controller for SUNO AI
 * 
 * Maps detected user emotion, conversational intent, and sentence structures
 * into targeted prosody parameters (pitch, rate, energy, pauses, word emphasis)
 * for an articulate, warm adult female persona.
 * 
 * NON-MIRRORING PRINCIPLE:
 * Never mirror negative emotions (anger, frustration).
 * Instead respond with calming, supportive, patient prosody.
 */

class ProsodyController {
  constructor() {
    // Base female voice persona constants (natural adult young woman)
    this.baseVoiceProfile = {
      gender: 'female',
      age: 'young-adult',
      speakingRate: 1.0,     // 1.0 = standard natural human speed (~135-145 wpm)
      pitch: 1.06,           // Gentle pleasant female pitch (not artificially high or childish)
      pitchVariation: 0.45,  // Expressive cadence
      energy: 0.65,          // Natural conversational presence
      warmth: 0.85,          // High empathy and closeness
      expressiveness: 0.60
    };

    // Mappings: User State -> Assistant Prosodic Delivery
    this.emotionProsodyMap = {
      calm: {
        speakingRate: 0.98,
        pitch: 1.05,
        pitchVariation: 0.40,
        energy: 0.55,
        warmth: 0.90,
        pauseStyle: 'relaxed'
      },
      happy: {
        speakingRate: 1.05,
        pitch: 1.09,
        pitchVariation: 0.60,
        energy: 0.78,
        warmth: 0.88,
        pauseStyle: 'brisk'
      },
      excited: {
        speakingRate: 1.08,
        pitch: 1.11,
        pitchVariation: 0.68,
        energy: 0.82,
        warmth: 0.85,
        pauseStyle: 'short'
      },
      sad: {
        speakingRate: 0.88,
        pitch: 1.02,
        pitchVariation: 0.28,
        energy: 0.42,
        warmth: 0.96,
        pauseStyle: 'thoughtful_long'
      },
      frustrated: {
        // NON-MIRRORING: Calm, patient, reassuring
        speakingRate: 0.92,
        pitch: 1.04,
        pitchVariation: 0.30,
        energy: 0.50,
        warmth: 0.92,
        pauseStyle: 'patient'
      },
      angry: {
        // NON-MIRRORING: Grounded, controlled, respectful stability
        speakingRate: 0.90,
        pitch: 1.03,
        pitchVariation: 0.25,
        energy: 0.48,
        warmth: 0.90,
        pauseStyle: 'steady'
      },
      anxious: {
        speakingRate: 0.90,
        pitch: 1.03,
        pitchVariation: 0.32,
        energy: 0.45,
        warmth: 0.95,
        pauseStyle: 'reassuring'
      },
      confused: {
        speakingRate: 0.94,
        pitch: 1.05,
        pitchVariation: 0.42,
        energy: 0.58,
        warmth: 0.88,
        pauseStyle: 'articulate'
      },
      overwhelmed: {
        speakingRate: 0.86,
        pitch: 1.02,
        pitchVariation: 0.25,
        energy: 0.40,
        warmth: 0.98,
        pauseStyle: 'gentle_spacious'
      },
      urgent: {
        speakingRate: 1.10,
        pitch: 1.07,
        pitchVariation: 0.38,
        energy: 0.80,
        warmth: 0.75,
        pauseStyle: 'minimal'
      },
      distressed: {
        speakingRate: 0.85,
        pitch: 1.02,
        pitchVariation: 0.22,
        energy: 0.38,
        warmth: 0.98,
        pauseStyle: 'tender_spacious'
      },
      neutral: {
        speakingRate: 1.0,
        pitch: 1.06,
        pitchVariation: 0.45,
        energy: 0.65,
        warmth: 0.85,
        pauseStyle: 'natural'
      }
    };
  }

  /**
   * Determine targeted voiceStyle from estimated emotion and text
   * @param {Object} emotionEstimate - { state, confidence, intensity }
   * @param {string} responseText - Generated assistant text
   * @param {string} language - Target language code ('en-US', 'hi-IN', 'bn-IN')
   */
  calculateVoiceStyle(emotionEstimate = {}, responseText = '', language = 'en-US') {
    const state = emotionEstimate.state || 'neutral';
    const intensity = emotionEstimate.intensity || 0.5;
    const targetMap = this.emotionProsodyMap[state] || this.emotionProsodyMap.neutral;

    // Intensity Interpolation: Blend base profile toward target profile based on intensity
    const rate = this._lerp(this.baseVoiceProfile.speakingRate, targetMap.speakingRate, intensity);
    const pitch = this._lerp(this.baseVoiceProfile.pitch, targetMap.pitch, intensity);
    const pitchVar = this._lerp(this.baseVoiceProfile.pitchVariation, targetMap.pitchVariation, intensity);
    const energy = this._lerp(this.baseVoiceProfile.energy, targetMap.energy, intensity);
    const warmth = this._lerp(this.baseVoiceProfile.warmth, targetMap.warmth, intensity);

    // Language-specific phonetic cadence adjustments
    let langRateAdjust = 0;
    if (language.startsWith('hi')) {
      langRateAdjust = -0.02; // Slightly more deliberation for Hindi Devanagari clarity
    } else if (language.startsWith('bn')) {
      langRateAdjust = -0.01; // Soft lyrical cadence for Bengali
    }

    // Clean internal emotional markers if present
    const cleanedText = this.sanitizeSpokenText(responseText);

    // Extract word-level emphasis candidates (e.g. capitalized keywords, key reassurance words)
    const emphasisWords = this._identifyEmphasisTokens(cleanedText);

    return {
      emotion: state,
      confidence: emotionEstimate.confidence || 0.8,
      intensity: intensity,
      speakingRate: Number((rate + langRateAdjust).toFixed(3)),
      pitch: Number(pitch.toFixed(3)),
      pitchVariation: Number(pitchVar.toFixed(3)),
      energy: Number(energy.toFixed(3)),
      warmth: Number(warmth.toFixed(3)),
      pauseStyle: targetMap.pauseStyle,
      cleanedText: cleanedText,
      emphasisTokens: emphasisWords,
      timestamp: Date.now()
    };
  }

  /**
   * Remove internal prompt tags, brackets, or meta instructions
   * so the user ONLY hears natural speech words.
   * e.g. "[calm voice] I hear you" -> "I hear you"
   */
  sanitizeSpokenText(text = '') {
    if (!text) return '';
    return text
      .replace(/\[(?:TOOL|tool):[^\]]+\]/gi, '')
      .replace(/\[[a-zA-Z\s_-]+\]/g, '') // remove bracket tags like [calm], [warmly]
      .replace(/\([a-zA-Z\s_-]+\)/g, (match) => {
        // Remove stage directions like (softly), (chuckles)
        return /^(softly|gently|warmly|smiling|pause|sighs|calm|quietly|whisper)/i.test(match.slice(1, -1)) ? '' : match;
      })
      .replace(/[*_#`~>]/g, '')           // remove markdown artifacts
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  _lerp(start, end, amt) {
    return start + (end - start) * Math.min(1, Math.max(0, amt));
  }

  _identifyEmphasisTokens(text) {
    const candidates = [];
    const words = text.split(/\s+/);
    for (const w of words) {
      const cleanWord = w.replace(/[^a-zA-Z\u0900-\u097F\u0980-\u09FF]/g, '');
      if (cleanWord.length > 3 && (w === w.toUpperCase() && /[A-Z]/.test(w))) {
        candidates.push(cleanWord.toLowerCase());
      } else if (/^(safe|important|essential|right|remember|together|step|zaroor|dhyan|surakshit|bishesh)$/i.test(cleanWord)) {
        candidates.push(cleanWord.toLowerCase());
      }
    }
    return [...new Set(candidates)];
  }
}

module.exports = { ProsodyController };
