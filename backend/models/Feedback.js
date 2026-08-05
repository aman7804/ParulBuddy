const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Feedback", feedbackSchema);