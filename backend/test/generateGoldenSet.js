// Auto-generates a golden Q&A test set from your existing Chunks collection.
// Run once (or whenever your KB changes significantly):
//   node test/generateGoldenSet.js
//
// Output: test/golden-set.json — array of { question, answer, sourceChunkId, sourceText }

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");

// ⬇️ POINT THESE TO YOUR ACTUAL FILES
const Chunk = require("../models/Chunk"); // your Mongoose Chunk model
const MONGO_URI = process.env.MONGODB_URI;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SAMPLE_SIZE = 25; // how many chunks to generate questions from

async function callGroq(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

function buildPrompt(chunkText) {
  return `You are creating a test question from university helpdesk content.

  Text:
  """
  ${chunkText}
  """

  Generate ONE realistic student question that this text directly answers, and the correct short answer.
  Respond ONLY in this JSON format, nothing else:
  {"question": "...", "answer": "..."}`;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Pull a spread of chunks — random sample across the collection
  const chunks = await Chunk.aggregate([{ $sample: { size: SAMPLE_SIZE } }]);
  console.log(`Sampled ${chunks.length} chunks`);

  const goldenSet = [];

  for (const chunk of chunks) {
    try {
      const prompt = buildPrompt(chunk.text);
      const qa = await callGroq(prompt);

      goldenSet.push({
        question: qa.question,
        answer: qa.answer,
        sourceChunkId: chunk._id.toString(),
        sourceText: chunk.text,
        pageNumber: chunk.pageNumber || null,
      });

      console.log(`✅ Generated: ${qa.question}`);
    } catch (err) {
      console.error(`❌ Failed on chunk ${chunk._id}:`, err.message);
    }
  }

  fs.writeFileSync("test/golden-set.json", JSON.stringify(goldenSet, null, 2));

  console.log(
    `\nDone. Saved ${goldenSet.length} Q&A pairs to test/golden-set.json`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
