// utils/groqClient.js
//
// Thin Groq call wrapper. Used at:
//   - INGESTION time now too: rawDataParser.js calls this with temperature 0
//     to deterministically split+tag raw text (see that file for why).
//   - QUERY time: matcher.js (aggregate synthesis, temperature 0.3) and
//     the answer generator (temperature default).
//
// temperature is now a parameter (was hardcoded 0.3) so callers can ask for
// deterministic output when it matters (parsing/classification) vs a little
// looseness when it doesn't (free-text answers).

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroq(
  systemPrompt,
  userContent,
  maxTokens = 1000,
  temperature = 0.3,
  retriesLeft = 4,
) {
  const messages = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userContent });
  console.log(process.env.GROQ_MODEL);
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    },
  );

  if (response.status === 429) {
    if (retriesLeft <= 0) {
      throw new Error("Groq rate limit hit. Try again shortly.");
    }
    const errBody = await response.text();
    console.log(errBody);
    const match = errBody.match(/try again in ([\d.]+)s/i);
    const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 1000 : 5000;
    await sleep(waitMs);
    return callGroq(
      systemPrompt,
      userContent,
      maxTokens,
      temperature,
      retriesLeft - 1,
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (data.choices[0].finish_reason === "length") {
    throw new Error("Groq response was cut off (hit max_tokens).");
  }

  return data.choices[0].message.content.trim();
}

// Merges old and new content for the same (category, subcategory). New content
// wins on conflicts (price changes, updated numbers, etc). Info only present in
// old content is kept as long as it doesn't contradict the new content.
async function mergeContent(oldContent, newContent) {
  const systemPrompt = `You are merging two pieces of knowledge-base content about the same topic.

RULES:
1. If old and new content conflict (a price, date, number, status, or any fact changed), ALWAYS use the NEW content's version - it is the source of truth.
2. If old content has information NOT present in the new content and it does NOT conflict with the new content, keep that information too.
3. Do not invent, rewrite, paraphrase, or summarize - only combine what is given, preferring new on conflicts.
4. Remove exact duplicate lines.
5. Output ONLY the merged content text. No explanation, no markdown, no labels like "Old:"/"New:".

OLD CONTENT:
${oldContent}

NEW CONTENT:
${newContent}`;

  const merged = await callGroq(
    systemPrompt,
    "Merge the above content now.",
    1500,
    0.3,
  );
  return merged.trim();
}

module.exports = { callGroq, mergeContent };
