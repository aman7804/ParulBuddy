const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const supabase = require("../utils/supabaseClient");
const { getEmbedding } = require("../utils/embeddings");
const { processPdf } = require("../utils/pdfIngester");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(Object.assign(new Error("Only PDF files are accepted"), { status: 400 })),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.post("/login", (req, res) => {
  if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    return res.status(503).json({ error: "Admin login is not configured" });
  }
  if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }
  res.json({
    token: jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "2h" }),
  });
});

router.use(verifyAdmin);

router.post("/upload-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No PDF file uploaded" });
    const pdfName = req.file.originalname;
    const chunks = await processPdf(req.file.buffer);
    if (!chunks.length) {
      return res.status(422).json({ error: "No text could be extracted from this PDF" });
    }

    const previous = await supabase
      .from("chunks")
      .delete({ count: "exact" })
      .eq("source_pdf", pdfName);
    if (previous.error) throw previous.error;
    const previousChunksDeleted = previous.count || 0;
    const records = [];
    let errors = 0;
    for (const chunk of chunks) {
      try {
        records.push({
          text: chunk.text,
          embedding: await getEmbedding(chunk.text),
          source_pdf: pdfName,
          page_number: chunk.pageNumber,
        });
      } catch (err) {
        console.error(`Chunk embed error: ${err.message}`);
        errors++;
      }
      await sleep(300);
    }
    if (!records.length) {
      return res.status(502).json({ error: "Could not generate embeddings for this PDF" });
    }
    const inserted = await supabase.from("chunks").insert(records);
    if (inserted.error) throw inserted.error;
    res.status(201).json({
      pdfName,
      previousChunksDeleted,
      chunksCreated: records.length,
      errors,
    });
  } catch (err) {
    console.error("PDF upload failed:", err);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

router.get("/documents", async (req, res) => {
  try {
    const { data, error } = await supabase.from("chunks").select("source_pdf");
    if (error) throw error;
    const counts = (data || []).reduce((result, item) => {
      result[item.source_pdf] = (result[item.source_pdf] || 0) + 1;
      return result;
    }, {});
    res.json(Object.entries(counts).map(([name, chunks]) => ({ name, chunks })));
  } catch (err) {
    console.error("Document list failed:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.delete("/documents/:name", async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const result = await supabase
      .from("chunks")
      .delete({ count: "exact" })
      .eq("source_pdf", name);
    if (result.error) throw result.error;
    if (!result.count) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true, chunksDeleted: result.count });
  } catch (err) {
    console.error("Document deletion failed:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

router.get("/unanswered", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("unanswered_questions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    res.json((data || []).map((item) => ({
      _id: item.id,
      question: item.question,
      timesAsked: item.times_asked,
      lastAsked: item.updated_at,
    })));
  } catch (err) {
    console.error("Unanswered list failed:", err);
    res.status(500).json({ error: "Failed to fetch unanswered questions" });
  }
});

router.delete("/unanswered/:id", async (req, res) => {
  try {
    const { error, count } = await supabase
      .from("unanswered_questions")
      .delete({ count: "exact" })
      .eq("id", req.params.id);
    if (error) throw error;
    if (!count) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Unanswered deletion failed:", err);
    res.status(500).json({ error: "Failed to delete question" });
  }
});

router.get("/feedback", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data || []).map((item) => ({
      _id: item.id,
      message: item.message || item.feedback,
      name: item.name || "",
      email: item.email || "",
      createdAt: item.created_at,
    })));
  } catch (err) {
    console.error("Feedback list failed:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.delete("/feedback/:id", async (req, res) => {
  try {
    const { error, count } = await supabase
      .from("feedback")
      .delete({ count: "exact" })
      .eq("id", req.params.id);
    if (error) throw error;
    if (!count) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Feedback deletion failed:", err);
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

module.exports = router;
