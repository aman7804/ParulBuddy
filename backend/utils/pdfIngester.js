// utils/pdfIngester.js
//
// PDF processing pipeline (pdf-parse v2):
//   PDF buffer → text extraction → cleaning → chunking

const { PDFParse } = require("pdf-parse");
const { chunkText } = require("./chunker");

function cleanPageText(raw) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Extract text from a PDF buffer, page by page.
async function extractPages(pdfBuffer) {
  const parser = new PDFParse({ data: pdfBuffer });
  const result = await parser.getText();
  await parser.destroy();

  const pages = [];

  // v2 gives per-page text via result.pages; fall back to splitting
  // result.text on form-feed chars if pages[].text isn't populated.
  if (Array.isArray(result.pages) && result.pages.length > 0) {
    result.pages.forEach((p, i) => {
      const cleaned = cleanPageText(p.text || "");
      if (cleaned.length > 0) {
        pages.push({ text: cleaned, pageNumber: i + 1 });
      }
    });
  } else {
    const rawPages = (result.text || "").split("\f");
    rawPages.forEach((raw, i) => {
      const cleaned = cleanPageText(raw);
      if (cleaned.length > 0) {
        pages.push({ text: cleaned, pageNumber: i + 1 });
      }
    });
  }

  return pages;
}

// Main pipeline: PDF buffer → array of { text, pageNumber } chunks.
async function processPdf(pdfBuffer) {
  const pages = await extractPages(pdfBuffer);
  const allChunks = [];

  for (const page of pages) {
    const chunks = chunkText(page.text);
    for (const chunk of chunks) {
      allChunks.push({
        text: chunk,
        pageNumber: page.pageNumber,
      });
    }
  }

  return allChunks;
}

module.exports = { processPdf };
