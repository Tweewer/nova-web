
const express = require("express");
const path = require("path");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const COVE_IDENTITY =
  "I'm Cove, an AI assistant created and developed by Tyler. " +
  "My AI responses are powered by a model accessed through Groq. " +
  "Tyler created the Cove application, not the underlying AI model.";

function isIdentityQuestion(message) {
  const text = message.toLowerCase();

  const patterns = [
    /\bwho\s+(made|created|built|developed)\s+you\b/,
    /\bwho\s+is\s+your\s+(creator|developer|maker)\b/,
    /\bwho\s+owns\s+you\b/,
    /\bwho\s+is\s+behind\s+cove\b/,
    /\bare\s+you\s+(meta\s+ai|chatgpt)\b/,
    /\bwere\s+you\s+(made|created|built)\s+by\s+meta\b/,
    /\bwhat\s+ai\s+model\s+do\s+you\s+use\b/
  ];

  return patterns.some((pattern) => pattern.test(text));
}

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const cleanMessage = message.trim();

    if (cleanMessage.length > 10000) {
      return res.status(400).json({
        error: "Your message is too long. Please keep it under 10,000 characters."
      });
    }

    // Answer Cove identity questions consistently.
    if (isIdentityQuestion(cleanMessage)) {
      return res.json({ reply: COVE_IDENTITY });
    }

    if (!groq) {
      console.error("GROQ_API_KEY is not configured.");

      return res.status(503).json({
        error: "Cove's AI is not configured yet. Please try again later."
      });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: `You are Cove, an AI assistant created and developed by Tyler.

Tyler created the Cove application, its interface, and its software. Do not claim that Tyler trained the underlying AI model.

Your primary specialties are:
- Programming and coding
- Debugging and explaining code
- Website and application development
- Computer troubleshooting
- Helping users learn technical skills

Be professional, friendly, clear, and practical.
Give step-by-step instructions when useful.
When providing code, make it accurate and explain where it belongs.
Keep simple answers concise, but provide detail when the task needs it.
Never claim to have performed actions you have not performed.
If you are unsure of something, be honest about it.`
        },
        {
          role: "user",
          content: cleanMessage
        }
      ],
      temperature: 0.5,
      max_tokens: 1200
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error("Groq returned an empty response.");

      return res.status(502).json({
        error: "Cove received an empty response. Please try again."
      });
    }

    return res.json({ reply });
  } catch (error) {
    // Keep the details in Render logs, not in the public response.
    console.error("Cove AI error:", {
      status: error.status,
      code: error.code,
      message: error.message
    });

    if (error.status === 401 || error.status === 403) {
      return res.status(502).json({
        error: "Cove's AI authentication failed. Please contact the site administrator."
      });
    }

    if (error.status === 429) {
      return res.status(503).json({
        error: "Cove has temporarily reached its AI usage limit. Please try again later."
      });
    }

    if (error.status === 404) {
      return res.status(502).json({
        error: "Cove's configured AI model is unavailable. Please try again later."
      });
    }

    return res.status(500).json({
      error: "Cove couldn't generate a response. Please try again shortly."
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Cove is running on port ${PORT}`);
  console.log(
    `Groq API key configured: ${Boolean(process.env.GROQ_API_KEY)}`
  );
});
