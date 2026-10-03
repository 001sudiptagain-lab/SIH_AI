/**
 * Unicode-Aware Multilingual Patterns & Lexicons for SAATHI AI SVI 2.0
 * Supports: Hindi (Devanagari), Hinglish (Romanized Hindi), Bengali (বাংলা), English.
 * 
 * Uses Unicode-aware boundary lookarounds:
 *   (?<![\p{L}\p{M}]) and (?![\p{L}\p{M}]) with the 'u' flag.
 */

// Helper to create Unicode-aware boundary regex
function uRegex(patternStr, flags = 'iu') {
  return new RegExp(`(?<![\\p{L}\\p{M}])(?:${patternStr})(?![\\p{L}\\p{M}])`, flags);
}

// Negation patterns across languages
const NEGATION_PATTERNS = [
  uRegex("not|don't|dont|cannot|cant|can't|never|hardly|neither|no longer"),
  uRegex("nahi|nahin|mat|nhi|kuch nahi|koi nahi"),
  uRegex("नहीं|मत|कोई नहीं|कुछ नहीं"),
  uRegex("নয়|কোনো না|নেই কিছু|না আমি|বলছি না")
];

// First-person pronoun patterns across languages
const FIRST_PERSON_PATTERNS = [
  uRegex("i|me|my|myself|i'm|im|i've|ive|i'll"),
  uRegex("main|mujhe|mera|meri|mere|hum|humko|apna|apne|apni"),
  new RegExp("(मैं|मुझे|मेरा|मेरी|मेरे|हम|हमको|अपना|अपनी|अपने)", "iu"),
  uRegex("ami|amake|amar|nijeke"),
  new RegExp("(আমি|আমাকে|আমার|নিজেকে)", "iu")
];

// Third-person / other referent patterns
const THIRD_PERSON_PATTERNS = [
  uRegex("he|she|they|them|his|her|their|my friend|a friend|someone|someone i know|that person|people"),
  uRegex("woh|wo|unka|unki|unke|uska|uski|uske|dost|koi|mera dost|meri saheli|mera bhai|meri behen"),
  new RegExp("(वह|वो|उनका|उनकी|उसके|उसकी|दोस्त|मेरा दोस्त|कोई और|मेरा भाई|मेरी बहन)", "iu"),
  uRegex("se|tara|tar|tader|bondhu|amar bondhu|amar bhai"),
  new RegExp("(সে|তারা|তার|তাদের|বন্ধু|আমার বন্ধু|আমার ভাই)", "iu")
];

// Hypothetical / Media context patterns
const HYPOTHETICAL_PATTERNS = [
  uRegex("what if|hypothetically|suppose|imagine|in a movie|in the film|in the news|watched a video|read a book|story"),
  uRegex("agar aisa ho|film me|movie me|kahani|news me|socho"),
  new RegExp("(अगर ऐसा हो|फिल्म में|मूवी में|कहानी में|न्यूज़ में|सोचो)", "iu"),
  uRegex("jodi erom hoy|cinemay|golpo|khobor"),
  new RegExp("(যদি এরকম হয়|যদি নাটকে|সিনেমায়|নাটকে|গল্পে|খবরে|ভাবো)", "iu")
];

// Explicit Safety Recovery & Reassurance Patterns (de-escalation)
const RECOVERY_PATTERNS = [
  { re: uRegex("i'm safe|i am safe|feeling safe|safe now|safe at home|in a safe place"), w: 5 },
  { re: uRegex("i'm okay|i am okay|feeling better|feel better|much better|getting better|calmer now|feel calmer|breathing now"), w: 4 },
  { re: uRegex("don't want to hurt myself|won't hurt myself|not going to hurt myself|not going to do anything|don't want to die|dont want to die"), w: 6 },
  { re: uRegex("things are better|everything is okay|i'm fine now|fine now|don't worry|no need to worry"), w: 4 },
  { re: uRegex("main thik hoon|main safe hoon|ab behtar lag raha hai|ab thik hoon|kuch nahi karunga|bhalo achi|ami safe|thik achi|shanto achi"), w: 5 },
  { re: uRegex("nahi karna chahta|nahi karna|kuch nahi karna|koshish karunga|koshish kar raha|samhal gaya|bach gaya|tension mat lo|shant hu|better lag raha"), w: 6 },
  { re: new RegExp("(नहीं करना चाहता|नहीं करूँगा|नहीं करूंगा|कुछ नहीं करूँगा|कुछ नहीं करूंगा|कोशिश करूँगा|कोशिश करूंगा|कोशिश कर रहा|संभल गया|बच गया|शांत हूँ|शांत हु|ठीक हूँ|ठीक हु|अब ठीक है|सब ठीक है|चिंता मत करो|सुकून महसूस)", "iu"), w: 6 },
  { re: new RegExp("(ভালো আছি|আমি নিরাপদ|ঠিক আছি|আর কষ্ট নেই|শান্ত আছি|শান্ত অনুভব)", "iu"), w: 5 }
];

// 13 Observable SVI Dimension Lexicons
const SVI_DIMENSION_PATTERNS = {
  emotionalDistress: [
    { re: uRegex("crying|cry|sobbing|depressed|depression|sad|sadness|unhappy|heartbroken|broken|devastated|grief|hurting|pain|heartbreak|breakup|break up|lonely|isolated"), w: 7 },
    { re: uRegex("rona|ro raha|ro rahi|udaas|udas|dard|takleef|dukh|dukhi|dil toot gaya|bura lag raha|pareshan|pareshani|heartbreak|break up|breakup|dil toot|akelapan|akela"), w: 7 },
    { re: new RegExp("(रोना|रो रहा|रो रही|उदास|उदासी|दर्द|तकलीफ|दुःख|दुख|दुखी|दिल टूट|बुरा लग रहा|परेशान|परेशानी|तनाव|मन बहुत खराब|मन खराब|अकेलापन|अकेला|डर लग रहा|बहुत डर)", "iu"), w: 7 },
    { re: uRegex("kosto|mon kharap|kanna|kandchi|dukkho|bhalo lagena"), w: 7 },
    { re: new RegExp("(কষ্ট|মন খারাপ|কান্না|কাঁদছি|দুঃখ|ভালো লাগেনা|চিন্তা হচ্ছে|মন খুব খারাপ|একা লাগছে)", "iu"), w: 7 }
  ],

  hopelessness: [
    { re: uRegex("hopeless|worthless|useless|no point|pointless|give up|given up|nothing matters|no future|why bother|empty inside|heartbreak|break up|breakup"), w: 7 },
    { re: uRegex("koi ummeed nahi|kuch nahi bacha|sab khatam|himmat toot gayi|zindagi bekar|mera koi nahi|koi fayda nahi|dil toot gaya"), w: 7 },
    { re: new RegExp("(कोई उम्मीद नहीं|कुछ नहीं बचा|सब खत्म|हिम्मत टूट गई|ज़िन्दगी बेकार|जिंदगी बेकार|मेरा कोई नहीं|कोई फायदा नहीं|खालीपन|दिल टूट)", "iu"), w: 7 },
    { re: uRegex("aar kono aasha nei|shob shesh|kono labh nei|hoye gelo shob"), w: 7 },
    { re: new RegExp("(আর কোনো আশা নেই|সব শেষ|কোনো লাভ নেই|হয়ে গেল সব)", "iu"), w: 7 }
  ],

  anxietyFear: [
    { re: uRegex("anxious|anxiety|panic|panicking|fear|scared|terrified|shaking|trembling|nightmare|dread|freaking out|panic attack|panic attacks|overwhelmed with work"), w: 8 },
    { re: uRegex("dar lag raha|darr|ghabrahat|ghabra raha|kaamp raha|bechain|bechaini|khauf|tension ho rahi|tension|jhagda"), w: 7 },
    { re: new RegExp("(डर लग रहा|डर|घबराहट|घबरा रहा|घबरा रही|कांप रहा|बेचैन|बेचैनी|खौफ|दिल घबरा|सांस लेने में बहुत दिक्कत|बहुत डर|सांस लेने में दिक्कत)", "iu"), w: 8 },
    { re: uRegex("bhoy lagche|bhoy|aatongko|chinta|oshosti"), w: 7 },
    { re: new RegExp("(ভয় লাগছে|ভয়|আতঙ্ক|চিন্তা|অস্বস্তি|খুব চিন্তা)", "iu"), w: 7 }
  ],

  sleepDisruption: [
    { re: uRegex("insomnia|can't sleep|cant sleep|haven't slept|not sleeping|wake up crying|nightmares|sleepless|haven't slept in"), w: 8 },
    { re: uRegex("neend nahi aa rahi|neend nahi aati|so nahi pa raha|so nahi pa rahi|raat bhar jaag|bure sapne"), w: 6 },
    { re: new RegExp("(नींद नहीं आ रही|नींद नहीं आती|सो नहीं पा रहा|सो नहीं पा रही|रात भर जाग|बुरे सपने)", "iu"), w: 6 },
    { re: uRegex("ghum asche na|ghumate parchi na|raate ghum nei"), w: 6 },
    { re: new RegExp("(ঘুম আসছে না|ঘুমাতে পারছি না|রাতে ঘুম নেই)", "iu"), w: 6 }
  ],

  functionalImpairment: [
    { re: uRegex("can't work|cant work|stopped eating|can't get out of bed|unable to eat|not eating|unable to function|lost appetite|haven't slept"), w: 7 },
    { re: uRegex("kaam nahi kar pa raha|khana nahi khaya|bistar se nahi uth|kuch nahi ho raha|bhookh mar gayi"), w: 7 },
    { re: new RegExp("(काम नहीं कर पा रहा|खाना नहीं खाया|बिस्तर से नहीं|भूख मर गई|कुछ नहीं हो पा रहा|पढ़ाई नहीं हुई|पढ़ाई नहीं)", "iu"), w: 7 },
    { re: uRegex("kaaj korte parchi na|khete parchi na|kichu bhalo lagche na"), w: 7 },
    { re: new RegExp("(কাজ করতে পারছি না|খেতে পারছি না|কিছু করতে পারছি না|কিছুই পড়া হয়নি)", "iu"), w: 7 }
  ],

  socialIsolation: [
    { re: uRegex("all alone|isolated|nobody cares|no one cares|no friends|abandoned|cut off|left me alone|everyone left|zero friends|nobody talks to me|feel so lonely|lonely and isolated"), w: 8 },
    { re: uRegex("bohot akela|sabne chhod diya|koi baat nahi karta|mera koi dost nahi|akelapan|koi mujhse baat"), w: 7 },
    { re: new RegExp("(बहुत अकेला|अकेला हूँ|अकेली हूँ|अकेलापन|सबने छोड़ दिया|कोई बात नहीं करता|कोई मुझसे बात नहीं|कोई मुझसे बात|कोई दोस्त नहीं)", "iu"), w: 8 },
    { re: uRegex("ekla|keu nei|shobai chere geche|amar pashe keu nei"), w: 7 },
    { re: new RegExp("(একলা|কেউ নেই|সবাই ছেড়ে গেছে|আমার পাশে কেউ নেই|খুব একা)", "iu"), w: 8 }
  ],

  copingDifficulty: [
    { re: uRegex("can't cope|cant take it|too much for me|overwhelmed|falling apart|breaking down|losing control|can't handle|deadlines due|deadlines|breakup|break up|heartbreak"), w: 7 },
    { re: uRegex("sambhal nahi raha|bardasht nahi ho raha|ab jhela nahi jata|seh nahi pa raha|control kho raha|jhagda ho gaya|boss se jhagda|rona aa raha"), w: 7 },
    { re: new RegExp("(संभल नहीं रहा|बर्दाश्त नहीं|झेला नहीं जाता|सह नहीं पा रहा|कंट्रोल खो रहा|परीक्षा में सिर्फ|तनाव हो रहा|सांस लेने में बहुत दिक्कत|दिक्कत हो रही|दिल घबरा रहा)", "iu"), w: 7 },
    { re: uRegex("aar shamlate parchi na|shojjo hocche na|parchi na aar"), w: 7 },
    { re: new RegExp("(আর সামলাতে পারছি না|সহ্য হচ্ছে না|পারছি না আর|পরীক্ষার জন্য)", "iu"), w: 7 }
  ],

  persistentDistress: [
    { re: uRegex("for months|for years|since long time|never ends|weeks now|every single day|for a long time|days straight|won't stop|wont stop"), w: 7 },
    { re: uRegex("mahino se|saalon se|kaafi time se|bahut dino se|khatam hi nahi hota|roz ka yahi hai|ruk nahi raha|tham nahi raha"), w: 6 },
    { re: new RegExp("(महीनों से|सालों से|काफी समय से|बहुत दिनों से|खत्म ही नहीं होता|रोज का यही)", "iu"), w: 6 },
    { re: uRegex("onek din dhore|mash dhore|bochor dhore|shesh hocche na"), w: 6 },
    { re: new RegExp("(অনেক দিন ধরে|মাস ধরে|বছর ধরে|শেষ হচ্ছে না)", "iu"), w: 6 }
  ],

  distressFrequency: [
    { re: uRegex("every day|constantly|nonstop|all the time|always|24/7|day and night|lately|days straight|won't stop"), w: 6 },
    { re: uRegex("har roz|har din|din raat|hamesha|har waqt|lagataar|aaj kal"), w: 6 },
    { re: new RegExp("(हर रोज़|हर रोज|हर दिन|दिन रात|हमेशा|हर वक्त|लगातार|आज कल)", "iu"), w: 6 },
    { re: uRegex("protidin|shob shomoy|din raat|shobdin"), w: 6 },
    { re: new RegExp("(প্রতিদিন|সব সময়|দিন রাত|সারাক্ষণ)", "iu"), w: 6 }
  ],

  traumaIndicators: [
    { re: uRegex("assaulted|abused|attacked|violence|hit me|beaten|flashbacks|reliving|tortured"), w: 8 },
    { re: uRegex("mara peeta|hamla kiya|hinsa|maar peet|zabardasti|zulm|haath uthaya"), w: 8 },
    { re: new RegExp("(मारा पीटा|हमला किया|हिंसा|मार पीट|जबरदस्ती|ज़ुल्म|हाथ उठाया|दुर्व्यवहार)", "iu"), w: 8 },
    { re: uRegex("maar dhor|aakromon|ottachar|hingsha"), w: 8 },
    { re: new RegExp("(মারধর|আক্রমণ|অত্যাচার|হিংসা)", "iu"), w: 8 }
  ],

  selfHarmSignal: [
    { re: uRegex("hurting myself|cut my wrist|cutting myself|harm myself|burn myself|punish myself|bleed"), w: 9 },
    { re: uRegex("khud ko chot|apne aap ko maarna|haath kaat|apne aap ko nuksan|khud ko dard|khoon nikal raha"), w: 9 },
    { re: new RegExp("(खुद को चोट|अपने आप को नुकसान|हाथ काट|खुद को दर्द देना|खुद को नुकसान)", "iu"), w: 9 },
    { re: uRegex("nijeke aaghat|haat kata|nijeke kosto dewa|rokto berocche"), w: 9 },
    { re: new RegExp("(নিজেকে আঘাত|হাত কাটা|হাত কেটে|রক্ত বেরোচ্ছে|নিজেকে কষ্ট দেওয়া)", "iu"), w: 9 }
  ],

  suicidalIdeation: [
    { re: uRegex("want to die|wanna die|suicide|suicidal|end my life|kill myself|better off dead|no reason to live|tired of living"), w: 10 },
    { re: uRegex("mar jaana chahta|marna chahta|marna chahti|jeena nahi chahta|jeena nahi chahti|jaan de dunga|aatmhatya|khudkushi|zindagi khatam|suicide karna|mar jana hai|jeena nahi hai"), w: 10 },
    { re: new RegExp("(सुसाइड|आत्महत्या|खुदकुशी|मर जाना चाहता|मरना चाहता|मरना चाहती|जीना नहीं चाहता|जीना नहीं चाहती|जान दे दूंगा|जान दे दूंगी|ज़िन्दगी खत्म|जिंदगी खत्म|मौत आ जाए)", "iu"), w: 10 },
    { re: uRegex("morte chai|more jabo|aar bachte chai na|jeebon sesh|aattohotta"), w: 10 },
    { re: new RegExp("(মরতে চাই|মরে যাব|আর বাঁচতে চাই না|জীবন শেষ|আত্মহত্যা)", "iu"), w: 10 }
  ],

  immediateDanger: [
    { re: uRegex("going to kill myself right now|tonight i will die|i have a plan to die|swallowing pills now|jumping from roof|i will commit suicide|kill myself tonight"), w: 10 },
    { re: uRegex("aaj raat ko mar jaunga|chhat se kood raha|zeher kha liya|abhi suicide kar raha|main apni jaan lene ja raha|aatmhatya kar lunga aaj raat|sab kuch khatam karne ka mann hai"), w: 10 },
    { re: new RegExp("(सुसाइड करूँगा|सुसाइड करूंगा|सुसाइड करने जा|आज रात को मर|छत से कूद रहा|ज़हर खा लिया|जहर खा लिया|अभी सुसाइड कर रहा|जान देने जा रहा|फांसी लगानी|फांसी लगाऊंगा)", "iu"), w: 10 },
    { re: uRegex("aajke rate more jabo|bikh kheyechi|chhad theke laf|aajkei aattohotta"), w: 10 },
    { re: new RegExp("(আজকে রাতে মরে যাব|বিষ খেয়েছি|ছাদ থেকে লাফ|আত্মহত্যা করব আজকেই|গলায় দড়ি দেব|সব শেষ করে দেব)", "iu"), w: 10 }
  ]
};

module.exports = {
  uRegex,
  NEGATION_PATTERNS,
  FIRST_PERSON_PATTERNS,
  THIRD_PERSON_PATTERNS,
  HYPOTHETICAL_PATTERNS,
  RECOVERY_PATTERNS,
  SVI_DIMENSION_PATTERNS
};
