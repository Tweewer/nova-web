
const express = require("express");
const path = require("path");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Hosted AI configuration
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// Cove's identity
const COVE_IDENTITY =
  "I'm Cove, an AI assistant created and developed by Tyler. " +
  "I use an AI model through Groq to generate responses. " +
  "Tyler created the Cove AI project and its application.";

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

// Chat endpoint
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

    // Keep Cove's identity consistent.
    if (isIdentityQuestion(cleanMessage)) {
      return res.json({ reply: COVE_IDENTITY });
    }

    // Require the hosted API key for other AI requests.
    if (!groq) {
      return res.status(503).json({
        error: "Cove's AI is not configured yet. Please set the GROQ_API_KEY environment variable."
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are Cove, an AI assistant created and developed by Tyler.

Tyler created the Cove AI application. You are powered by an AI model accessed through Groq. Do not claim that Tyler personally trained the underlying model.

Your main focus is coding, programming, debugging, software development, website building, and computer troubleshooting.

Be helpful, professional, friendly, and concise. Give practical instructions and accurate code. If you are unsure, say so.`
        },
        {
          role: "user",
          content: cleanMessage
        }
      ],
      temperature: 0.5,
      max_tokens: 1200
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "Cove received an empty response. Please try again."
      });
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Cove AI error:", error.message);

    return res.status(500).json({
      error: "Cove couldn't generate a response. Please try again shortly."
    });
  }
});

// Website homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Cove is running at http://localhost:${PORT}`);
  console.log(
    `Groq API key configured: ${Boolean(process.env.GROQ_API_KEY)}`
  );
});
