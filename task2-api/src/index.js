const express = require("express");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────
app.use(express.json());

// Basic request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────
app.use("/", routes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "MedKura Doctor Availability API", timestamp: new Date().toISOString() });
});

// ─── 404 Handler ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found." });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`✅ MedKura API running on http://localhost:${PORT}`);
});

module.exports = app;
