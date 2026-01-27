import type { ContentType, WritingTip } from '@/types';
import { WRITING_TIPS } from '@/constants';

export function getTips(contentType: ContentType): WritingTip[] {
  const tips = WRITING_TIPS[contentType];
  if (!tips || tips.length === 0) return [];

  // Fisher-Yates shuffle on a copy
  const shuffled = [...tips];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Return 3-5 tips
  const count = Math.min(shuffled.length, 3 + Math.floor(Math.random() * 3));
  return shuffled.slice(0, count);
}
