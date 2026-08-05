require("dotenv").config();
const express = require("express");
const cors = require("cors");
const chatRoute = require("./routes/chat");
const { default: mongoose } = require("mongoose");
const adminRoutes = require("./routes/admin");
const feedbackRoutes = require("./routes/feedback");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRoute);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);

app.get("/", (req, res) => {
  res.send("Helpdesk chatbot API is running");
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });
