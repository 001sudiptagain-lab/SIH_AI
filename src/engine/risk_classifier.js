const thresholds = require('../../config/svi_thresholds.json');

/**
 * Classifies an SVI numerical score into operationally defined tiers:
 * LOW, MODERATE, HIGH, CRITICAL.
 */
function classifyRisk(sviScore) {
  const score = Math.max(0, Math.min(100, Number(sviScore) || 0));
  const t = thresholds.thresholds;

  if (score >= t.critical.min) {
    return {
      level: 'CRITICAL',
      label: t.critical.label,
      description: t.critical.description,
      human_review_required: true,
      urgency: 'IMMEDIATE',
      color: '#ef4444'
    };
  } else if (score >= t.high.min) {
    return {
      level: 'HIGH',
      label: t.high.label,
      description: t.high.description,
      human_review_required: true,
      urgency: 'HIGH',
      color: '#f97316'
    };
  } else if (score >= t.moderate.min) {
    return {
      level: 'MODERATE',
      label: t.moderate.label,
      description: t.moderate.description,
      human_review_required: false,
      urgency: 'PRIORITY',
      color: '#eab308'
    };
  } else {
    return {
      level: 'LOW',
      label: t.low.label,
      description: t.low.description,
      human_review_required: false,
      urgency: 'STANDARD',
      color: '#10b981'
    };
  }
}

module.exports = { classifyRisk };
