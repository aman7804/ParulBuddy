const mongoose = require("mongoose");

const unansweredQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    timesAsked: { type: Number, default: 0 },
    lastAsked: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

unansweredQuestionSchema.index({ question: 1 }, { unique: true });

module.exports = mongoose.model("UnansweredQuestion", unansweredQuestionSchema);
