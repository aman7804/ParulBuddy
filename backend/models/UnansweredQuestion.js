const mongoose = require("mongoose");

const unansweredQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    timesAsked: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UnansweredQuestion", unansweredQuestionSchema);
