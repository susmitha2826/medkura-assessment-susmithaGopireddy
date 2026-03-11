# MedKura Health — Fullstack Engineer Assessment

> Submitted by: susmithaGopireddy

---

## Repository Structure

```
medkura-assessment/
├── task1-dashboard/    React Patient Case Dashboard
├── task2-api/          Node.js Doctor Availability REST API
├── task3-schema/       PostgreSQL Patient Journey Schema
├── task4-ai/
│   ├── backend/        Node.js + Claude AI summariser endpoint
│   └── frontend/       React UI for the AI summariser
└── README.md
```

---

## How to Run Each Task

### Task 1 — Patient Case Dashboard

```bash
cd task1-dashboard
npm install
npm run dev
# Opens at http://localhost:5173
```

**What to see:** A responsive patient card for "Ravi Sharma" showing the 6-stage care journey (currently at stage 3). Click "cycle urgency →" to toggle between Normal / Attention Needed / Urgent badge states.

---

### Task 2 — Doctor Availability API

```bash
cd task2-api
npm install
npm start
# Runs at http://localhost:3001
```

**Test with curl:**

```bash
# List all doctors
curl http://localhost:3001/doctors

# Filter by specialty and city
curl "http://localhost:3001/doctors?specialty=cardiology&city=hyderabad"

# Get slots for a doctor
curl http://localhost:3001/doctors/doc_001/slots

# Create a booking (replace datetime with one from the slots response)
curl -X POST http://localhost:3001/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "doc_001",
    "slotDatetime": "2026-03-11T10:00:00+05:30",
    "patientName": "Ravi Sharma",
    "patientPhone": "+91 98765 43210"
  }'

# Try booking the same slot again — expect 409
curl -X POST http://localhost:3001/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "doc_001",
    "slotDatetime": "2026-03-11T10:00:00+05:30",
    "patientName": "Another Patient",
    "patientPhone": "+91 99999 00000"
  }'

# View all bookings
curl http://localhost:3001/bookings
```

---

### Task 3 — Database Schema

No setup needed — it's a plain `.sql` file.

```bash
# To apply to a local PostgreSQL database:
psql -U postgres -d your_database -f task3-schema/schema.sql
```

The two sample queries are included as SQL comments at the bottom of the file.

---

### Task 4 — Claude AI Medical Report Summariser

**Step 1: Configure API key**

```bash
cd task4-ai/backend
cp .env.example .env
# Edit .env and replace 'your_claude_api_key_here' with your actual Claude API key
```

**Step 2: Start the backend**

```bash
cd task4-ai/backend
npm install
npm start
# Runs at http://localhost:3002
```

**Step 3: Start the frontend**

```bash
cd task4-ai/frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

**Step 4:** Click "Load sample report" in the UI, then hit "Summarise with AI".

---

## Key Design Decisions

### Task 1 — Dashboard

- **Responsive-first layout:** Two-column grid on desktop (card + notification panel), stacked single column on mobile. The stage progress indicator switches between a horizontal stepper (desktop) and a vertical list (mobile ≤375px).
- **Urgency toggle** updates only the React state — the card re-renders the badge without any page navigation.
- **TypeScript interfaces** match the spec exactly (`PatientCase`, `TimelineEvent`) and are declared at the top of the component file.
- **No external component library** — styled with Tailwind utilities only, keeping the bundle lean and the design fully custom.

### Task 2 — API

- **Separation of concerns:** `routes/index.js` → `controllers/` → `data/store.js`. Adding a real database later only requires swapping out the data layer.
- **Validation middleware** uses `express-validator` so validation rules live close to the routes, not scattered in controllers.
- **Slot generation** happens at server start from a deterministic function — easy to replace with a DB query later.
- **409 Conflict** is used for double-booking (semantically correct: the resource exists but conflicts with current state).
- All monetary values (consultation fees) are stored as integers (paise) to avoid float precision issues.

### Task 3 — Schema

- **Cases ≠ Patients:** A patient can have multiple cases (e.g., knee replacement in 2024 and hernia repair in 2026). This was the central design challenge.
- **Audit trail via `case_stage_history`:** An append-only table with immutable rows. We never update this table — each stage change appends a row with `from_stage`, `to_stage`, `changed_by`, and `created_at`. This gives us full auditability and enables time-in-stage analytics.
- **Index strategy:**
  - `idx_cases_rep_stage` — covers the most common dashboard query: "give me all active cases for rep X at stage Y"
  - `idx_cases_urgency` — for triage views filtering by urgency
  - `idx_stage_history_case_id` — for quickly fetching a case's full history
  - `idx_doctors_specialty_city` — for the booking search flow
  - `idx_documents_entity` — polymorphic lookup for file attachments
- **Polymorphic documents table:** Rather than separate `case_documents`, `consultation_documents` tables, a single `documents` table with `entity_type + entity_id` keeps the schema clean and extensible.

### Task 4 — AI Integration

- **API key never in frontend:** The key lives in `backend/.env` only. The frontend calls `POST /summarise` on our own backend — the Anthropic API key is never sent to or exposed in the browser.
- **Prompt engineering decisions:**
  - Asked Claude to return **only valid JSON** — no markdown fences, no preamble. This makes parsing reliable.
  - Specified exact word limits per field (keyFindings: ≤60 words, each redFlag: ≤20 words) to prevent verbose output that slows down the doctor's pre-read.
  - Explicitly told Claude to use `null` for missing string fields and `[]` for empty arrays — avoids `undefined` errors in the frontend.
  - Added "use plain language a non-medical reader can understand" — important because the patient's family may also see summaries.
- **Error handling** covers: missing API key, JSON parse failure (Claude returned non-JSON), Anthropic API errors (4xx/5xx), and network failures on the frontend.
- **Loading + error states** are fully implemented in the UI.

---

## What I'd Do Differently With More Time

- **Task 1:** Add a multi-case view (patient list dashboard), animated stage transitions, and a real notification system with WebSocket updates.
- **Task 2:** Add JWT authentication, rate limiting, and replace the in-memory store with a proper PostgreSQL connection using the Task 3 schema. Add pagination to `GET /doctors`.
- **Task 3:** Add a `notifications` table for real-time alerts, and a `insurance_claims` table since that's a key part of the medical journey. Would also add row-level security policies for multi-tenant isolation.
- **Task 4:** Stream Claude's response using the streaming API for a better UX (token-by-token rendering). Add the ability to upload a PDF rather than just pasting text. Cache summaries by report hash to avoid duplicate API calls.

---

## Thoughts on the Claude Prompt

**What worked well:**
- Requesting JSON-only output with explicit null handling made parsing bulletproof.
- The word-limit instructions kept the output genuinely scannable — the 60-second pre-read goal was achievable.
- Framing Claude as "a clinical assistant at MedKura Health" gave it useful context about the product and user.

**What I'd improve:**
- Add few-shot examples in the system prompt — one example input → output pair significantly improves JSON structure adherence.
- The `suggestedSpecialist` field could be an enum of known specialist types to make routing logic easier downstream.
- In production, I'd add a validation step: after parsing the JSON, check each field against expected types and ranges before returning to the frontend.

---

## Assumptions

1. "In-memory data store" for Task 2 means no database required — seeded data is fine.
2. Task 4 API key will be provided separately for evaluation — the submitted code uses a `.env` placeholder.
3. The frontend for Task 4 can be a separate Vite app (not served from the backend), communicating via CORS.
4. TypeScript is "preferred" but not required — used throughout Tasks 1 and 4.
