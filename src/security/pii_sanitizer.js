/**
 * PII Sanitizer for victim protection.
 * Masks Indian phone numbers, Aadhaar numbers, and email addresses.
 */
function sanitizePII(text = '') {
  if (!text || typeof text !== 'string') return text;

  // Mask Indian 10-digit mobile numbers (starting with 6-9)
  let sanitized = text.replace(/\b[6-9]\d{9}\b/g, '[PHONE_MASKED]');
  
  // Mask 12-digit Aadhaar patterns (XXXX XXXX XXXX or XXXXXXXXXXXX)
  sanitized = sanitized.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[AADHAAR_MASKED]');

  // Mask Emails
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_MASKED]');

  return sanitized;
}

module.exports = { sanitizePII };
