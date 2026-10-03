const pathways = require('../../config/support_pathways.json');

/**
 * Recommends actionable human support pathways based on assessed risk tier
 * and specific contextual indicators (legal, medical, police, psychological).
 */
function recommendPathways(riskLevel, contextIndicators = {}) {
  const baseActions = pathways.pathways[riskLevel] || pathways.pathways.LOW;
  const tailoredList = [...baseActions];

  // Tailor if specific contextual need is identified
  if (contextIndicators.medical_required) {
    tailoredList.push({
      id: "EMERGENCY_MEDICAL_AID",
      title: "Immediate Medical Assistance / District Hospital Liaison",
      rationale: "Physical injury or urgent medical evaluation mentioned by complainant.",
      authority: "District Health Officer / Government Hospital Emergency"
    });
  }

  if (contextIndicators.caste_discrimination_fir) {
    if (!tailoredList.some(a => a.id === "DLSA_LEGAL_AID")) {
      tailoredList.push({
        id: "DLSA_LEGAL_AID",
        title: "DLSA Legal Aid / Section 15A Protection Notice",
        rationale: "Assistance with SC/ST PoA Act documentation and FIR tracking.",
        authority: "District Legal Services Authority"
      });
    }
  }

  return tailoredList;
}

module.exports = { recommendPathways };
