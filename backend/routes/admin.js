const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const UnansweredQuestion = require("../models/UnansweredQuestion");
const Chunk = require("../models/Chunk");
const { getEmbedding } = require("../utils/embeddings");
const { processPdf } = require("../utils/pdfIngester");

// Multer: store uploaded PDFs in memory (they get processed and discarded)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"), false);
    }
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// ---- UPLOAD PDF: extract text, chunk, embed, store ----
router.post("/upload-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const pdfName = req.file.originalname;

    // Delete existing chunks for this PDF (re-upload = replace)
    const deleted = await Chunk.deleteMany({ sourcePdf: pdfName });

    // Process PDF: extract text → clean → chunk
    const chunks = await processPdf(req.file.buffer);

    if (chunks.length === 0) {
      return res
        .status(422)
        .json({ error: "No text could be extracted from this PDF" });
    }

    // Embed and store each chunk
    let created = 0;
    let errors = 0;

    for (const chunk of chunks) {
      try {
        const embedding = await getEmbedding(chunk.text);
        await Chunk.create({
          text: chunk.text,
          embedding,
          sourcePdf: pdfName,
          pageNumber: chunk.pageNumber,
        });
        created++;
      } catch (err) {
        console.error(`Chunk embed error: ${err.message}`);
        errors++;
      }
      await sleep(300); // avoid rate limits on embedding API
    }

    res.status(201).json({
      pdfName,
      previousChunksDeleted: deleted.deletedCount,
      chunksCreated: created,
      errors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to process PDF" });
  }
});

// ---- GET uploaded documents (grouped by sourcePdf) ----
router.get("/documents", async (req, res) => {
  try {
    const docs = await Chunk.aggregate([
      { $group: { _id: "$sourcePdf", chunks: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json(
      docs.map((d) => ({
        name: d._id,
        chunks: d.chunks,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// ---- DELETE a document (all chunks for a given PDF) ----
router.delete("/documents/:name", async (req, res) => {
  try {
    const result = await Chunk.deleteMany({ sourcePdf: req.params.name });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true, chunksDeleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete document" });
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

// ---- DELETE unanswered question ----
router.delete("/unanswered/:id", async (req, res) => {
  try {
    const deleted = await UnansweredQuestion.findByIdAndDelete(req.params.id);
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
