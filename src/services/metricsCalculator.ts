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

export function calculateMetrics(text: string): ContentMetrics {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 1;

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
