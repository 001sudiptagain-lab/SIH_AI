// ============================================================================
// SVI 2.0 — Dynamic, Explainable, Safety-Aware Stress Vulnerability Index
// Ported for SUNO AI Live Voice Screen
// ============================================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SVIEngine = factory().SVIEngine;
    root.resolveSVILevel = factory().resolveLevel;
    root.assessSafety = factory().assessSafety;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const SVI_THRESHOLDS = {
    LOW: 0,
    MODERATE: 15,
    MODERATE_TO_HIGH: 30,
    HIGH: 45,
    SEVERE: 60,
  };

  const SAFETY_SVI_FLOOR = {
    NONE: 0,
    ELEVATED: 30,
    HIGH: 45,
    CRITICAL: 60,
  };

  const STEP_UP = 6;
  const STEP_DOWN = 1;
  const MIN_TURNS = 1;
  const TREND_WINDOW = 4;
  const TREND_THRESHOLD = 3;

  const P = {
    emotionalDistress: [
      { re: /\b(a bit|little|sometimes|occasionally)\b/i, w: 2 },
      { re: /\b(stressed|anxious|worried|nervous|tense|upset|sad|crying|tears)\b/i, w: 4 },
      { re: /\b(very|quite|really|extremely|so)\s+(stressed|anxious|worried|scared|upset|sad)\b/i, w: 7 },
      { re: /\b(unbearable|excruciating|devastating|falling apart|can't take it|breaking down)\b/i, w: 9 },
      { re: /\b(pareshaan|dukhi|takleef|bahut dukh|bahut pareshaan|ro raha|rona aa raha)\b/i, w: 6 },
    ],
    hopelessness: [
      { re: /\b(not sure things will improve|hard to see)\b/i, w: 2 },
      { re: /\b(no hope|hopeless|pointless|what's the point|nothing will change|no future)\b/i, w: 7 },
      { re: /\b(no reason to live|don't want to be here|wish I was dead|no point anymore|life is over)\b/i, w: 10 },
      { re: /\b(koi umeed nahi|sab khatam|zindagi bekaar|koi matlab nahi|jeene ka mann nahi)\b/i, w: 8 },
    ],
    anxietyFear: [
      { re: /\b(nervous|a bit uneasy|worry)\b/i, w: 2 },
      { re: /\b(scared|frightened|panicking|panic attack|heart racing|can't breathe|shaking)\b/i, w: 6 },
      { re: /\b(terrified|paralysed by fear|dread|constant terror|intense panic)\b/i, w: 9 },
      { re: /\b(dar lag raha|ghabrahat|darr|khauf|bahut dar)\b/i, w: 6 },
    ],
    sleepDisruption: [
      { re: /\b(tired|poor sleep|waking early)\b/i, w: 2 },
      { re: /\b(can't sleep|insomnia|nightmares|barely sleeping|waking up at night)\b/i, w: 6 },
      { re: /\b(haven't slept in days|completely sleepless|awake all night)\b/i, w: 9 },
      { re: /\b(neend nahi|raat ko jagta|neend nahi aati|sapne aate hain bure)\b/i, w: 5 },
    ],
    functionalImpairment: [
      { re: /\b(hard to focus|trouble concentrating|off my game)\b/i, w: 3 },
      { re: /\b(missing work|not going out|avoiding|stopped|can't do my job|can't eat)\b/i, w: 6 },
      { re: /\b(lost my job|can't function|bedridden|stopped eating|relationship ruined)\b/i, w: 9 },
      { re: /\b(kaam nahi kar|ghar se nahi nikla|kuch nahi ho raha|khana nahi kha)\b/i, w: 6 },
    ],
    socialIsolation: [
      { re: /\b(could use support|people are busy|not much help)\b/i, w: 2 },
      { re: /\b(no one to talk|alone|nobody cares|no support|isolated)\b/i, w: 6 },
      { re: /\b(completely alone|abandoned|utterly isolated|no family|no friends)\b/i, w: 9 },
      { re: /\b(akela|koi nahi|koi saath nahi|sab chale gaye|bilkul akela)\b/i, w: 7 },
    ],
    copingDifficulty: [
      { re: /\b(a bit tough|hard to manage|struggling a little)\b/i, w: 2 },
      { re: /\b(struggling|can't cope|overwhelmed|too much|hard to deal)\b/i, w: 5 },
      { re: /\b(no way out|nothing works|given up|completely overwhelmed|drowning)\b/i, w: 9 },
      { re: /\b(sambhal nahi|kuch nahi kar sakta|haar gaya|bas ho gaya)\b/i, w: 7 },
    ],
    persistentDistress: [
      { re: /\b(recently|lately|for a while|past few days|this week)\b/i, w: 3 },
      { re: /\b(weeks|months|for a long time|years|since)\b/i, w: 6 },
      { re: /\b(forever|my whole life|never goes away|never ends|as long as I remember)\b/i, w: 9 },
      { re: /\b(kaafi time se|bahut arse se|saalon se|hamesha se)\b/i, w: 6 },
    ],
    distressFrequency: [
      { re: /\b(sometimes|occasionally|now and then)\b/i, w: 2 },
      { re: /\b(often|frequently|most days|many times|regularly)\b/i, w: 5 },
      { re: /\b(every day|all the time|constantly|always|nonstop|24.7)\b/i, w: 8 },
      { re: /\b(har roz|har din|sab waqt|poora din|roz roz)\b/i, w: 6 },
    ],
    traumaIndicators: [
      { re: /\b(something bad happened|traumatic|trauma|abused|attacked|assaulted|violence)\b/i, w: 6 },
      { re: /\b(flashbacks|nightmares about|can't forget|haunted by|reliving)\b/i, w: 8 },
      { re: /\b(maar peet|hinsa|zulm|torture|barbaad)\b/i, w: 7 },
    ],
    selfHarmSignal: [
      { re: /\b(hurting myself|cutting|self.harm|harm myself|punish myself)\b/i, w: 8 },
      { re: /\b(khud ko hurt|apne aap ko nuksan|apne aap ko maarna)\b/i, w: 8 },
    ],
    suicidalIdeation: [
      { re: /\b(don't want to live|wish I was dead|better off dead|no reason to live|end it all|kill myself|want to die|wanna die|suicide)\b/i, w: 9 },
      { re: /\b(jeena nahi chahta|mar jaana chahta|marna chahta|jaan de deni chahiye|marna hai|mar jau)\b/i, w: 9 },
      { re: /\b(ab main jeena nahi chahta|zindagi se tang|maut aa jaye|morte chai|more jabo)\b/i, w: 9 },
      { re: /(सुसाइड|आत्महत्या|मरना चाहता|जीना नहीं चाहता|मर जाऊं|मर जाऊंगा|मौत आ जाए|जान देना)/i, w: 9 },
    ],
    immediateDanger: [
      { re: /\b(going to kill myself|going to end my life|going to commit suicide|i will kill myself|i will end it|kill myself|commit suicide)\b/i, w: 10 },
      { re: /\b(i have decided to die|tonight i will|i'm going to do it|i'm about to|i have a plan to die)\b/i, w: 10 },
      { re: /\b(main suicide karunga|main khud ko maar dunga|main apni jaan le lunga|chhat se kood|zeher kha)\b/i, w: 10 },
      { re: /\b(aaj kuch karne wala|aaj raat ko|main mar jaunga|main le liya hai faisla)\b/i, w: 10 },
      { re: /\b(morte chai|more jabo|aar bachte chai na|jeebon sesh|aattohotta|attohotta)\b/i, w: 10 },
      { re: /(मैं आत्महत्या|मैं मर जाऊं|मैं मर जाऊंगा|मैं ज़िन्दगी ख़त्म|मैं जान दे दूंगा|मैं खुद को मार|आत्महत्या|মরতে চাই|মরে যাব|আত্মহত্যা)/i, w: 10 },
    ],
  };

  const RECOVERY_PATTERNS = [
    { re: /\b(i'm safe|i am safe|feeling safe|safe now|safe at home|in a safe place)\b/i, w: 4 },
    { re: /\b(i'm okay|i am okay|feeling better|feel better|much better|getting better|calmer now|feel calmer)\b/i, w: 3 },
    { re: /\b(don't want to hurt myself|won't hurt myself|not going to hurt myself|not going to do anything|don't want to die|dont want to die)\b/i, w: 5 },
    { re: /\b(things are better|everything is okay|i'm fine now|fine now|don't worry|no need to worry)\b/i, w: 3 },
    { re: /\b(main thik hoon|main safe hoon|ab behtar lag raha hai|ab thik hoon|kuch nahi karunga|bhalo achi|ami safe|thik achi)\b/i, w: 4 },
    { re: /\b(nahi karna chahta|nahi karna|kuch nahi karna|koshish karunga|koshish kar raha|samhal gaya|bach gaya|tension mat lo|shant hu)\b/i, w: 5 },
    { re: /(नहीं करना चाहता|नहीं करूँगा|नहीं करूंगा|कुछ नहीं करूँगा|कुछ नहीं करूंगा|कोशिश करूँगा|कोशिश करूंगा|कोशिश कर रहा|संभल गया|बच गया|शांत हूँ|शांत हु|ठीक हूँ|ठीक हु)/i, w: 5 },
  ];

  const THIRD_PERSON_RE = /\b(my friend|someone I know|a person|they|he|she|his|her|their|that person)\b/i;
  const HYPOTHETICAL_RE = /\b(what if|hypothetically|in a movie|in the film|documentary|news|article|book|story|imagine|suppose)\b/i;
  const PAST_QUOTE_RE = /\b(I (watched|read|saw|heard)|movie|film|show|series|article|news)\b/i;

  function isContextuallyRelevant(text, dimension) {
    const safetySensitive = ['selfHarmSignal', 'suicidalIdeation', 'immediateDanger'];
    if (!safetySensitive.includes(dimension)) return true;
    if (THIRD_PERSON_RE.test(text) && !(/\b(I|me|my|myself|main|mujhe|mera|meri|ami|amake|amar)\b/i.test(text))) return false;
    if (HYPOTHETICAL_RE.test(text)) return false;
    if (PAST_QUOTE_RE.test(text) && !(/\b(I want to|I'm going to|I will|main|ami)\b/i.test(text))) return false;
    return true;
  }

  function scoreOne(text, pats) {
    let best = 0;
    for (let i = 0; i < pats.length; i++) {
      if (pats[i].re.test(text)) best = Math.max(best, pats[i].w);
    }
    return best;
  }

  const REASON_LABELS = {
    emotionalDistress: 'Emotional distress',
    hopelessness: 'Hopelessness',
    anxietyFear: 'Anxiety / Fear',
    sleepDisruption: 'Sleep disruption',
    functionalImpairment: 'Functional impairment',
    socialIsolation: 'Social isolation',
    copingDifficulty: 'Difficulty coping',
    persistentDistress: 'Persistent distress',
    distressFrequency: 'Frequent distress',
    traumaIndicators: 'Trauma indicators',
    selfHarmSignal: 'Self-harm signals',
    suicidalIdeation: 'Suicidal thoughts',
    immediateDanger: 'Immediate danger',
  };

  function resolveLevel(score) {
    if (score >= SVI_THRESHOLDS.SEVERE) return 'SEVERE';
    if (score >= SVI_THRESHOLDS.HIGH) return 'HIGH';
    if (score >= SVI_THRESHOLDS.MODERATE_TO_HIGH) return 'MODERATE_TO_HIGH';
    if (score >= SVI_THRESHOLDS.MODERATE) return 'MODERATE';
    return 'LOW';
  }

  function assessSafety(signals) {
    if (signals.immediateDanger >= 8) return 'CRITICAL';
    if (signals.suicidalIdeation >= 7 || signals.selfHarmSignal >= 7) return 'HIGH';
    if (signals.suicidalIdeation >= 4 || signals.selfHarmSignal >= 4 || signals.hopelessness >= 8) return 'ELEVATED';
    return 'NONE';
  }

  function emptySignals() {
    return {
      emotionalDistress: 0,
      hopelessness: 0,
      anxietyFear: 0,
      sleepDisruption: 0,
      functionalImpairment: 0,
      socialIsolation: 0,
      copingDifficulty: 0,
      persistentDistress: 0,
      distressFrequency: 0,
      traumaIndicators: 0,
      selfHarmSignal: 0,
      suicidalIdeation: 0,
      immediateDanger: 0,
    };
  }

  class SVIEngine {
    constructor() {
      this.sigs = emptySignals();
      this.turnCount = 0;
      this.scoreHistory = [];
      this.maxLevel = 'ASSESSING';
      this.resourcesActivated = false;
    }

    observe(text) {
      this.turnCount++;
      const safeText = typeof text === 'string' ? text : '';
      const keys = Object.keys(this.sigs);
      const safetyKeys = ['selfHarmSignal', 'suicidalIdeation', 'immediateDanger'];

      let hasCurrentAcuteRisk = false;
      for (let i = 0; i < safetyKeys.length; i++) {
        const sk = safetyKeys[i];
        if (isContextuallyRelevant(safeText, sk) && scoreOne(safeText, P[sk]) > 0) {
          hasCurrentAcuteRisk = true;
          break;
        }
      }

      const recoveryScore = scoreOne(safeText, RECOVERY_PATTERNS);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const raw = scoreOne(safeText, P[key]);
        const relevant = isContextuallyRelevant(safeText, key);
        const effective = relevant ? raw : 0;
        const isSafety = safetyKeys.includes(key);

        if (effective > 0) {
          if (isSafety) {
            this.sigs[key] = Math.max(this.sigs[key], effective);
          } else {
            const gain = Math.min(STEP_UP, Math.max(0, effective - this.sigs[key]));
            this.sigs[key] = Math.min(10, this.sigs[key] + gain);
          }
        } else {
          let decay = STEP_DOWN;
          if (recoveryScore > 0 && !hasCurrentAcuteRisk) {
            decay = isSafety ? Math.min(4, recoveryScore) : Math.min(3, Math.floor(recoveryScore / 2) + 1);
          } else if (isSafety && !hasCurrentAcuteRisk) {
            decay = 1; // Smooth decay when user is no longer actively stating suicidal/self-harm ideation
          }
          this.sigs[key] = Math.max(0, this.sigs[key] - decay);
        }
      }

      const safety = assessSafety(this.sigs);
      let rawScore = keys.reduce((s, k) => s + this.sigs[k], 0);
      let score = Math.round((rawScore / 130) * 100);

      const floor = SAFETY_SVI_FLOOR[safety] || 0;
      if (score < floor) score = floor;
      score = Math.min(100, Math.max(0, score));

      this.scoreHistory.push(score);
      if (this.scoreHistory.length > TREND_WINDOW) this.scoreHistory.shift();
      const trend = this.computeTrend();

      const level = this.turnCount < MIN_TURNS ? 'ASSESSING' : resolveLevel(score);

      if (level === 'MODERATE_TO_HIGH' || level === 'HIGH' || level === 'SEVERE' || safety === 'CRITICAL' || safety === 'HIGH') {
        this.resourcesActivated = true;
      }

      const order = ['ASSESSING', 'LOW', 'MODERATE', 'MODERATE_TO_HIGH', 'HIGH', 'SEVERE'];
      if (order.indexOf(level) > order.indexOf(this.maxLevel)) {
        this.maxLevel = level;
      }

      const reasons = keys
        .filter(k => this.sigs[k] >= 3)
        .sort((a, b) => this.sigs[b] - this.sigs[a])
        .map(k => REASON_LABELS[k]);

      return {
        level,
        score,
        trend,
        signals: Object.assign({}, this.sigs),
        safety,
        reasons,
        turnCount: this.turnCount,
        maxLevel: this.maxLevel,
        resourcesActivated: this.resourcesActivated,
      };
    }

    computeTrend() {
      const h = this.scoreHistory;
      if (h.length < 2) return 'STABLE';
      const first = h[0];
      const last = h[h.length - 1];
      const delta = last - first;
      if (delta >= TREND_THRESHOLD) return 'INCREASING';
      if (delta <= -TREND_THRESHOLD) return 'DECREASING';
      return 'STABLE';
    }

    getState() {
      const keys = Object.keys(this.sigs);
      const safety = assessSafety(this.sigs);
      let rawScore = keys.reduce((s, k) => s + this.sigs[k], 0);
      let score = Math.round((rawScore / 130) * 100);
      const floor = SAFETY_SVI_FLOOR[safety] || 0;
      if (score < floor) score = floor;
      score = Math.min(100, Math.max(0, score));
      const level = this.turnCount < MIN_TURNS ? 'ASSESSING' : resolveLevel(score);
      const trend = this.computeTrend();
      const reasons = keys.filter(k => this.sigs[k] >= 3).sort((a, b) => this.sigs[b] - this.sigs[a]).map(k => REASON_LABELS[k]);
      return {
        level,
        score,
        trend,
        signals: Object.assign({}, this.sigs),
        safety,
        reasons,
        turnCount: this.turnCount,
        maxLevel: this.maxLevel,
        resourcesActivated: this.resourcesActivated,
      };
    }

    reset() {
      this.sigs = emptySignals();
      this.turnCount = 0;
      this.scoreHistory = [];
      this.maxLevel = 'ASSESSING';
      this.resourcesActivated = false;
    }
  }

  return { SVIEngine, resolveLevel, assessSafety };
}));
