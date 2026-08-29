// utils/groqClient.js
//
// Thin Groq call wrapper.
// Used by aiService.js for answer generation.
//
// temperature is a parameter so callers can ask for deterministic output
// (parsing/classification) vs a little looseness (free-text answers).

async function callGroq(
  systemPrompt,
  userContent,
  maxTokens = 1000,
  temperature = 0.3,
) {
  const messages = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userContent });

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
        // reasoning_format: "hidden",
      }),
    },
  );

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

module.exports = { callGroq };
