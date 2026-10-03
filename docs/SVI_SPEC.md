# SVI 2.0 SPECIFICATION & CALIBRATION FORMULA

**Version:** 2.0.0  
**Specification Document:** `docs/SVI_SPEC.md`  
**Purpose:** Formal calibration formula, saturation dynamics, thresholds, hysteresis, and deterministic safety override rules for the Stress Vulnerability Index in SAATHI AI.

---

## 1. Core Principles

1. **Non-Diagnostic:** SVI measures observable linguistic, contextual, and acoustic vulnerability markers during human conversation. It is **not** a psychiatric or clinical diagnostic score.
2. **Deterministic Safety Primacy:** High-risk indicators (suicidal ideation, self-harm, active violence threats) trigger instant categorical overrides that bypass all temporal smoothing and cannot be diluted by low scores on other dimensions.
3. **Multi-Signal Dimensionality:** Evaluates 13 distinct psychological and operational dimensions without diluting multi-signal distress through excessive normalization.

---

## 2. The 13 Observable SVI Dimensions

Each dimension is scored integer $0 \le d_i \le 10$:

| Dimension Key | Clinical/Operational Concept | Primary Observable Cues |
| :--- | :--- | :--- |
| `emotionalDistress` | Sadness, emotional pain, crying, grief | "दर्द", "रोना", "broken", "crying", "mon kharap" |
| `hopelessness` | Helplessness, zero perceived future | "कोई उम्मीद नहीं", "nothing matters", "pointless" |
| `anxietyFear` | Panic, nervousness, acute dread | "घबराहट", "डर लग रहा", "panic", "terrified" |
| `sleepDisruption` | Severe insomnia, nightmares | "नींद नहीं आ रही", "nightmares", "can't sleep" |
| `functionalImpairment` | Inability to eat, work, get out of bed | "खाना नहीं खाया", "stopped going out", "can't function" |
| `socialIsolation` | Severed support system, feeling alone | "कोई साथ नहीं है", "nobody cares", "alone" |
| `copingDifficulty` | Overwhelmed by ordinary stressors | "संभल नहीं रहा", "can't cope", "too much" |
| `persistentDistress` | Longstanding chronic suffering | "महीनों से", "for years", "never goes away" |
| `distressFrequency` | Daily, relentless recurrence | "हर रोज़", "constantly", "every day" |
| `traumaIndicators` | Violence, assault, flashbacks, abuse | "मारा पीटा", "attacked", "abused", "reliving" |
| `selfHarmSignal` | Physical self-harm, cutting, punishment | "खुद को चोट", "hurting myself", "cutting" |
| `suicidalIdeation` | Explicit desire to die or disappear | "मरना चाहता हूँ", "want to die", "suicide" |
| `immediateDanger` | Active suicide plan, weapons, active violence | "छत से कूद रहा हूँ", "tonight I will do it" |

---

## 3. Calibrated SVI Composite Formula

### 3.1 Defect in Old Formula
Previously:
$$\text{Score} = \frac{\sum_{i=1}^{13} d_i}{130} \times 100$$
*Problem:* Satiation required all 13 dimensions to be simultaneously maximum. A person suffering high distress in 4 dimensions ($4 \times 8 = 32$) scored only $32 / 130 = 24.6$, misclassifying them as **LOW**.

### 3.2 New Calibrated Saturation Model
Clinical distress clusters into primary symptom domains. The new formula calculates:
1. **Top Saliency ($S_{\text{top}}$):** Mean of the top 3 highest scoring dimensions:
   $$S_{\text{top}} = \frac{d_{(1)} + d_{(2)} + d_{(3)}}{3} \quad (0 \le S_{\text{top}} \le 10)$$
2. **Broad Symptom Burden ($B_{\text{burden}}$):** Sum of all remaining 10 dimensions, normalized to $0 - 10$:
   $$B_{\text{burden}} = \min\left(10, \frac{\sum_{k=4}^{13} d_{(k)}}{4}\right)$$
3. **Raw Composite ($SVI_{\text{raw}}$):**
   $$SVI_{\text{raw}} = \text{round}\left(S_{\text{top}} \times 7.5 + B_{\text{burden}} \times 2.5\right)$$

*Example Validation:*
- User distressed on 3 dimensions ($8, 8, 7$):  
  $S_{\text{top}} = 7.67$. $S_{\text{top}} \times 7.5 = 57.5$. $B_{\text{burden}} \approx 2.5$.  
  $SVI_{\text{raw}} = 60 \rightarrow$ **HIGH / MODERATE-HIGH** band (accurate representation).
- Casual chat ($0, 0, 0$):  
  $SVI_{\text{raw}} = 0 \rightarrow$ **LOW** band.

---

## 4. Deterministic Safety Floor Overrides

Safety scanners have unconditional authority. If triggered, SVI score is clamped to a mandatory floor regardless of other dimensions:

| Safety Tier | Trigger Criteria | SVI Floor | Displayed Badge | Mandatory Action |
| :--- | :--- | :--- | :--- | :--- |
| **CRITICAL** | `immediateDanger >= 8` OR explicit imminent plan | **95** | `CRITICAL` | Display Tele-MANAS (14416) / 112 emergency banner |
| **HIGH** | `suicidalIdeation >= 7` OR `selfHarmSignal >= 7` | **85** | `HIGH` | Urgent crisis de-escalation & helpline bridge |
| **ELEVATED** | `suicidalIdeation >= 4` OR `hopelessness >= 8` | **65** | `ELEVATED` | Empathetic inquiry & distress validation |
| **NONE** | No acute safety keywords | None (0) | Level-dependent | Normal conversational support |

---

## 5. Temporal Smoothing & Hysteresis

To prevent the badge from oscillating between adjacent tiers during a single conversation turn:

1. **Escalation (Upward Shift):**
   - If current $SVI_{\text{raw}} > SVI_{\text{smoothed}} + 15$ or acute safety is triggered:  
     **Fast attack:** $\alpha_{\text{up}} = 0.65$
     $$SVI_{\text{smoothed}} = SVI_{\text{smoothed}} \times 0.35 + SVI_{\text{raw}} \times 0.65$$
2. **De-escalation (Downward Shift):**
   - Downward movement uses gentle exponential decay ($\alpha_{\text{down}} = 0.25$):
     $$SVI_{\text{smoothed}} = SVI_{\text{smoothed}} \times 0.75 + SVI_{\text{raw}} \times 0.25$$
   - When the user explicitly articulates safety and reassurance ("I'm safe", "सब ठीक है", "नहीं करूंगा"):  
     $\alpha_{\text{recovery}} = 0.60$ downward tracking.

### 5.1 Level Thresholds (with Hysteresis)
- **LOW:** $0 - 25$
- **MODERATE:** $26 - 45$
- **MODERATE_TO_HIGH:** $46 - 65$
- **HIGH:** $66 - 84$
- **SEVERE:** $85 - 100$
- **Hysteresis Band:** A score must drop 3 points below a threshold before the level badge steps down (e.g. from MODERATE to LOW requires score $\le 22$).
