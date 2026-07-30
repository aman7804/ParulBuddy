const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function generateAnswer(question, matchedEntries) {
  if (matchedEntries.length === 0) {
    return "I couldn't find specific info on that in the college database yet. Try rephrasing, or ask about Hostel, Exams, or Placement.";
  }

  const contextText = matchedEntries
    .map((e) => `${e.subcategory}:\n${e.content}`)
    .join("\n\n");

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a helpdesk assistant for Parul University. Answer the student's question using ONLY the context provided. Be concise, specific to what they actually asked, and friendly. If the context doesn't cover what they're asking, say so honestly instead of repeating unrelated info.",
          },
          {
            role: "user",
            content: `Context:\n${contextText}\n\nQuestion: ${question}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Groq API error ${response.status}: ${errText}`);
      throw new Error(`Groq API returned ${response.status}`);
    }

    const data = await response.json();
    console.log("Groq raw response:", JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0]) {
      throw new Error(
        `Unexpected Groq response shape: ${JSON.stringify(data)}`,
      );
    }

    return data.choices[0].message.content;
  } catch (err) {
    console.error(`AI generation failed: ${err.message}`);
    return `Based on college records: ${contextText}`;
  }
}

module.exports = { generateAnswer };
