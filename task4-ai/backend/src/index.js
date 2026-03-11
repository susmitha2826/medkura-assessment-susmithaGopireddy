require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3002;

// ─── Middleware ───────────────────────────────────────────
app.use(cors({ origin: "http://localhost:5173" })); // Vite dev server
app.use(express.json({ limit: "1mb" }));

// ─── Claude client ────────────────────────────────────────
// API key loaded from .env — never hardcoded here
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── System Prompt ────────────────────────────────────────
// Carefully crafted to produce structured, clinically useful output.
// We ask for JSON only so we can parse it reliably on the frontend.
const SYSTEM_PROMPT = `You are a clinical assistant at MedKura Health, a medical second-opinion platform.
Your role is to read patient medical reports and discharge summaries, and extract a concise, structured briefing that a doctor can review in under 60 seconds.

You will receive a raw medical report text. Extract and return ONLY valid JSON — no markdown, no preamble, no explanation — in this exact structure:

{
  "keyFindings": "A 2-3 sentence plain-language summary of the primary diagnosis, main clinical findings, and current health status.",
  "currentMedications": ["Medication name + dose if mentioned", "..."],
  "redFlags": ["Any urgent or concerning finding that needs immediate attention", "..."],
  "patientQuery": "What the patient is seeking — a second opinion on X, guidance on Y, etc. Infer from context if not explicit.",
  "suggestedSpecialist": "The type of specialist most appropriate for this case based on the findings."
}

Rules:
- Use plain language a non-medical reader can understand — avoid jargon where possible.
- If a field cannot be determined from the report, use null for strings or [] for arrays.
- Keep keyFindings under 60 words.
- Keep each redFlag under 20 words.
- Do not add commentary outside the JSON object.`;

// ─── POST /summarise ──────────────────────────────────────
app.post("/summarise", async (req, res) => {
  const { reportText } = req.body;

  // Input validation
  if (!reportText || typeof reportText !== "string") {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "reportText is required and must be a string.",
    });
  }

  if (reportText.trim().length < 20) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "reportText is too short. Please paste a complete medical report.",
    });
  }

  if (reportText.length > 50000) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "reportText is too long (max 50,000 characters).",
    });
  }

  // Check API key is configured
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_claude_api_key_here") {
    return res.status(500).json({
      error: "CONFIG_ERROR",
      message: "Claude API key is not configured. Please set ANTHROPIC_API_KEY in your .env file.",
    });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please summarise the following medical report:\n\n${reportText.trim()}`,
        },
      ],
    });

    // Extract the text content from Claude's response
    const rawText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Parse JSON — strip any accidental markdown fences
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const summary = JSON.parse(cleaned);

    return res.json({
      success: true,
      summary,
      tokensUsed: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
      },
    });
  } catch (err) {
    // JSON parse error
    if (err instanceof SyntaxError) {
      console.error("Claude returned non-JSON:", err.message);
      return res.status(502).json({
        error: "PARSE_ERROR",
        message: "Claude returned an unexpected response format. Please try again.",
      });
    }

    // Anthropic API errors
    if (err.status) {
      console.error("Anthropic API error:", err.status, err.message);
      return res.status(502).json({
        error: "AI_API_ERROR",
        message: `Claude API error (${err.status}): ${err.message}`,
      });
    }

    console.error("Unexpected error:", err);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    });
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "MedKura AI Summariser",
    apiKeyConfigured: !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_claude_api_key_here"),
  });
});

app.listen(PORT, () => {
  console.log(`✅ MedKura AI Summariser backend running on http://localhost:${PORT}`);
});
