const mongoose = require("mongoose");

const knowledgeEntrySchema = new mongoose.Schema({
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] }, // new field
});

module.exports = mongoose.model("KnowledgeEntry", knowledgeEntrySchema);
