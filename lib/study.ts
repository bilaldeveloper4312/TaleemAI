export type StudyPage = {
  page: number;
  text: string;
};

export type StudyChunk = {
  id: string;
  page: number;
  text: string;
};

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "among", "because", "before", "being",
  "between", "could", "does", "from", "have", "into", "more", "most", "only",
  "other", "should", "some", "such", "than", "that", "their", "there", "these",
  "they", "this", "those", "through", "what", "when", "where", "which", "while",
  "with", "would", "your", "explain", "tell", "please",
]);

export function chunkPages(pages: StudyPage[], size = 1_000, overlap = 160): StudyChunk[] {
  const chunks: StudyChunk[] = [];
  for (const { page, text } of pages) {
    const cleanText = text.replace(/\s+/g, " ").trim();
    for (let start = 0; start < cleanText.length; start += size - overlap) {
      const passage = cleanText.slice(start, start + size).trim();
      if (passage.length >= 60) {
        chunks.push({ id: `p${page}-c${chunks.length}`, page, text: passage });
      }
    }
  }
  return chunks;
}

export function retrieveChunks(query: string, chunks: StudyChunk[], limit = 5): StudyChunk[] {
  const terms = [...new Set(
    (query.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])
      .filter((term) => !STOP_WORDS.has(term)),
  )];
  if (terms.length === 0) return [];

  return chunks
    .map((chunk) => {
      const text = chunk.text.toLocaleLowerCase();
      const score = terms.reduce((total, term) => {
        const matches = text.split(term).length - 1;
        return total + Math.min(matches, 4) * (term.length > 5 ? 1.5 : 1);
      }, 0);
      return { chunk, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.page - b.chunk.page)
    .slice(0, limit)
    .map(({ chunk }) => chunk);
}
