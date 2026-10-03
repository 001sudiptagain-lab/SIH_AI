const { GoogleGenAI } = require('@google/genai');

/**
 * Performs context-aware, trauma-informed NLP analysis.
 * Explicitly separates:
 * 1. Past historical events ("was afraid last year") from Current Threats ("afraid right now").
 * 2. Demographic mentions from psychological risk factors (strict fairness guardrail).
 * 3. Observable evidence vs probabilistic inference.
 */
async function analyzeContextualNarrative(narrativeText, detectedLanguage = 'en') {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback heuristic analyzer if API key is not configured or in offline mode
  if (!apiKey) {
    return heuristicNarrativeAnalysis(narrativeText);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are the NLP Engine for the National Helpline Against Atrocities (NHAA - 14566).
Analyze the victim's interaction narrative with the following STRICT ETHICAL & SAFETY RULES:
1. DECISION SUPPORT ONLY: NEVER formulate a psychiatric or medical diagnosis.
2. TEMPORAL SEPARATION: Distinguish past resolved trauma from immediate ongoing active danger.
3. BIAS NEUTRALITY: Demographic identity (caste, tribe, gender, region) must NEVER increase psychological vulnerability scores.
4. OBSERVABLE EVIDENCE: Clearly list explicit quotes/phrases as observable signals.

Victim Statement:
"""
${narrativeText}
"""

Respond in valid JSON matching this schema:
{
  "temporal_context": "IMMEDIATE" | "ONGOING" | "HISTORICAL_PAST",
  "threat_level_score": <number 0-100>,
  "linguistic_distress_score": <number 0-100>,
  "situational_context_score": <number 0-100>,
  "detected_fear_markers": [<string>],
  "detected_threat_markers": [<string>],
  "detected_hopelessness_markers": [<string>],
  "observable_evidence_quotes": [<string>],
  "contextual_factors": {
    "medical_required": <boolean>,
    "caste_discrimination_fir": <boolean>,
    "social_boycott": <boolean>,
    "family_threat": <boolean>
  },
  "rationale": "<1-2 sentence evidence-based factual summary without medical labels>"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (err) {
    console.error("Gemini NLP analysis fallback due to error:", err.message);
    return heuristicNarrativeAnalysis(narrativeText);
  }
}

/**
 * Robust rule-based fallback analyzer that runs offline or without external API
 */
function heuristicNarrativeAnalysis(text = '') {
  const lower = text.toLowerCase();
  
  const isPast = /\b(last year|pichle saal|months ago|pehle tha|was afraid|resolved|safe now|ab theek hai)\b/i.test(lower);
  const isImmediate = /\b(right now|today|aaj|ab|outside my house|following me|dhamki de rahe|jaan ko khatra)\b/i.test(lower);

  let threat = 15;
  let linguistic = 15;
  let context = 10;

  const fearMarkers = [];
  const threatMarkers = [];
  const evidence = [];

  if (lower.includes('dhamki') || lower.includes('threat') || lower.includes('harm') || lower.includes('maar')) {
    threatMarkers.push('Threat of harm or retaliation voiced');
    threat += isPast ? 10 : 45;
  }
  if (lower.includes('dar') || lower.includes('afraid') || lower.includes('scared') || lower.includes('panicking')) {
    fearMarkers.push('Expressed fear for personal or family safety');
    linguistic += isPast ? 10 : 35;
  }
  if (lower.includes('family') || lower.includes('pariwar') || lower.includes('bacche')) {
    evidence.push('Family safety concern explicitly cited');
    context += 20;
  }
  if (lower.includes('boycott') || lower.includes('pani') || lower.includes('ration') || lower.includes('chhodne')) {
    evidence.push('Social boycott or systemic exclusion indicators cited');
    context += 30;
  }

  return {
    temporal_context: isImmediate ? "IMMEDIATE" : (isPast ? "HISTORICAL_PAST" : "ONGOING"),
    threat_level_score: Math.min(100, threat),
    linguistic_distress_score: Math.min(100, linguistic),
    situational_context_score: Math.min(100, context),
    detected_fear_markers: fearMarkers,
    detected_threat_markers: threatMarkers,
    detected_hopelessness_markers: [],
    observable_evidence_quotes: evidence,
    contextual_factors: {
      medical_required: lower.includes('injury') || lower.includes('chot') || lower.includes('hospital') || lower.includes('khoon'),
      caste_discrimination_fir: lower.includes('sc') || lower.includes('st') || lower.includes('jaati') || lower.includes('atrocity'),
      social_boycott: lower.includes('boycott') || lower.includes('samajik'),
      family_threat: lower.includes('family') || lower.includes('pariwar')
    },
    rationale: "Rule-based signal extraction: detected contextual fear and threat markers."
  };
}

module.exports = { analyzeContextualNarrative };
