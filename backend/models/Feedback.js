const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    name: { type: String, default: "" },
    email: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Feedback", feedbackSchema);