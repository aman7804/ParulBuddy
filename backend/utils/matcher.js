const supabase = require("./supabaseClient");
const { getEmbedding } = require("./embeddings");

const SIMILARITY_THRESHOLD = 0.5;

async function logUnansweredQuestion(question) {
  const q = question.trim();
  const { data: existing } = await supabase
    .from("unanswered_questions")
    .select("id, times_asked")
    .eq("question", q)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("unanswered_questions")
      .update({ times_asked: existing.times_asked + 1, updated_at: new Date() })
      .eq("id", existing.id);
  } else {
    await supabase.from("unanswered_questions").insert({ question: q });
  }
}

async function findRelevantChunks(question, topK = 5) {
  const questionEmbedding = await getEmbedding(question);

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: questionEmbedding,
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: topK,
  });

  if (error) {
    console.error("match_chunks error:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    try {
      await logUnansweredQuestion(question);
    } catch (err) {
      console.error("Failed to log unanswered question:", err.message);
    }
  }

  return data || [];
}

module.exports = { findRelevantChunks };