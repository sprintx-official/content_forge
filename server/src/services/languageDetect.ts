// Unicode character ranges for common non-Latin scripts
const SCRIPT_PATTERNS: [RegExp, string][] = [
  [/[\u0600-\u06FF]/, 'ar'],   // Arabic
  [/[\u0750-\u077F]/, 'ar'],   // Arabic Supplement
  [/[\u0900-\u097F]/, 'hi'],   // Devanagari (Hindi)
  [/[\u0600-\u06FF\u0750-\u077F].*[\u0600-\u06FF\u0750-\u077F]/, 'ur'], // Urdu
  [/[\u4E00-\u9FFF]/, 'zh'],   // Chinese
  [/[\u3040-\u309F]/, 'ja'],   // Japanese Hiragana
  [/[\u30A0-\u30FF]/, 'ja'],   // Japanese Katakana
  [/[\uAC00-\uD7AF]/, 'ko'],   // Korean
  [/[\u0E00-\u0E7F]/, 'th'],   // Thai
  [/[\u0400-\u04FF]/, 'ru'],   // Cyrillic (Russian)
  [/[\u0980-\u09FF]/, 'bn'],   // Bengali
  [/[\u0A80-\u0AFF]/, 'gu'],   // Gujarati
  [/[\u0B80-\u0BFF]/, 'ta'],   // Tamil
]

/**
 * Detect the language of a text using character-range heuristics.
 * Fast, no API calls — suitable for high-volume article processing.
 * Returns an ISO 639-1 language code (e.g., 'en', 'ar', 'ur').
 */
export function detectLanguage(text: string): string {
  if (!text || text.length < 10) return 'en'

  const sample = text.slice(0, 500)

  for (const [pattern, lang] of SCRIPT_PATTERNS) {
    if (pattern.test(sample)) return lang
  }

  // Check for common French/Spanish word patterns
  const frenchPattern = /\b(le|la|les|de|des|du|un|une|est|dans|pour|avec|sur|pas|qui|que)\b/i
  const spanishPattern = /\b(el|la|los|las|de|del|en|por|con|una|que|es|para)\b/i

  if (frenchPattern.test(sample)) return 'fr'
  if (spanishPattern.test(sample)) return 'es'

  return 'en'
}
