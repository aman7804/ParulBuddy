const supabase = require("./supabaseClient");
const { getEmbedding } = require("./embeddings");

const SIMILARITY_THRESHOLD = 0.5;

async function logUnansweredQuestion(question) {
  const q = question.trim();
  const { data: existing, error: findError } = await supabase
    .from("unanswered_questions")
    .select("id, times_asked")
    .eq("question", q)
    .maybeSingle();
  if (findError) throw findError;

  const values = {
    question: q,
    times_asked: (existing?.times_asked || 0) + 1,
    updated_at: new Date().toISOString(),
  };
  const result = existing
    ? await supabase.from("unanswered_questions").update(values).eq("id", existing.id)
    : await supabase.from("unanswered_questions").insert(values);
  if (result.error) throw result.error;
}

async function findRelevantChunks(question, topK = 5) {
  const query_embedding = await getEmbedding(question);
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding,
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: topK,
  });
  if (error) throw error;
  if (!data?.length) await logUnansweredQuestion(question);
  return data || [];
}

module.exports = { findRelevantChunks };
