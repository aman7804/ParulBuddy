// test/runGoldenTest.js
//
// Runs test/golden-set.json against your live API route (POST /).
// Make sure your server is running before executing this.
//
// Run: node test/runGoldenTest.js

const fs = require("fs");

// ⬇️ SET THIS to wherever your retrieval route is mounted
const API_URL = "http://localhost:5000/api/chat"; // <-- change to your real route

async function askQuestion(question) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  return res.json(); // { answer, matched }
}

async function main() {
  const goldenSet = JSON.parse(
    fs.readFileSync("test/golden-set.json", "utf-8"),
  );
  const results = [];

  let retrievalPass = 0;
  let answerPass = 0;

  for (const item of goldenSet) {
    const { answer, matched } = await askQuestion(item.question);

    // Retrieval check: does "matched" mention the expected page number?
    const expectedPageStr = item.pageNumber ? `p. ${item.pageNumber}` : null;
    const retrievalHit = expectedPageStr
      ? matched.some((m) => m.includes(expectedPageStr))
      : null; // can't verify without pageNumber in golden set

    // Rough answer check — you should eyeball results.json for real accuracy
    const looksCorrect = answer
      .toLowerCase()
      .includes(item.answer.toLowerCase().slice(0, 15));

    if (retrievalHit) retrievalPass++;
    if (looksCorrect) answerPass++;

    results.push({
      question: item.question,
      expectedAnswer: item.answer,
      aiAnswer: answer,
      matched,
      retrievalHit,
      looksCorrect,
    });

    console.log(
      `${retrievalHit ? "✅" : retrievalHit === null ? "⚪" : "❌"} retrieval | ${looksCorrect ? "✅" : "❌"} answer | ${item.question}`,
    );
    await new Promise((r) => setTimeout(r, 30000)); // wait 3s between calls
  }

  fs.writeFileSync("test/results.json", JSON.stringify(results, null, 2));

  console.log(`\nRetrieval: ${retrievalPass}/${goldenSet.length}`);
  console.log(`Answers:   ${answerPass}/${goldenSet.length}`);
  console.log(
    `\nFull results saved to test/results.json — eyeball it for real accuracy.`,
  );
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
