// utils/chunker.js
//
// Splits plain text into overlapping chunks suitable for embedding and
// retrieval. Generic — no dependency on category/subcategory or any
// specific data model.
//
// Chunking strategy:
//   1. Split text by double-newlines (paragraphs).
//   2. Merge small consecutive paragraphs until hitting ~MAX_TOKENS.
//   3. Split oversized paragraphs at sentence boundaries.
//   4. Apply OVERLAP_TOKENS of overlap between adjacent chunks.

const MAX_TOKENS = 600;
const OVERLAP_TOKENS = 100;

// Rough token estimate: ~4 chars per token for English text.
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Split text into sentences.
function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]+[\s]*/g);
  if (!raw) return [text];
  const joined = raw.join("");
  if (joined.length < text.length) {
    raw.push(text.slice(joined.length));
  }
  return raw.filter((s) => s.trim().length > 0);
}

// Split a single paragraph into pieces each under maxTokens.
function splitOversizedParagraph(paragraph, maxTokens) {
  const sentences = splitSentences(paragraph);
  const pieces = [];
  let current = "";

  for (const sentence of sentences) {
    const combined = current ? current + sentence : sentence;
    if (estimateTokens(combined) > maxTokens && current) {
      pieces.push(current.trim());
      current = sentence;
    } else {
      current = combined;
    }
  }
  if (current.trim()) {
    pieces.push(current.trim());
  }
  return pieces;
}

// Main chunking function.
//   text: plain string to chunk
//   Returns: string[] — array of chunk texts with overlap applied.
function chunkText(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return [];

  // Flatten oversized paragraphs into sentence-level pieces.
  const pieces = [];
  for (const para of paragraphs) {
    if (estimateTokens(para) > MAX_TOKENS) {
      pieces.push(...splitOversizedParagraph(para, MAX_TOKENS));
    } else {
      pieces.push(para);
    }
  }

  // Merge small consecutive pieces into chunks up to MAX_TOKENS.
  const rawChunks = [];
  let current = "";

  for (const piece of pieces) {
    const combined = current ? current + "\n\n" + piece : piece;
    if (estimateTokens(combined) > MAX_TOKENS && current) {
      rawChunks.push(current);
      current = piece;
    } else {
      current = combined;
    }
  }
  if (current) {
    rawChunks.push(current);
  }

  // Apply overlap: take the last OVERLAP_TOKENS worth of text from the
  // previous chunk and prepend it to the next chunk.
  const chunks = [];
  for (let i = 0; i < rawChunks.length; i++) {
    if (i === 0) {
      chunks.push(rawChunks[i]);
    } else {
      const prevText = rawChunks[i - 1];
      const overlapChars = OVERLAP_TOKENS * 4;
      const overlap =
        prevText.length > overlapChars
          ? "..." + prevText.slice(-overlapChars)
          : prevText;
      chunks.push(overlap + "\n\n" + rawChunks[i]);
    }
  }

  return chunks;
}

module.exports = { chunkText };
