const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    sourcePdf: { type: String, required: true, index: true },
    pageNumber: Number,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Chunk", chunkSchema);
