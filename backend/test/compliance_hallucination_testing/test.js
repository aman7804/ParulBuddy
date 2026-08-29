// test_prompt_isolation.js
// Standalone isolation test — NO retrieval, NO chunks, NO vector DB.
// Purpose: test whether the system prompt (with rule 8) actually stops
// "compliance hallucination" (model padding/truncating answers to match
// a count or assumption baked into the user's question), independent of
// any retrieval quality issues.
//
// Usage:
//   node test_prompt_isolation.js
//
// Requires: your existing utils/groqClient.js (same one used in aiService.js)
// Adjust the require path below if this file lives outside your project root.

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
console.log("KEY LOADED:", !!process.env.GROQ_API_KEY);

const { callGroq } = require("../../utils/groqClient");
// ... rest stays the same

// ---- Hardcoded knowledge (Table 1 from the paper) ----
const hardcodedKnowledge = `Table 1: Course Selection Criteria and Student Perspectives

Criteria | Low Ability & Motivation Students | High Ability & Motivation Students
Ease of Completion | Prefer easy courses with minimal assignments & exams. Which courses have the least amount of homework and tests? | Seek intellectually stimulating courses. What advanced concepts will this course cover beyond the basics?
Schedule Convenience | Choose classes based on preferred timing. Are there any afternoon-only classes? | Optimize schedules to balance commitments. How does this course fit into an optimal study plan?
Professor's Leniency | Favor lenient grading & attendance policies. Which professors are known for easy grading? | Consider professor's expertise & teaching quality. What research has the professor contributed to this field?
Peer Influence | Follow friends' recommendations. Which courses are popular among students? | Select based on academic & career goals. What courses are best for serious students in this field?
Effort Required | Prefer courses with minimal readings & simple assessments. Does this course require a lot of reading and assignments? | Accept challenging coursework for deeper learning. What types of projects are included in this course?
Graduation Requirements | Focus on earning necessary credits easily. Will this course help me graduate smoothly? | Select courses strategically for academic growth. How does this course support my career development?
Difficult Subjects | Avoid analytical/problem-solving courses. Are there any courses that don't require complex thinking? | Embrace rigorous subjects for intellectual expansion. Will this course enhance my critical thinking skills?
Extracurricular Balance | Prioritize free time for personal activities. Does this course leave enough time for my part-time job? | Balance workload with research or internships. Will this course provide networking opportunities?
Familiar Topics | Stick to comfortable & known subjects. Is this course similar to what I studied before? | Explore new and complex topics for growth. Will this course introduce groundbreaking ideas?
Flexible Learning Options | Prefer online or relaxed attendance courses. Can I take this course online with flexible attendance? | Opt for interactive & engaging learning environments. Does this course promote discussion-based learning?`;

// ---- System prompt (with rule 8 — general compliance-hallucination fix) ----
const systemPrompt =
  "You are a helpdesk assistant for Parul University. Answer the student's question directly, warmly, and concisely using the knowledge below.\n\nCRITICAL RULES:\n1. Speak naturally as the helpdesk assistant. NEVER refer to 'context', 'provided context', 'database', 'given text', 'documents', 'records', or 'prompt' in your response. Answer as if you naturally know the facts.\n2. If the provided knowledge DOES NOT contain enough information to accurately answer the question, your ENTIRE response MUST be EXACTLY: CANNOT_ANSWER\n3. Do NOT output explanations, apologies, or partial guesses if info is missing. ONLY output: CANNOT_ANSWER\n4. If the student's question is in Hinglish (Hindi written in Roman/English script) or mixed Hindi-English, respond in the same Hinglish style. If the question is in plain English, respond in English.\n5. Do not add conclusions, summaries, interpretations, takeaways, or repetitive statements after answering. Stop once the requested information has been provided.\n6. NEVER let the student's stated number, count, or assumption override the actual knowledge. If the student asks for 'all N' items, reasons, or criteria but the knowledge only supports a different number, give ONLY the number actually supported by the knowledge and explicitly say how many you found (e.g. 'There are 3 that match, not 4:'). Do NOT invent, stretch, or reclassify an item just to hit the number the student asked for.\n7. If the student's question contains a false or incorrect premise (wrong count, wrong category, wrong fact, non-existent course/entity), correct the premise briefly and factually before or instead of answering, rather than silently complying with it.\n8. Every question may contain assumptions embedded in its own phrasing — a count, a category label, a comparison, or a fact — that are NOT verified to be true. Never treat the user's phrasing as evidence. Before answering, derive your answer using ONLY the knowledge below, as if the question contained no numbers, categories, or claims at all — just the underlying condition being asked about. Then separately check whether your derived answer agrees with what the question assumed. If it does not agree, state what the knowledge actually supports and note the discrepancy per rule 6/7. Your final answer must always be fully explainable by the knowledge alone — if you cannot point to a specific line in the knowledge justifying why an item is included, it must NOT be included, regardless of what the question implied.";

async function testWithoutChunks(question) {
  const rawContent = await callGroq(
    systemPrompt,
    `Knowledge:\n${hardcodedKnowledge}\n\nQuestion: ${question}`,
    1000,
    0.3,
  );
  return rawContent;
}

// ---- Test cases: original failing case + a couple of varied phrasings ----
// to check the fix generalizes rather than just patching one case.
const testQuestions = [
  "Name all four persona-driven criteria from Table 1 where a low-motivation student's concern is about scheduling or workload flexibility, not difficulty.",
  "List all five persona-driven criteria from Table 1 where a low-motivation student's concern is explicitly about grading, attendance, or friend/peer behavior — not workload or scheduling.",
  "Give me the three criteria where a low-motivation student avoids intellectual/analytical challenge.",
];

async function runAll() {
  for (const q of testQuestions) {
    console.log("\n=== QUESTION ===");
    console.log(q);
    try {
      const answer = await testWithoutChunks(q);
      console.log("--- ANSWER ---");
      console.log(answer);
    } catch (err) {
      console.error("ERROR:", err.message);
    }
  }
}

runAll();
