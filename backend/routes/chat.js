const express = require("express");
const router = express.Router();
const { findRelevantEntries, tryAggregateAnswer } = require("../utils/matcher");
const { generateAnswer } = require("../utils/aiService");

router.post("/", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Aggregate questions (cheapest/compare/total/list-all) need to reason across
    // ALL entries in a category, not just the top semantic match - handle those
    // separately before falling back to normal single-entry retrieval.
    const aggregate = await tryAggregateAnswer(question);
    if (aggregate) {
      return res.json({
        answer: aggregate.answer,
        matched: [`${aggregate.category} > (all entries)`],
      });
    }

    const matchedEntries = await findRelevantEntries(question);
    const answer = await generateAnswer(question, matchedEntries);

    res.json({
      answer,
      matched: matchedEntries.map((e) => `${e.category} > ${e.subcategory}`),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;