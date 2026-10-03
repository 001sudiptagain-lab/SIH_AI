/**
 * Speech Analytics Engine for Helpline interactions.
 * Measures acoustic dynamics (speaking rate, pause frequency, long silences, energy variance).
 * 
 * CORE PRINCIPLE:
 * Speech characteristics are probabilistic signals only.
 * High pitch or silence alone NEVER implies clinical trauma or diagnosis.
 */

function extractSpeechFeatures(audioMetrics = {}) {
  const {
    durationSeconds = 10,
    pauseCount = 0,
    totalPauseDurationSeconds = 0,
    wordsSpoken = 0,
    intensityVariance = 0.5,
    jitterEstimate = 0.02
  } = audioMetrics;

  const validDuration = Math.max(1, durationSeconds);
  const speakingRateWPM = Math.round((wordsSpoken / validDuration) * 60);
  const pauseFrequencyPerMinute = Number(((pauseCount / validDuration) * 60).toFixed(1));
  const silenceRatio = Math.min(1, Number((totalPauseDurationSeconds / validDuration).toFixed(2)));

  // Calculate Speech Distress Signal (0 - 100)
  // Higher score reflects marked hesitation, unusually slow speech, or abrupt pauses
  let acousticScore = 15; // baseline neutral

  const evidence = [];

  // Excessive silence ratio (> 35% of call is pause/silence)
  if (silenceRatio > 0.35) {
    acousticScore += 25;
    evidence.push(`Prolonged pauses accounting for ${(silenceRatio * 100).toFixed(0)}% of segment`);
  }

  // Frequent hesitation (> 8 distinct pauses per minute)
  if (pauseFrequencyPerMinute > 8) {
    acousticScore += 20;
    evidence.push(`Frequent speech hesitation detected (${pauseFrequencyPerMinute} pauses/min)`);
  }

  // Marked reduction in speaking rate (< 75 WPM in stressful recount)
  if (speakingRateWPM > 0 && speakingRateWPM < 80) {
    acousticScore += 15;
    evidence.push(`Reduced speech rate (${speakingRateWPM} WPM) consistent with difficulty communicating`);
  } else if (speakingRateWPM > 185) {
    acousticScore += 15;
    evidence.push(`Rapid speech rate (${speakingRateWPM} WPM) consistent with acute agitation`);
  }

  return {
    speech_score: Math.min(100, acousticScore),
    metrics: {
      duration_seconds: validDuration,
      speaking_rate_wpm: speakingRateWPM,
      pause_frequency_per_min: pauseFrequencyPerMinute,
      silence_ratio: silenceRatio,
      intensity_variance: intensityVariance
    },
    observable_voice_signals: evidence,
    disclaimer: "Speech analysis detects measurable acoustic hesitation/rate signals only. Requires human & contextual interpretation."
  };
}

module.exports = { extractSpeechFeatures };
