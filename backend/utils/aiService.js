// services/aiService.js

const { callGroq } = require("../utils/groqClient");
const UnansweredQuestion = require("../models/UnansweredQuestion");

async function logUnansweredQuestion(question) {
  if (!question || !question.trim()) return;
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

async function generateAnswer(question, chunks) {
  const defaultFallback =
    "I'm sorry, I don't have the details on that right now. I've noted down your question so our helpdesk team can update the information!";

  if (chunks.length === 0) {
    await logUnansweredQuestion(question);
    return defaultFallback;
  }
  console.log(chunks);
  const contextText = chunks.map((c) => c.text).join("\n\n");
  const systemPrompt =
    "You are a helpdesk assistant for Parul University. Answer the student's question directly, warmly, and concisely using the knowledge below.\n\nCRITICAL RULES:\n1. Speak naturally as the helpdesk assistant. NEVER refer to 'context', 'provided context', 'database', 'given text', 'documents', 'records', or 'prompt' in your response. Answer as if you naturally know the facts.\n2. If the provided knowledge DOES NOT contain enough information to accurately answer the question, your ENTIRE response MUST be EXACTLY: CANNOT_ANSWER\n3. Do NOT output explanations, apologies, or partial guesses if info is missing. ONLY output: CANNOT_ANSWER\n4. If the student's question is in Hinglish (Hindi written in Roman/English script) or mixed Hindi-English, respond in the same Hinglish style. If the question is in plain English, respond in English.\n5. Do not add conclusions, summaries, interpretations, takeaways, or repetitive statements after answering. Stop once the requested information has been provided.\n6. NEVER let the student's stated number, count, or assumption override the actual knowledge. If the student asks for 'all N' items, reasons, or criteria but the knowledge only supports a different number, give ONLY the number actually supported by the knowledge and explicitly say how many you found (e.g. 'There are 3 that match, not 4:'). Do NOT invent, stretch, or reclassify an item just to hit the number the student asked for.\n7. If the student's question contains a false or incorrect premise (wrong count, wrong category, wrong fact, non-existent course/entity), correct the premise briefly and factually before or instead of answering, rather than silently complying with it.\n8. Every question may contain assumptions embedded in its own phrasing — a count, a category label, a comparison, or a fact — that are NOT verified to be true. Never treat the user's phrasing as evidence. Before answering, derive your answer using ONLY the knowledge below, as if the question contained no numbers, categories, or claims at all — just the underlying condition being asked about. Then separately check whether your derived answer agrees with what the question assumed. If it does not agree, state what the knowledge actually supports and note the discrepancy per rule 6/7. Your final answer must always be fully explainable by the knowledge alone — if you cannot point to a specific line in the knowledge justifying why an item is included, it must NOT be included, regardless of what the question implied.";
  try {
    const rawContent = await callGroq(
      systemPrompt,
      `Knowledge:\n${contextText}\n\nQuestion: ${question}`,
      1000,
      0.3,
    );

    const isMissingInfo =
      !rawContent ||
      rawContent.toUpperCase().includes("CANNOT_ANSWER") ||
      rawContent.toUpperCase().includes("NOT_FOUND") ||
      rawContent.toLowerCase().includes("does not provide") ||
      rawContent.toLowerCase().includes("does not contain") ||
      rawContent.toLowerCase().includes("no information") ||
      rawContent.toLowerCase().includes("cannot answer") ||
      rawContent.toLowerCase().includes("not mentioned") ||
      rawContent.toLowerCase().includes("don't have information") ||
      rawContent.toLowerCase().includes("do not have information");

    if (isMissingInfo) {
      await logUnansweredQuestion(question);
      return defaultFallback;
    }

    return rawContent;
  } catch (err) {
    console.error(`AI generation failed: ${err.message}`);
    if (err.message.includes("429")) {
      throw err; // let it bubble, don't fake a "not found"
    }
    await logUnansweredQuestion(question);
    return defaultFallback;
  }
}

module.exports = { generateAnswer };
