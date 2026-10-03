/**
 * Identifies language and script for Indian multilingual contexts.
 * Supports: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi, Urdu, English.
 */
function detectLanguage(text = '') {
  if (!text || typeof text !== 'string') return { code: 'en', name: 'English' };

  // Unicode block checks
  if (/[\u0900-\u097F]/.test(text)) {
    // Devanagari script: Hindi / Marathi
    if (/\b(aahe|nahi|kela|zhala|mala)\b/i.test(text)) {
      return { code: 'mr', name: 'Marathi (मराठी)' };
    }
    return { code: 'hi', name: 'Hindi (हिंदी)' };
  }
  if (/[\u0980-\u09FF]/.test(text)) return { code: 'bn', name: 'Bengali (বাংলা)' };
  if (/[\u0B80-\u0BFF]/.test(text)) return { code: 'ta', name: 'Tamil (தமிழ்)' };
  if (/[\u0C00-\u0C7F]/.test(text)) return { code: 'te', name: 'Telugu (తెలుగు)' };
  if (/[\u0A80-\u0AFF]/.test(text)) return { code: 'gu', name: 'Gujarati (ગુજરાતી)' };
  if (/[\u0C80-\u0CFF]/.test(text)) return { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' };
  if (/[\u0D00-\u0D7F]/.test(text)) return { code: 'ml', name: 'Malayalam (മലയാളം)' };
  if (/[\u0A00-\u0A7F]/.test(text)) return { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' };
  if (/[\u0B00-\u0B7F]/.test(text)) return { code: 'or', name: 'Odia (ଓଡ଼ିଆ)' };
  if (/[\u0600-\u06FF]/.test(text)) return { code: 'ur', name: 'Urdu (اردو)' };

  // Romanized Hindi / Hinglish checks
  if (/\b(hai|hain|tha|thi|mujhe|humko|nahi|marne|dhamki|bhai|police)\b/i.test(text)) {
    return { code: 'hi-Latn', name: 'Hinglish / Romanized Hindi' };
  }

  return { code: 'en', name: 'English' };
}

module.exports = { detectLanguage };
