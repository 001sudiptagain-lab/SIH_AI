/**
 * Verification & Evaluation Test Runner for SVI 2.0 and Unified Emotion Pipeline
 * Path: tests/test_pipeline.js
 */

const fs = require('fs');
const path = require('path');
const { UnifiedEmotionPipeline, SVI_THRESHOLDS, SAFETY_SVI_FLOOR } = require('../src/analysis/emotionPipeline');

console.log('===============================================================');
console.log('    UNIFIED EMOTION PIPELINE & SVI 2.0 COMPREHENSIVE TEST SUITE');
console.log('===============================================================\n');

const fixturesPath = path.join(__dirname, 'fixtures', 'multilingual_utterances.json');
const testCases = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

let passed = 0;
let failed = 0;
const failures = [];

// 1. EVALUATION AGAINST 40 MULTILINGUAL BENCHMARK CASES
console.log(`[Suite 1/3] Running 40 Multilingual Utterance Benchmarks across English, Hindi, Hinglish, Bengali...`);

testCases.forEach((tc) => {
  // Fresh pipeline instance for single-turn clean evaluation
  const pipeline = new UnifiedEmotionPipeline();
  const res = pipeline.processTurn(tc.text);

  let casePassed = true;
  const reasons = [];

  // Check safety tier match
  if (tc.expectedSafety === 'CRITICAL' && res.svi.safety !== 'CRITICAL') {
    casePassed = false;
    reasons.push(`Expected CRITICAL safety, got ${res.svi.safety}`);
  } else if (tc.expectedSafety === 'HIGH' && (res.svi.safety !== 'HIGH' && res.svi.safety !== 'CRITICAL')) {
    casePassed = false;
    reasons.push(`Expected HIGH/CRITICAL safety, got ${res.svi.safety}`);
  } else if (tc.expectedSafety === 'NONE' && (res.svi.safety === 'CRITICAL' || res.svi.safety === 'HIGH')) {
    casePassed = false;
    reasons.push(`False positive safety trigger: ${res.svi.safety}`);
  }

  // Check SVI bounds
  if (tc.minSVI && res.svi.score < tc.minSVI) {
    casePassed = false;
    reasons.push(`SVI ${res.svi.score} below expected min ${tc.minSVI}`);
  }
  if (tc.maxSVI && res.svi.score > tc.maxSVI) {
    casePassed = false;
    reasons.push(`SVI ${res.svi.score} above expected max ${tc.maxSVI}`);
  }

  if (casePassed) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m [${tc.id}] (${tc.category}): SVI=${res.svi.score}, Safety=${res.svi.safety}, Lang=${res.language}`);
  } else {
    failed++;
    failures.push({ id: tc.id, text: tc.text, reasons });
    console.error(`  \x1b[31m✖ FAIL\x1b[0m [${tc.id}] (${tc.category}): ${reasons.join('; ')}`);
  }
});

// 2. MULTIMODAL FUSION & MISSING MODALITY RESILIENCE
console.log(`\n[Suite 2/3] Testing Multimodal Fusion & Missing Modality Robustness...`);

{
  // Test: Audio + Text Fusion
  const pipeline = new UnifiedEmotionPipeline();
  const res = pipeline.processTurn("I am a bit worried about my interview tomorrow", {
    pitchMeanHz: 210,
    pitchStdevHz: 40,
    f1Hz: 550,
    f2Hz: 1800,
    jitterLocalPct: null, // genuine null
    shimmerLocalPct: null,
    hnrDb: 18,
    speechRateSyllablesPerSec: 4.8,
    pauseCount: 2,
    speakingDurationMs: 4000,
    totalPauseDurationMs: 600,
    rmsEnergyMean: 0.12,
    rmsEnergyVariance: 0.003,
    spectralCentroidHz: 2200,
    spectralFluxMean: 0.15,
    spectralRolloffHz: 3500,
    speechRatio: 0.85,
    speechFramesCount: 50,
    signalToNoiseRatioDb: 22,
    emotion: 'anxious',
    acousticDistress: 58,
    confidence: 0.75,
    baselineDeviationScore: 1.2
  }, null);

  if (res.fusion.missing.includes('face') && res.fusion.weights.face === 0 && res.fusion.score >= 20) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m Modality dropping: Missing face properly redistributed to text & audio.`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m Modality dropping failed: ${JSON.stringify(res.fusion)}`);
  }
}

{
  // Test: Text Only (No audio, no face)
  const pipeline = new UnifiedEmotionPipeline();
  const res = pipeline.processTurn("Hello, good morning!", null, null);
  if (res.fusion.missing.includes('audio') && res.fusion.missing.includes('face') && res.fusion.weights.text === 1) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m Text-only mode: Weights 100% on text, no fake audio/face values.`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m Text-only weights failed: ${JSON.stringify(res.fusion)}`);
  }
}

// 3. TEMPORAL DYNAMICS & SCREENING QUESTIONNAIRE FEEDBACK
console.log(`\n[Suite 3/3] Testing Temporal Decay & Screening Questionnaire Response...`);

{
  const pipeline = new UnifiedEmotionPipeline();
  // Turn 1: User expresses severe acute distress
  pipeline.processTurn("I am feeling suicidal and want to end everything");
  const turn1 = pipeline.currentSvi;

  // Turn 2: User responds to follow-up reassurance
  const turn2 = pipeline.processTurn("I am breathing now and feeling much calmer, thank you");
  if (turn2.svi.score <= turn1 && turn2.svi.trend === 'DECREASING') {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m Reassurance & de-escalation: SVI reduced from ${turn1} to ${turn2.svi.score} (Trend: ${turn2.svi.trend})`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m Reassurance smoothing failed: Turn1=${turn1}, Turn2=${turn2.svi.score}`);
  }

  // Screening answer integration test
  const screeningRes = pipeline.processScreeningAnswer(0, 3);
  if (screeningRes.svi.score >= 40) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m Screening answer integrated: Question 0 (score 3) boosted SVI to ${screeningRes.svi.score}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m Screening answer failed to reflect in SVI: ${screeningRes.svi.score}`);
  }
}

console.log('\n===============================================================');
console.log(`FINAL RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('===============================================================\n');

if (failed > 0) {
  console.error('FAILURES SUMMARY:');
  failures.forEach(f => console.error(`- [${f.id}] "${f.text}": ${f.reasons.join(', ')}`));
  process.exit(1);
} else {
  console.log('ALL VERIFICATION & EVALUATION TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}
