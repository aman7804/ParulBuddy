const mongoose = require("mongoose");

const aggregateQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, required: true },
    timesAsked: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AggregateQuestion", aggregateQuestionSchema);