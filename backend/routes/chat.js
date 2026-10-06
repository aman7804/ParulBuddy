const express = require("express");
const router = express.Router();
const { findRelevantChunks } = require("../utils/matcher");
const { generateAnswer } = require("../utils/aiService");

router.post("/", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const chunks = await findRelevantChunks(question);
    const answer = await generateAnswer(question, chunks);

    res.json({
      answer,
      sources: [...new Set(chunks.map((c) => c.sourcePdf).filter(Boolean))],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;