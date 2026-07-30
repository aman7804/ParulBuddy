// config/categoryConfig.js
//
// Single source of truth for per-category ingestion config: the fixed
// subcategory list (Case B in the organizer prompt - general info) and the
// optional entity list (Case A - named sub-items like specific hostels).
//
// parseStructuredDoc(rawText, category, subcategories, entities) takes these
// as plain arguments rather than looking them up itself, so it stays easy to
// unit-test with mock lists. The ingestion route is where this config
// actually gets read and passed in - see usage example at the bottom.
//
// To onboard a new category: add a key below with its subcategories/entities
// filled in. Until a category's subcategories list is filled in, leave it as
// [] - getCategoryConfig() will throw a clear error if something tries to
// ingest into it, which is your reminder it's not ready yet.

const categoryConfig = {
  hostel: {
    subcategories: [
      "Summary",
      "Fees",
      "Eligibility & Restrictions",
      "Rules & Policies",
      "Services",
      "Facilities",
      "Mess",
      "Booking",
      "Documents Required",
      "Refund & Cancellation",
      "Security",
      "Contact Information",
      "FAQs",
    ],
    entities: [
      "Shastri Bhawan",
      "Kalam Bhawan",
      "Tagore Bhawan",
      "Teresa Bhawan",
      "Shakuntala Bhawan",
      "Sarojini Bhawan",
      "Sardar Bhawan",
      "Rani Laxmibai Bhawan",
      "Milkha Bhawan",
      "Kalpana Bhawan",
      "Janki Bhawan",
      "Indira Bhawan",
      "Azad Bhawan",
      "Atal Bhawan",
      "Dhyan Bhawan",
      "Albert Einstein",
      "Tilak Bhawan",
      "Abraham Lincoln",
      "Marie Curie",
      "Ratan Tata Bhawan",
    ],
  },

  // Referenced in generateAnswer.js's fallback message ("ask about Hostel,
  // Exams, or Placement") but not yet configured for ingestion. Fill in
  // subcategories (and entities, if this category has named sub-items like
  // hostel does) before importing data into these.
  exams: {
    subcategories: [],
    entities: [],
  },

  placement: {
    subcategories: [],
    entities: [],
  },
};

// Throws if the category doesn't exist in config, or exists but its
// subcategories list hasn't been filled in yet - both are "not ready to
// ingest into this category" states, just different reasons.
function getCategoryConfig(category) {
  const config = categoryConfig[category];
  if (!config) {
    throw new Error(
      `Unknown category "${category}". Add it to categoryConfig.js first.`,
    );
  }
  if (!config.subcategories || config.subcategories.length === 0) {
    throw new Error(
      `Category "${category}" has no subcategories configured yet in categoryConfig.js. Fill that in before importing data for it.`,
    );
  }
  return config;
}

function listConfiguredCategories() {
  return Object.keys(categoryConfig).filter(
    (cat) => categoryConfig[cat].subcategories.length > 0,
  );
}

module.exports = { categoryConfig, getCategoryConfig, listConfiguredCategories };

// --- Example usage in an ingestion route ---
//
// const { parseRawTextForCategory } = require("../utils/rawDataParser");
//
// router.post("/admin/import", async (req, res) => {
//   const { category, rawText } = req.body;
//   try {
//     const entries = await parseRawTextForCategory(rawText, category);
//     // ... save entries to KnowledgeEntry, generate embeddings, etc.
//     res.json({ imported: entries.length });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });