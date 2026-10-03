const { calculateSVI } = require('../src/engine/svi_calculator');
const { classifyRisk } = require('../src/engine/risk_classifier');
const { scanSafetyTriggers } = require('../src/nlp/safety_scanner');
const { extractSpeechFeatures } = require('../src/audio/speech_features');

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`\x1b[32m✔ PASS:\x1b[0m ${description}`);
    passed++;
  } else {
    console.error(`\x1b[31m✖ FAIL:\x1b[0m ${description}`);
    failed++;
  }
}

console.log("=== RUNNING NHAA SVI ENGINE & SAFETY VERIFICATION SUITE ===");

// Test 1: Low distress
const lowCase = calculateSVI({ threatScore: 10, linguisticScore: 10, speechScore: 10, contextScore: 5 });
assert("Low distress inputs yield SVI between 0 and 24", lowCase.svi >= 0 && lowCase.svi <= 24);
assert("Low distress classified as LOW", classifyRisk(lowCase.svi).level === 'LOW');

// Test 2: Moderate distress
const modCase = calculateSVI({ threatScore: 35, linguisticScore: 40, speechScore: 30, contextScore: 25 });
assert("Moderate distress inputs yield MODERATE classification", classifyRisk(modCase.svi).level === 'MODERATE');

// Test 3: High distress (retaliation, ongoing intimidation)
const highCase = calculateSVI({ threatScore: 70, linguisticScore: 65, speechScore: 55, contextScore: 60 });
assert("High threat & distress inputs yield HIGH classification", classifyRisk(highCase.svi).level === 'HIGH');
assert("High case mandates human review", classifyRisk(highCase.svi).human_review_required === true);

// Test 4: Critical safety trigger (Suicide ideation)
const suicideScan = scanSafetyTriggers("I am feeling so trapped I just want to die and end my life");
assert("Safety scanner triggers on suicidal statement", suicideScan.triggered === true && suicideScan.severity === 'CRITICAL');
const suicideSVI = calculateSVI({ threatScore: 20, linguisticScore: 50, safetyOverride: suicideScan });
assert("Critical safety override forces SVI >= 75 (CRITICAL tier)", suicideSVI.svi >= 75);
assert("Suicide risk level classified as CRITICAL", classifyRisk(suicideSVI.svi).level === 'CRITICAL');

// Test 5: Critical safety trigger (Active violence)
const violenceScan = scanSafetyTriggers("They are outside my house attacking me right now");
assert("Safety scanner triggers on active violence statement", violenceScan.triggered === true);
const violenceSVI = calculateSVI({ threatScore: 90, linguisticScore: 80, safetyOverride: violenceScan });
assert("Active violence forces CRITICAL urgency", classifyRisk(violenceSVI.svi).urgency === 'IMMEDIATE');

// Test 6: Voice dynamics alone CANNOT falsely trigger HIGH or CRITICAL
const voiceOnlyHesitation = extractSpeechFeatures({
  durationSeconds: 15,
  pauseCount: 10, // high hesitation
  totalPauseDurationSeconds: 8,
  wordsSpoken: 20
});
const voiceOnlySVI = calculateSVI({ threatScore: 5, linguisticScore: 10, speechScore: voiceOnlyHesitation.speech_score });
assert("Voice hesitation alone is capped and CANNOT independently trigger HIGH/CRITICAL", voiceOnlySVI.svi < 50);

// Test 7: Multilingual safety triggers (Hindi & Bengali)
const hindiSuicideScan = scanSafetyTriggers("Ab main aur nahi jhel sakta main aatmhatya kar lunga");
assert("Hindi suicide trigger correctly detected", hindiSuicideScan.triggered === true);

const hindiColloquial = scanSafetyTriggers("Mujhe mar jana hai ab jeena nahi chahta");
assert("Hindi colloquial 'mar jana' and 'jeena nahi chahta' correctly detected", hindiColloquial.triggered === true);

const bengaliSuicide = scanSafetyTriggers("Ami aar bachte chai na jeebon sesh");
assert("Bengali 'aar bachte chai na' suicide trigger correctly detected", bengaliSuicide.triggered === true);

const suicideThoughts = scanSafetyTriggers("I am feeling suicidal and want to kill myself");
assert("English 'suicidal' and 'kill myself' trigger correctly detected", suicideThoughts.triggered === true && suicideThoughts.severity === 'CRITICAL');

console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
