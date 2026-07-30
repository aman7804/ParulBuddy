// utils/rawDataParser.js
//
// Ingestion is NO LONGER deterministic string-splitting. The old version
// assumed the admin had already pre-formatted the input ("---" separators,
// first-line-is-subcategory). That assumption doesn't hold - real input is
// truly raw: pasted/scraped text with inconsistent line breaks, boilerplate
// labels ("Hostel image"), typos, mixed formatting per entry, etc.
//
// This version makes ONE Groq call per import, using a fixed organizer
// prompt, to split the raw blob into { category, subcategory, content }
// pieces itself. The model is instructed to copy content verbatim (no
// rewriting/summarizing) and to only use subcategory/entity values it was
// given - see MASTER_PROMPT_TEMPLATE below for the exact rules.
//
// Admin still picks ONE category per import (same as before). Subcategories
// and entities for that category are looked up from config/categoryConfig.js
// via parseRawTextForCategory() - that's what ingestion routes should call.
// parseStructuredDoc() is the lower-level pure function underneath it, kept
// exported separately because it's easier to unit-test with mock lists than
// a function that reaches into config/DB itself.
//   - subcategories: fixed list of valid general-info tags for that category
//     (e.g. ["Fees", "Rules & Policies", "Contact Information", ...])
//   - entities (optional): named sub-items in that category the raw text may
//     reference (e.g. hostel names). When provided, text tied to one entity
//     gets tagged with that entity's name instead of a subcategory value.
//
// Aggregate answers (cheapest/compare/list-all) are still handled live at
// query time by pulling all entries for a category and asking Groq to
// synthesize - see matcher.js. Nothing there changes.

const { callGroq } = require("./groqClient");
const { getCategoryConfig } = require("./CategoryConfig");

const MASTER_PROMPT_TEMPLATE = `You are a data organizer for a university helpdesk knowledge base.

You will be given:
1. A category name.
2. A list of valid subcategories for that category.
3. (Optional) A list of entity names belonging to that category (e.g. specific hostels, specific courses, specific departments).
4. Raw, unstructured text.

Your ONLY job is to split the raw text into logical pieces, GROUP each piece under its correct subcategory/entity, and output ONE object per subcategory/entity. You do NOT rewrite, paraphrase, summarize, infer, or clean up wording.

---
OUTPUT FORMAT
Return ONLY a valid JSON array. No markdown, no code fences, no explanation, no trailing text.

Every object must follow this exact shape:
{
  "category": "<the provided category, unchanged>",
  "subcategory": "<EITHER an entity name from the entity list, OR a value from the subcategory list — see rules below>",
  "content": "<verbatim original text for ALL pieces belonging to this subcategory/entity, combined>"
}

There is only ONE subcategory field. Its value is decided by the two cases below — never both, never neither.

---
DECIDING THE SUBCATEGORY VALUE — TWO CASES

CASE A — Entity-specific information
  Use this case when an entity list is provided AND the piece of text clearly belongs to one specific entity from that list (e.g. a room type/price line for "Shastri Bhawan", a rule that only applies to "Kalam Bhawan").
  - Set "subcategory" to that entity's exact name, copied exactly as it appears in the entity list.
  - Do NOT also try to describe what kind of info it is (Fees, Rules, etc.) — the entity name IS the subcategory value here.
  - Never invent an entity name. If text seems entity-specific but the entity is NOT in the provided list, fall through to Case B instead — do not guess or create a new entity name.

CASE B — General information
  Use this case when the text is NOT about one specific entity (applies broadly, or the source doesn't tie it to one entity — e.g. general hostel rules, refund policy, contact info, FAQs).
  - Set "subcategory" to the single best-fitting value from the provided subcategory list.
  - Never invent a subcategory that isn't in the list.

---
GROUPING RULES (read carefully — these override any instinct to split)

1. The final output must contain ONLY ONE object per subcategory (or entity). Never create two objects with the same subcategory/entity value.
2. Read the ENTIRE raw text first before creating any objects. Do not emit objects incrementally.
3. Collect ALL text belonging to the same subcategory/entity into that single object's "content" field, even if the source mentions it in multiple, non-adjacent places.
4. When combining non-adjacent pieces into one "content" field, join them with a single newline character (\\n) between pieces. Do not merge them into one run-on sentence.
5. Preserve the original order of the source text when combining — earlier-occurring text comes first in the joined content.
6. Split into different objects ONLY when the information clearly belongs to a different subcategory/entity — never split same-entity/same-subcategory info into multiple objects just because it appeared in different spots in the raw text.
7. Do not create entries that contain only headings or labels with no data (e.g. "Facilities:", "Gatepass:", "Timing:" with nothing after them). If a heading precedes real content for a DIFFERENT entity/subcategory than the one it ends up grouped under, drop the heading — keep only content that actually belongs to that group.

---
OTHER RULES

1. category
   - Always exactly the category value provided. Never change it.

2. Verbatim content
   - Each piece of "content" must be copied character-for-character from the raw text. No rephrasing, no summarizing, no correcting typos or grammar, no reformatting numbers/currency. (Joining pieces per Grouping Rule 4 is the only allowed structural change.)

3. Noise / boilerplate
   - Raw text may contain scraping artifacts or UI labels that carry no real information (e.g. repeated words like "image", "click here", navigation labels).
   - Skip pieces that are pure boilerplate with no informational content.
   - Do NOT strip such labels out of a piece that also contains real content — if a label is glued to real data in the source text, keep it verbatim as part of that piece.

4. Coverage
   - If a piece of text fits neither Case A nor Case B (no matching entity, no matching subcategory), skip it. Do not force-fit it and do not invent anything.
   - Never invent facts that are not present in the raw text.

5. Validity
   - The final output must be a single valid JSON array, parseable with no post-processing. No comments, no trailing commas, no text before or after the array.

---
INPUTS

Category:
{{category}}

Allowed Subcategories:
{{subcategories}}

Entities (optional):
{{entities}}

RAW TEXT:
{{raw_text}}`;

function buildPrompt(category, subcategories, entities, rawText) {
  return MASTER_PROMPT_TEMPLATE.replace("{{category}}", category)
    .replace("{{subcategories}}", subcategories.join(", "))
    .replace(
      "{{entities}}",
      entities && entities.length ? entities.join(", ") : "None provided",
    )
    .replace("{{raw_text}}", rawText);
}

// Groq is told not to wrap output in markdown fences, but models don't always
// listen. Strip ```json / ``` fences defensively before parsing.
function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/\t/g, "\\t")
    .trim();
}
// Parses TRUE raw text (no formatting contract) into
// { category, subcategory, content }[] using one Groq call.
//
//   rawText        - the raw, unstructured text pasted/scraped by the admin
//   category       - single category this import is scoped to (required)
//   subcategories  - fixed list of valid general-info subcategory values for
//                    this category (required, non-empty)
//   entities       - optional list of named sub-items (e.g. hostel names)
//                    that raw text may be tied to
//
// Throws on missing inputs, a Groq/parsing failure, or zero usable entries.
// Entries whose subcategory isn't actually in subcategories/entities are
// dropped (not thrown) with a warning, since that's a model slip-up on one
// item, not a reason to fail the whole import.
async function parseStructuredDoc(
  rawText,
  category,
  subcategories,
  entities = [],
) {
  if (!category || !category.trim()) {
    throw new Error("category is required.");
  }
  if (!rawText || !rawText.trim()) {
    throw new Error("rawText is required.");
  }
  if (!Array.isArray(subcategories) || subcategories.length === 0) {
    throw new Error("subcategories list is required and must be non-empty.");
  }

  const trimmedCategory = category.trim();
  const prompt = buildPrompt(
    trimmedCategory,
    subcategories,
    entities,
    rawText.trim(),
  );

  // No separate system prompt - the organizer prompt is designed as one
  // self-contained user message. temperature 0 because this is a parsing
  // task, not a creative one: we want the same input to produce the same
  // split every time.
  console.log("Hellow1");
  const raw = await callGroq(null, prompt, 3000, 0);
  console.log(raw);

  let parsed;

  const cleaned = stripCodeFences(raw);
  console.log(cleaned);
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Groq did not return valid JSON for this import: ${err.message}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Groq response was valid JSON but not an array.");
  }

  const allowedSubcategories = new Set(subcategories);
  const allowedEntities = new Set(entities || []);

  const entries = [];
  const warnings = [];

  parsed.forEach((item, i) => {
    if (
      !item ||
      typeof item.subcategory !== "string" ||
      typeof item.content !== "string" ||
      !item.subcategory.trim() ||
      !item.content.trim()
    ) {
      warnings.push(`Item ${i + 1}: missing subcategory or content, dropped.`);
      return;
    }

    const subcategory = item.subcategory.trim();
    const isValid =
      allowedSubcategories.has(subcategory) || allowedEntities.has(subcategory);

    if (!isValid) {
      warnings.push(
        `Item ${i + 1}: subcategory "${subcategory}" is not in the provided subcategory or entity list, dropped.`,
      );
      return;
    }

    // Category is force-set from the input, not trusted from the model
    // output, per rule 1 (belt-and-suspenders - the model is told to leave
    // it unchanged, but this guarantees it regardless).
    entries.push({
      category: trimmedCategory,
      subcategory,
      content: item.content,
    });
  });

  if (warnings.length > 0) {
    console.warn(`parseStructuredDoc warnings:\n${warnings.join("\n")}`);
  }

  if (entries.length === 0) {
    throw new Error(
      "No usable items were produced from this raw text. Check the raw text and the subcategory/entity lists.",
    );
  }

  return entries;
}

// Convenience wrapper for the common case: caller only has rawText and the
// category the admin picked, and wants the subcategories/entities looked up
// automatically from config/categoryConfig.js instead of having to pass them
// in by hand every time. This is what ingestion routes should call.
//
// parseStructuredDoc() itself stays as a pure function (explicit
// subcategories/entities args, no config/DB dependency) specifically so it's
// still trivial to unit-test with mock lists - see the earlier test suite.
// This wrapper is the only new thing that depends on categoryConfig.js.
//
// Throws whatever getCategoryConfig() throws (unknown category, or a known
// category with no subcategories configured yet) before ever calling Groq -
// so a typo'd or half-set-up category fails fast and cheap, not after a
// wasted API call.
async function parseRawTextForCategory(rawText, category) {
  const { subcategories, entities } = getCategoryConfig(category);
  return parseStructuredDoc(rawText, category, subcategories, entities);
}

module.exports = { parseStructuredDoc, parseRawTextForCategory };
