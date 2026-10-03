/**
 * Generates standardized, Section 18 compliant assessment reports.
 * Demarcates Observable Evidence vs AI Inference.
 */
function generateAssessmentReport({
  caseId,
  language,
  sviResult,
  riskClassification,
  nlpAnalysis,
  speechFeatures,
  recommendedPathways
}) {
  const timestamp = new Date().toISOString();

  // Observable signals list
  const observableSignals = [
    ...(nlpAnalysis.detected_threat_markers || []),
    ...(nlpAnalysis.detected_fear_markers || []),
    ...(nlpAnalysis.observable_evidence_quotes || []),
    ...(speechFeatures.observable_voice_signals || [])
  ];

  return {
    case_id: caseId || `NHAA-${Date.now()}`,
    timestamp: timestamp,
    language: language.name || language,
    svi: sviResult.svi,
    risk_level: riskClassification.level,
    risk_color: riskClassification.color,
    confidence: sviResult.confidence,
    safety_alert: sviResult.safety_alert ? "YES" : "NO",
    alert_reason: sviResult.alert_reason || null,
    
    // Explicit demarcation: Observable Evidence
    detected_indicators: {
      textual_signals: [
        ...(nlpAnalysis.detected_threat_markers || []),
        ...(nlpAnalysis.detected_fear_markers || []),
        ...(nlpAnalysis.observable_evidence_quotes || [])
      ],
      voice_signals: speechFeatures.observable_voice_signals || [],
      contextual_factors: nlpAnalysis.contextual_factors || {}
    },

    // Actionable support pathways
    recommended_actions: recommendedPathways.map(p => ({
      title: p.title,
      authority: p.authority,
      rationale: p.rationale
    })),

    // Human oversight mandate
    human_review: {
      required: riskClassification.human_review_required,
      urgency: riskClassification.urgency,
      status: "PENDING_HUMAN_REVIEW"
    },

    // Explainability summary
    explanation: nlpAnalysis.rationale || "Multi-signal aggregation of observed linguistic distress, acoustic dynamics, and safety triggers.",
    
    important_limitation: "This assessment is an AI-generated support/triage assessment and is not a medical or psychiatric diagnosis."
  };
}

module.exports = { generateAssessmentReport };
