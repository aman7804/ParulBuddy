// scripts/removeKeywordsField.js
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const res = await mongoose.connection.collection('knowledgeentries')
    .updateMany({}, { $unset: { keywords: "" } });
  console.log(`Unset keywords on ${res.modifiedCount} documents`);
  await mongoose.disconnect();
}

run();