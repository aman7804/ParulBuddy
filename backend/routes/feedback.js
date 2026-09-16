const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabaseClient");

router.post("/", async (req, res) => {
  try {
    const { message, name, email } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const { error } = await supabase.from("feedback").insert({
      message: message.trim(),
      name: (name || "").trim(),
      email: (email || "").trim(),
    });
    if (error) throw error;

    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

module.exports = router;