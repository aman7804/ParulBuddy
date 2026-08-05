const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const KnowledgeEntry = require("../models/KnowledgeEntry");
const UnansweredQuestion = require("../models/UnansweredQuestion");
const { getEmbedding } = require("../utils/embeddings");
const { parseRawTextForCategory } = require("../utils/rawDataParser");
const { mergeContent } = require("../utils/groqClient"); // add this import
const AggregateQuestion = require("../models/AggregateQuestion");

// ---- LOGIN (public) ----
router.post("/login", (req, res) => {
  const { password } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });

  res.json({ token });
});

// Everything below this line requires a valid admin token
router.use(verifyAdmin);

// ---- GET all entries ----
router.get("/entries", async (req, res) => {
  try {
    const entries = await KnowledgeEntry.find().sort({ category: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

// ---- CREATE entry ----
router.post("/entries", async (req, res) => {
  try {
    const { category, subcategory, content } = req.body;

    if (!category || !subcategory || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const embedding = await getEmbedding(`${subcategory}. ${content}`);

    const entry = new KnowledgeEntry({
      category,
      subcategory,
      content,
      embedding,
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create entry" });
  }
});

// ---- UPDATE entry ----
router.put("/entries/:id", async (req, res) => {
  try {
    const { category, subcategory, content } = req.body;
    const embedding = await getEmbedding(`${subcategory}. ${content}`);

    const updated = await KnowledgeEntry.findByIdAndUpdate(
      req.params.id,
      { category, subcategory, content, embedding },
      { new: true, runValidators: true },
    );

    if (!updated) return res.status(404).json({ error: "Entry not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// ---- DELETE entry ----
router.delete("/entries/:id", async (req, res) => {
  try {
    const deleted = await KnowledgeEntry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Entry not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertEntry(item) {
  const existing = await KnowledgeEntry.findOne({
    category: item.category,
    subcategory: item.subcategory,
  });

  let finalContent = item.content;

  if (existing) {
    finalContent = await mergeContent(existing.content, item.content);
  }

  const embedding = await getEmbedding(`${item.subcategory}. ${finalContent}`);

  const entry = await KnowledgeEntry.findOneAndUpdate(
    { category: item.category, subcategory: item.subcategory },
    {
      $set: {
        category: item.category,
        subcategory: item.subcategory,
        content: finalContent,
        embedding,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  return entry;
}

// ---- BULK CREATE/UPDATE from structured raw data dump ----
// No Groq calls here anymore - rawText must follow the template documented in
// utils/rawDataParser.js (### Category / ### Subcategory blocks separated by ---).
// Aggregate answers (cheapest/compare/list-all) are handled live at query time,
// not pre-generated here.
router.post("/entries/bulk-raw", async (req, res) => {
  try {
    const { rawText, category } = req.body;

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: "rawText is required" });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: "category is required" });
    }

    let items;
    try {
      items = await parseRawTextForCategory(rawText, category);
    } catch (err) {
      return res.status(422).json({ error: err.message });
    }

    // Upsert each entry: existing (category, subcategory) -> update in place, new -> insert
    const saved = [];
    const failed = [];

    for (const item of items) {
      try {
        const entry = await upsertEntry(item);
        saved.push(entry);
      } catch (err) {
        failed.push({ subcategory: item.subcategory, error: err.message });
      }
      await sleep(300); // avoid hammering the embedding API
    }

    res.status(201).json({
      totalExtracted: items.length,
      saved: saved.length,
      failed: failed.length,
      failedDetails: failed,
      entries: saved,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: err.message || "Failed to process raw data" });
  }
});

// ---- GET unanswered questions ----
router.get("/unanswered", async (req, res) => {
  try {
    const questions = await UnansweredQuestion.find().sort({ updatedAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch unanswered questions" });
  }
});

// ---- DELETE unanswered question (dismiss, e.g. after adding to KB) ----
router.delete("/unanswered/:id", async (req, res) => {
  try {
    const deleted = await UnansweredQuestion.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// ---- GET pending aggregate questions ----
router.get("/aggregate-questions", async (req, res) => {
  try {
    const questions = await AggregateQuestion.find().sort({ updatedAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch aggregate questions" });
  }
});

// ---- PROMOTE: merge into KB's "Aggregate" subcategory for that category, then delete ----
router.post("/aggregate-questions/:id/promote", async (req, res) => {
  try {
    const aq = await AggregateQuestion.findById(req.params.id);
    if (!aq) return res.status(404).json({ error: "Not found" });

    const entry = await upsertEntry({
      category: aq.category,
      subcategory: "Aggregate",
      content: aq.answer,
    });

    await AggregateQuestion.findByIdAndDelete(req.params.id);
    res.json({ success: true, entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to promote aggregate question" });
  }
});

// ---- DISMISS: discard without adding to KB ----
router.delete("/aggregate-questions/:id", async (req, res) => {
  try {
    const deleted = await AggregateQuestion.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
}); 


const Feedback = require("../models/Feedback");

router.get("/feedback", async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.delete("/feedback/:id", async (req, res) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

module.exports = router;
