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

router.use(verifyAdmin);

// ---- UPLOAD PDF ----
router.post("/upload-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No PDF file uploaded" });

    const pdfName = req.file.originalname;

    const { count } = await supabase
      .from("chunks")
      .delete({ count: "exact" })
      .eq("source_pdf", pdfName);

    const chunks = await processPdf(req.file.buffer);
    if (chunks.length === 0) {
      return res
        .status(422)
        .json({ error: "No text could be extracted from this PDF" });
    }

    let created = 0,
      errors = 0;
    for (const chunk of chunks) {
      try {
        const embedding = await getEmbedding(chunk.text);
        const { error } = await supabase.from("chunks").insert({
          text: chunk.text,
          embedding,
          source_pdf: pdfName,
          page_number: chunk.pageNumber,
        });
        if (error) throw error;
        created++;
      } catch (err) {
        console.error(`Chunk embed error: ${err.message}`);
        errors++;
      }
      await sleep(300);
    }

    res.status(201).json({
      pdfName,
      previousChunksDeleted: count || 0,
      chunksCreated: created,
      errors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to process PDF" });
  }
});

// ---- GET documents ----
router.get("/documents", async (req, res) => {
  const { data, error } = await supabase.from("chunks").select("source_pdf");
  if (error)
    return res.status(500).json({ error: "Failed to fetch documents" });

  const counts = {};
  data.forEach((d) => {
    counts[d.source_pdf] = (counts[d.source_pdf] || 0) + 1;
  });
  res.json(Object.entries(counts).map(([name, chunks]) => ({ name, chunks })));
});

// ---- DELETE document ----
router.delete("/documents/:name", async (req, res) => {
  const { error, count } = await supabase
    .from("chunks")
    .delete({ count: "exact" })
    .eq("source_pdf", req.params.name);

  if (error || !count)
    return res.status(404).json({ error: "Document not found" });
  res.json({ success: true, chunksDeleted: count });
});

// ---- unanswered questions ----
router.get("/unanswered", async (req, res) => {
  const { data, error } = await supabase
    .from("unanswered_questions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error)
    return res
      .status(500)
      .json({ error: "Failed to fetch unanswered questions" });
  res.json(data);
});

router.delete("/unanswered/:id", async (req, res) => {
  const { error, count } = await supabase
    .from("unanswered_questions")
    .delete({ count: "exact" })
    .eq("id", req.params.id);
  if (error || !count) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

// ---- feedback ----
router.get("/feedback", async (req, res) => {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: "Failed to fetch feedback" });
  res.json(data);
});

router.delete("/feedback/:id", async (req, res) => {
  const { error, count } = await supabase
    .from("feedback")
    .delete({ count: "exact" })
    .eq("id", req.params.id);
  if (error || !count) return res.status(404).json({ error: "Not found" });
  res.json({ success: true });
});

module.exports = router;
