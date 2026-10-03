const assert = require('assert');
const { MultimodalEmotionEstimator } = require('../src/audio/emotion_estimator');
const { ProsodyController } = require('../src/audio/prosody_controller');

console.log('====================================================');
console.log('SUNO AI - HUMAN-LIKE VOICE & PROSODY UNIT TEST SUITE');
console.log('====================================================\n');

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}:`, err.message);
  }
}

// 1. Multimodal Emotion Estimator Tests
runTest('Emotion Estimator initializes with baseline neutral/calm state', () => {
  const estimator = new MultimodalEmotionEstimator();
  assert.strictEqual(estimator.currentSmoothedState.state, 'neutral');
});

runTest('Emotion Estimator detects happy/excited cues from text and speech rate', () => {
  const estimator = new MultimodalEmotionEstimator();
  const res = estimator.estimateEmotion('Yay! I am so happy and excited today!', {
    speakingRateWPM: 180,
    rms: 35
  });
  assert.ok(['happy', 'excited'].includes(res.state) || res.scores.happy > 0.3, `Expected happy/excited, got ${res.state}`);
  assert.ok(res.confidence > 0.5, 'Expected confidence > 0.5');
});

runTest('Emotion Estimator detects frustration with acoustic evidence', () => {
  const estimator = new MultimodalEmotionEstimator();
  const res = estimator.estimateEmotion('Why is this not working? It is so annoying!', {
    speakingRateWPM: 160,
    pauseFrequencyPerMin: 8
  });
  assert.ok(res.state === 'frustrated' || res.scores.frustrated > 0.35, `Expected frustration, got ${res.state}`);
});

runTest('Emotion Estimator performs temporal smoothing across consecutive turns', () => {
  const estimator = new MultimodalEmotionEstimator();
  estimator.estimateEmotion('I am feeling very happy today', {});
  const secondTurn = estimator.estimateEmotion('Well, maybe things are okay.', {});
  assert.ok(secondTurn.scores !== undefined, 'Smoothed scores map should be generated');
  assert.ok(typeof secondTurn.intensity === 'number', 'Intensity should be numeric');
});

// 2. Prosody Controller Tests
runTest('Prosody Controller maps angry user to calm, non-mirroring prosody', () => {
  const controller = new ProsodyController();
  const style = controller.calculateVoiceStyle({
    state: 'angry',
    confidence: 0.9,
    intensity: 0.8
  }, 'I understand this is frustrating. Let us take it one step at a time.', 'en-US');

  // Must not mirror anger: rate should be slower and controlled, pitch moderate, pause steady
  assert.ok(style.speakingRate <= 1.0, `Expected calm rate <= 1.0, got ${style.speakingRate}`);
  assert.ok(style.pauseStyle === 'steady', `Expected steady pause style, got ${style.pauseStyle}`);
  assert.ok(style.warmth >= 0.85, `Expected high warmth >= 0.85, got ${style.warmth}`);
});

runTest('Prosody Controller adapts to excited user with brighter, energetic prosody', () => {
  const controller = new ProsodyController();
  const style = controller.calculateVoiceStyle({
    state: 'excited',
    confidence: 0.88,
    intensity: 0.75
  }, 'That sounds amazing! Tell me all about it!', 'en-US');

  assert.ok(style.speakingRate >= 1.0, `Expected energetic rate >= 1.0, got ${style.speakingRate}`);
  assert.ok(style.energy >= 0.7, `Expected high energy >= 0.7, got ${style.energy}`);
});

runTest('Prosody Controller cleans internal stage directions and tags from spoken text', () => {
  const controller = new ProsodyController();
  const dirty = '[calm voice] (softly) I am right here with you. [TOOL: get_time]';
  const clean = controller.sanitizeSpokenText(dirty);
  assert.strictEqual(clean, 'I am right here with you.');
});

runTest('Prosody Controller identifies important emphasis tokens subtly', () => {
  const controller = new ProsodyController();
  const style = controller.calculateVoiceStyle({ state: 'neutral', intensity: 0.3 }, 'Please remember your data is SAFE.');
  assert.ok(style.emphasisTokens.includes('safe') || style.emphasisTokens.includes('remember'), 'Key words should be detected for subtle emphasis');
});

console.log(`\nResults: ${passedCount} / ${totalCount} tests passed.`);
if (passedCount === totalCount) {
  console.log('ALL ADVANCED VOICE SYSTEM TESTS PASSED SUCCESSFULLY! 🚀');
  process.exit(0);
} else {
  console.error('SOME TESTS FAILED.');
  process.exit(1);
}
