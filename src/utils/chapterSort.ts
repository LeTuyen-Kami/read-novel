import type { Chapter } from '../types';

/**
 * Extract chapter number from title
 * Supports formats like:
 * - "Chương 1: name"
 * - "Chương 2: name"
 * - "Ch. 1: name"
 * - "Chapter 1: name"
 * - "Chương 1"
 * Returns the number, or Infinity if not found (to put at end)
 */
export function extractChapterNumber(title: string): number {
  // Try various patterns
  const patterns = [
    /Chương\s+(\d+)/i, // "Chương 1", "Chương 10"
    /Ch\.\s*(\d+)/i, // "Ch. 1", "Ch.10"
    /Chapter\s+(\d+)/i, // "Chapter 1"
    /^(\d+)/, // Just starts with number
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) {
        return num;
      }
    }
  }

  // If no number found, try to extract any number from the title
  const anyNumberMatch = title.match(/\d+/);
  if (anyNumberMatch) {
    const num = parseInt(anyNumberMatch[0], 10);
    if (!isNaN(num)) {
      return num;
    }
  }

  // Return Infinity to put at the end
  return Infinity;
}

/**
 * Sort chapters by their number extracted from title
 */
export function sortChapters(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => {
    const numA = extractChapterNumber(a.title);
    const numB = extractChapterNumber(b.title);

    // If both have valid numbers, sort by number
    if (numA !== Infinity && numB !== Infinity) {
      return numA - numB;
    }

    // If only one has a number, prioritize it
    if (numA !== Infinity) return -1;
    if (numB !== Infinity) return 1;

    // If neither has a number, maintain original order (or sort alphabetically)
    return a.title.localeCompare(b.title, 'vi');
  });
}

