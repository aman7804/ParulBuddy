const KnowledgeEntry = require("../models/KnowledgeEntry");
const UnansweredQuestion = require("../models/UnansweredQuestion");
const { getEmbedding, cosineSimilarity } = require("../utils/embeddings");
const { callGroq } = require("../utils/groqClient");

const SIMILARITY_THRESHOLD = 0.5; // lowered - short queries vs dense content blocks were scoring inconsistently around 0.65

// Ask Groq to classify the question instead of regex-matching keywords. Handles
// typos, rephrasing, and unanticipated wording that a fixed keyword list can't -
// e.g. "chepeast hostel", "male hostels", "hostels with B in it" all get read for
// meaning instead of needing to be predicted in advance.
// Output: { aggregate: boolean, category: string|null }
async function classifyQuestion(question, categories) {
  const systemPrompt = `You classify questions for a university helpdesk chatbot.

Known categories: ${categories.join(", ")}

Decide if the question needs looking at MULTIPLE items in a category to answer correctly - e.g. cheapest/costliest, comparisons, totals/counts, filtering by an attribute (like "male hostels" or "hostels with AC"), or listing/showing multiple items. Mark this as aggregate: true.

If the question is about ONE specific named item (e.g. "Teresa A price", "Kalam fee"), mark aggregate: false.

Ignore spelling mistakes - judge by intent, not exact wording.

If aggregate is true, also say which known category (from the list above) the question relates to, or null if unclear or not covered.

Output ONLY this JSON, no other text:
{"aggregate": true or false, "category": "exact category name" or null}`;

  try {
    const raw = await callGroq(systemPrompt, question, 100);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return {
      aggregate: !!parsed.aggregate,
      category: parsed.category || null,
    };
  } catch (err) {
    console.error("Question classification failed:", err.message);
    return { aggregate: false, category: null }; // fail safe -> normal search path
  }
}

// One Groq call: given ALL entries for a category, answer the aggregate question
// directly from that full dataset (comparison/ranking/counting done by the model).
async function synthesizeAggregateAnswer(question, category) {
  const entries = await KnowledgeEntry.find({ category }).lean();
  if (entries.length === 0) return null;

  const combined = entries
    .map((e) => `[${e.subcategory}]: ${e.content}`)
    .join("\n\n");

  const systemPrompt = `You are a university helpdesk assistant. Answer the user's question using ONLY the data below for category "${category}". Do not invent facts, numbers, or names not present in the data. If the question requires comparing, ranking, or counting items, do that computation yourself from the given data and state the result plainly. Ignore spelling mistakes in the question - judge by intent.

  Note: labels like A, B, C, D within an item are room BLOCK codes (e.g. "Block B"), not letters within the item's name. Only treat a letter as part of a name if the question is explicitly about spelling or name content.

  Data:
  ${combined}`;

  return callGroq(systemPrompt, question, 1000);
}

// Call this FIRST from the chat route, before findRelevantEntries. Returns
// { answer, category } if this was an aggregate question with usable data,
// otherwise null - caller should fall back to normal semantic search.
async function tryAggregateAnswer(question) {
  const categories = await KnowledgeEntry.distinct("category");
  if (categories.length === 0) return null;

  const classification = await classifyQuestion(question, categories);
  if (!classification.aggregate || !classification.category) return null;

  const answer = await synthesizeAggregateAnswer(
    question,
    classification.category,
  );
  if (!answer) return null;

  return { answer, category: classification.category };
}

// Existing semantic top-k search - used for normal (non-aggregate) questions.
async function findRelevantEntries(question, topN = 3) {
  const questionEmbedding = await getEmbedding(question);

  const allEntries = await KnowledgeEntry.find({ embedding: { $ne: [] } });

  const scored = allEntries.map((entry) => ({
    entry,
    score: cosineSimilarity(questionEmbedding, entry.embedding),
  }));

  const matched = scored
    .filter((s) => s.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.entry);

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

  return matched;
}

module.exports = { findRelevantEntries, tryAggregateAnswer };
