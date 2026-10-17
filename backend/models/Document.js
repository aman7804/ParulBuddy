const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Document", documentSchema);
