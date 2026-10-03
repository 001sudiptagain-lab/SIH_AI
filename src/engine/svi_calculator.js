const thresholds = require('../../config/svi_thresholds.json');

/**
 * Calculates the Stress Vulnerability Index (SVI: 0-100) and confidence score
 * strictly based on observable signals across 4 dimensions + safety override.
 * 
 * SVI is an operational decision-support metric, NOT a clinical diagnosis.
 */
function calculateSVI({
  threatScore = 0,       // 0 - 100 (explicit threats, ongoing danger, retaliation)
  linguisticScore = 0,   // 0 - 100 (hopelessness, fear, panic language)
  speechScore = 0,       // 0 - 100 (measured pause duration, hesitation, speech rate drops)
  contextScore = 0,      // 0 - 100 (displacement, social boycott, prior unresolved victimization)
  safetyOverride = null  // null or object { severity: 'CRITICAL', override_svi: 95, reason: '...' }
}) {
  const weights = thresholds.weights;

  // Clamp input values between 0 and 100
  const clamp = (val) => Math.max(0, Math.min(100, Number(val) || 0));
  const t = clamp(threatScore);
  const l = clamp(linguisticScore);
  const s = clamp(speechScore);
  const c = clamp(contextScore);

  let rawSVI = 
    (t * weights.threat_and_safety) +
    (l * weights.linguistic_distress) +
    (s * weights.speech_dynamics) +
    (c * weights.situational_context);

  let isSafetyAlert = false;
  let alertReason = null;

  // Rule: High speechScore alone MUST NOT independently force a HIGH/CRITICAL category
  // If linguistic & threat scores are low (< 25), speech score impact is capped at 30.
  if (t < 25 && l < 25 && s > 50) {
    rawSVI = Math.min(rawSVI, 35);
  }

  // Safety Trigger Override
  if (safetyOverride && safetyOverride.override_svi) {
    rawSVI = Math.max(rawSVI, safetyOverride.override_svi);
    isSafetyAlert = true;
    alertReason = safetyOverride.reason || 'Critical safety trigger activated';
  }

  const finalSVI = Math.round(Math.min(100, Math.max(0, rawSVI)));

  // Calculate confidence score based on observable signal count and ambiguity
  let observedSignalsCount = 0;
  if (threatScore > 0) observedSignalsCount++;
  if (linguisticScore > 0) observedSignalsCount++;
  if (speechScore > 0) observedSignalsCount++;
  if (contextScore > 0) observedSignalsCount++;

  let confidencePct = Math.round((observedSignalsCount / 4) * 100);
  if (observedSignalsCount < 2) {
    confidencePct = Math.min(confidencePct, 45); // Insufficient data flag
  } else if (observedSignalsCount >= 3) {
    confidencePct = Math.max(confidencePct, 75);
  }
  if (isSafetyAlert) {
    confidencePct = 95; // High confidence in explicit safety words
  }

  return {
    svi: finalSVI,
    confidence: `${confidencePct}%`,
    safety_alert: isSafetyAlert,
    alert_reason: alertReason,
    components: {
      threat: t,
      linguistic: l,
      speech: s,
      context: c
    }
  };
}

module.exports = { calculateSVI };
