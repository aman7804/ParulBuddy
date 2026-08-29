// utils/matcher.js
//
// Plain RAG retrieval: embed the query, cosine-search all chunks, return
// the top-k most similar. No classification, no aggregate branching, no
// FAQ-first matching. One code path for every question.

const Chunk = require("../models/Chunk");
const UnansweredQuestion = require("../models/UnansweredQuestion");
const { getEmbedding, cosineSimilarity } = require("./embeddings");

const SIMILARITY_THRESHOLD = 0.5;

async function findRelevantChunks(question, topK = 5) {
  const questionEmbedding = await getEmbedding(question);
  const allChunks = await Chunk.find({ embedding: { $ne: [] } }).lean();

  const scored = allChunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(questionEmbedding, chunk.embedding),
  }));

  const matched = scored
    .filter((s) => s.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (matched.length === 0) {
    try {
      await UnansweredQuestion.findOneAndUpdate(
        { question: question.trim() },
        { $inc: { timesAsked: 1 } },
        { upsert: true, setDefaultsOnInsert: true },
      );
    } catch (err) {
      console.error("Failed to log unanswered question:", err.message);
    }
  }

  return matched.map((s) => s.chunk);
}

module.exports = { findRelevantChunks };
