// scripts/ingestPdf.js
//
// CLI script to ingest a PDF into the Chunk collection.
// Usage: node backend/scripts/ingestPdf.js path/to/handbook.pdf
//
// Extracts text, chunks, embeds, and stores. If chunks for this PDF
// filename already exist, they are deleted first (re-ingest = replace).

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Chunk = require("../models/Chunk");
const { processPdf } = require("../utils/pdfIngester");
const { getEmbedding } = require("../utils/embeddings");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: node scripts/ingestPdf.js <path-to-pdf>");
    process.exit(1);
  }

  const absolutePath = path.resolve(pdfPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const pdfName = path.basename(absolutePath);
  const pdfBuffer = fs.readFileSync(absolutePath);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Delete existing chunks for this PDF (re-ingest replaces)
  const deleted = await Chunk.deleteMany({ sourcePdf: pdfName });
  if (deleted.deletedCount > 0) {
    console.log(`Cleared ${deleted.deletedCount} existing chunks for "${pdfName}"`);
  }

  console.log(`Processing PDF: ${pdfName} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
  const chunks = await processPdf(pdfBuffer);
  console.log(`Extracted ${chunks.length} chunks`);

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
      if (created % 10 === 0) {
        console.log(`  Embedded ${created}/${chunks.length} chunks...`);
      }
    } catch (err) {
      console.error(`  Error embedding chunk (page ${chunk.pageNumber}): ${err.message}`);
      errors++;
    }
    await sleep(300); // avoid rate limits
  }

  console.log(`\nDone. Created ${created} chunks from "${pdfName}".`);
  if (errors > 0) {
    console.log(`${errors} chunk(s) failed to embed.`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
