const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabaseClient");

router.post("/", async (req, res) => {
  try {
    const message = String(req.body.message ?? req.body.feedback ?? "").trim();
    const name = String(req.body.name ?? "").trim();
    const email = String(req.body.email ?? "").trim();
    if (!message) {
      return res.status(400).json({ error: "Feedback is required" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    const { error } = await supabase.from("feedback").insert({
      message,
      name,
      email,
    });
    if (error) throw error;
    res.status(201).json({
      success: true,
      message: "Thank you! Your feedback has been submitted successfully.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

module.exports = router;