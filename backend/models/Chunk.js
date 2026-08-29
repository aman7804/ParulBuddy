const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  sourcePdf: { type: String, required: true },
  pageNumber: Number,
});

module.exports = mongoose.model("Chunk", chunkSchema);
