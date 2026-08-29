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
      matched: chunks.map((c) =>
        c.sourcePdf
          ? `${c.sourcePdf}${c.pageNumber ? ` (p. ${c.pageNumber})` : ""}`
          : "(chunk)",
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;