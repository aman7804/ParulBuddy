require("dotenv").config();
const mongoose = require("mongoose");
const KnowledgeEntry = require("../models/KnowledgeEntry");
const { getEmbedding } = require("../utils/embeddings");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const entries = await KnowledgeEntry.find({ embedding: { $size: 0 } });

  console.log(`Found ${entries.length} entries missing embeddings`);

  for (const entry of entries) {
    const embedding = await getEmbedding(
      `${entry.subcategory}. ${entry.content}`,
    );
    entry.embedding = embedding;
    await entry.save();
    console.log(`Embedded: ${entry.subcategory}`);
    await new Promise((r) => setTimeout(r, 300)); // small delay, avoid rate limits
  }

  console.log("Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
