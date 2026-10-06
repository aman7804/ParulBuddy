async function callGroq(
  systemPrompt,
  userContent,
  maxTokens = 1000,
  temperature = 0.3,
) {
  const messages = [];
  if (systemPrompt?.trim()) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userContent });

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
  });
  if (!response.ok) throw new Error(`Groq API error (${response.status})`);
  const data = await response.json();
  if (data.choices?.[0]?.finish_reason === "length") {
    throw new Error("Groq response was cut off");
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Groq returned an empty response");
  return content;
}

module.exports = { callGroq };
