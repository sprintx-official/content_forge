import type { ContentMetrics } from '@/types';

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length === 0) return 0;
  if (cleaned.length <= 2) return 1;

  let count = 0;
  let prevWasVowel = false;
  const vowels = 'aeiouy';

  for (let i = 0; i < cleaned.length; i++) {
    const isVowel = vowels.includes(cleaned[i]);
    if (isVowel && !prevWasVowel) {
      count++;
    }
    prevWasVowel = isVowel;
  }

  // Adjust for silent e at end
  if (cleaned.endsWith('e') && count > 1) {
    count--;
  }

  // Adjust for common endings that add syllables
  if (cleaned.endsWith('le') && cleaned.length > 2 && !vowels.includes(cleaned[cleaned.length - 3])) {
    count++;
  }

  return Math.max(1, count);
}

/**
 * Strip markdown / HTML markup so readability scores are based on actual prose,
 * not inflated by formatting characters like ** or # or <tags>.
 */
function stripMarkup(raw: string): string {
  let t = raw;
  // Remove HTML tags
  t = t.replace(/<[^>]+>/g, ' ');
  // Remove markdown headings (# ## ### etc.)
  t = t.replace(/^#{1,6}\s+/gm, '');
  // Remove markdown bold/italic markers
  t = t.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  t = t.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
  // Remove markdown strikethrough
  t = t.replace(/~~([^~]+)~~/g, '$1');
  // Remove markdown links [text](url) → text
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove markdown images ![alt](url)
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  // Remove markdown horizontal rules
  t = t.replace(/^[-*_]{3,}\s*$/gm, '');
  // Remove markdown code fences and inline code
  t = t.replace(/```[\s\S]*?```/g, ' ');
  t = t.replace(/`([^`]+)`/g, '$1');
  // Remove markdown blockquote markers
  t = t.replace(/^>\s*/gm, '');
  // Remove markdown list markers (-, *, 1.)
  t = t.replace(/^[\s]*[-*+]\s+/gm, '');
  t = t.replace(/^[\s]*\d+\.\s+/gm, '');
  // Collapse multiple spaces/newlines
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export function calculateMetrics(text: string): ContentMetrics {
  // Use raw text for word count (includes all visible content)
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Use stripped text for readability analysis (prose only, no markup noise)
  const prose = stripMarkup(text);
  const proseWords = prose.split(/\s+/).filter((w) => w.length > 0);
  const proseWordCount = proseWords.length;

  const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  let totalSyllables = 0;
  for (const word of proseWords) {
    totalSyllables += countSyllables(word);
  }

  const avgSentenceLength = proseWordCount / sentenceCount;
  const avgSyllablesPerWord = proseWordCount > 0 ? totalSyllables / proseWordCount : 1;

  // Flesch Reading Ease
  const rawReadability =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  const readabilityScore = Math.round(
    Math.min(100, Math.max(0, rawReadability)) * 10
  ) / 10;

  // Flesch-Kincaid Grade Level
  const rawGrade =
    0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;
  const gradeLevel = Math.round(
    Math.min(20, Math.max(1, rawGrade)) * 10
  ) / 10;

  const readTimeMinutes = Math.round((wordCount / 200) * 10) / 10;

  return {
    readabilityScore,
    gradeLevel,
    wordCount,
    sentenceCount,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    readTimeMinutes,
  };
}
