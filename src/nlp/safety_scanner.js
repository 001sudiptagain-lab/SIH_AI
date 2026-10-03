const safetyRules = require('../../config/safety_keywords.json');

/**
 * Rapid zero-latency pre-flight scanner for critical safety triggers:
 * suicide/self-harm, imminent violence, and physical confinement.
 */
function scanSafetyTriggers(text = '') {
  if (!text || typeof text !== 'string') {
    return { triggered: false };
  }

  const normalized = text.toLowerCase();

  // 1. Suicide / Self-Harm
  for (const phrase of safetyRules.suicide_self_harm.keywords) {
    if (normalized.includes(phrase)) {
      return {
        triggered: true,
        category: 'suicide_self_harm',
        severity: 'CRITICAL',
        override_svi: safetyRules.suicide_self_harm.override_svi,
        reason: `Explicit self-harm / suicidal statement detected: "${phrase}"`,
        action_required: 'Immediate crisis counselling bridge & emergency duty officer alert'
      };
    }
  }

  // 2. Active Violence
  for (const phrase of safetyRules.active_violence_threat.keywords) {
    if (normalized.includes(phrase)) {
      return {
        triggered: true,
        category: 'active_violence_threat',
        severity: 'CRITICAL',
        override_svi: safetyRules.active_violence_threat.override_svi,
        reason: `Active assault / imminent life threat reported: "${phrase}"`,
        action_required: 'Immediate emergency police & PCR liaison escalation'
      };
    }
  }

  // 3. Confinement
  for (const phrase of safetyRules.confinement_kidnapping.keywords) {
    if (normalized.includes(phrase)) {
      return {
        triggered: true,
        category: 'confinement_kidnapping',
        severity: 'CRITICAL',
        override_svi: safetyRules.confinement_kidnapping.override_svi,
        reason: `Illegal confinement or abduction reported: "${phrase}"`,
        action_required: 'Emergency rescue coordination & police escalation'
      };
    }
  }

  return { triggered: false };
}

module.exports = { scanSafetyTriggers };
