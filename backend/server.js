require("dotenv").config();
const express = require("express");
const cors = require("cors");
const chatRoute = require("./routes/chat");
const adminRoutes = require("./routes/admin");
const feedbackRoutes = require("./routes/feedback");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRoute);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);

app.get("/", (req, res) => res.send("Helpdesk chatbot API is running"));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: err.status ? err.message : "Request failed",
  });
});

async function start() {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error("Unable to start server:", err.message);
    process.exit(1);
  });
}

module.exports = app;