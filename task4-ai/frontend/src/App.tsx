import { useState, useRef } from "react";

// ─── Types ───────────────────────────────────────────────
interface MedicalSummary {
  keyFindings: string | null;
  currentMedications: string[];
  redFlags: string[];
  patientQuery: string | null;
  suggestedSpecialist: string | null;
}

type AppState = "idle" | "loading" | "success" | "error";

// ─── Sample report for demo ───────────────────────────────
const SAMPLE_REPORT = `DISCHARGE SUMMARY

Patient: Ravi Sharma, 52M
Date of Admission: 2024-02-10
Date of Discharge: 2024-02-14
Ward: Orthopaedics

Primary Diagnosis: Right knee osteoarthritis Grade III–IV with medial compartment involvement.

History: Patient presented with a 3-year history of progressive right knee pain, stiffness, and difficulty walking >200m. Pain VAS 8/10. Failed conservative management including physiotherapy, NSAIDs, and two intra-articular corticosteroid injections.

Investigations:
- X-ray right knee: Severe medial joint space narrowing, osteophytes, subchondral sclerosis
- MRI right knee: Medial meniscus tear (posterior horn), anterior cruciate ligament intact, grade 3 cartilage loss
- HbA1c: 7.8% (elevated — noted)
- CBC, LFTs, RFTs: Within normal limits
- Echo: EF 58%, no regional wall motion abnormality

Procedure: Right Total Knee Replacement (cemented, posterior-stabilised) performed under spinal anaesthesia.

Post-op Course: Uneventful. Physiotherapy initiated day 1. Patient discharged ambulant with walker.

Medications on Discharge:
- Tab. Pantoprazole 40mg once daily × 4 weeks
- Tab. Enoxaparin 40mg SC once daily × 2 weeks (DVT prophylaxis)
- Tab. Paracetamol 500mg TID × 2 weeks
- Tab. Metformin 500mg BD (pre-existing diabetes, to be reviewed by endocrinologist)

Follow-up: OPD in 2 weeks for wound inspection and suture removal.

The patient and family are anxious about the recovery process and are seeking a second opinion on whether the surgery was indicated and whether the post-operative care plan is appropriate. They have heard about a minimally invasive technique and would like to know if they missed that option.`;

// ─── Summary Card Component ───────────────────────────────
function SummaryCard({ summary }: { summary: MedicalSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 mt-6">
      {/* Key Findings */}
      {summary.keyFindings && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔍</span>
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">Key Findings</h3>
          </div>
          <p className="text-slate-100 text-sm leading-relaxed">{summary.keyFindings}</p>
        </div>
      )}

      {/* Two column on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Medications */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💊</span>
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">Current Medications</h3>
          </div>
          {summary.currentMedications && summary.currentMedications.length > 0 ? (
            <ul className="space-y-2">
              {summary.currentMedications.map((med, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="text-teal-400 mt-0.5 flex-shrink-0">·</span>
                  {med}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm italic">No medications listed</p>
          )}
        </div>

        {/* Red Flags */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚠️</span>
            <h3 className="text-xs font-mono uppercase tracking-widest text-red-400">Red Flags</h3>
          </div>
          {summary.redFlags && summary.redFlags.length > 0 ? (
            <ul className="space-y-2">
              {summary.redFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-200">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
                  {flag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm italic">No red flags identified</p>
          )}
        </div>
      </div>

      {/* Patient Query */}
      {summary.patientQuery && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💬</span>
            <h3 className="text-xs font-mono uppercase tracking-widest text-amber-400">Patient's Query</h3>
          </div>
          <p className="text-amber-100 text-sm leading-relaxed">{summary.patientQuery}</p>
        </div>
      )}

      {/* Suggested Specialist */}
      {summary.suggestedSpecialist && (
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">👨‍⚕️</span>
            <h3 className="text-xs font-mono uppercase tracking-widest text-teal-400">Suggested Specialist</h3>
          </div>
          <p className="text-teal-100 font-semibold text-sm">{summary.suggestedSpecialist}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  const [reportText, setReportText] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [summary, setSummary] = useState<MedicalSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    if (!reportText.trim()) {
      setErrorMsg("Please paste a medical report before submitting.");
      return;
    }

    setState("loading");
    setErrorMsg("");
    setSummary(null);

    try {
      const res = await fetch("http://localhost:3002/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      setSummary(data.summary);
      setState("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
      setState("error");
    }
  }

  function handleReset() {
    setState("idle");
    setSummary(null);
    setErrorMsg("");
    setReportText("");
  }

  function loadSample() {
    setReportText(SAMPLE_REPORT);
    textareaRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 p-4 sm:p-6 lg:p-10 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 text-xs font-bold">
              M
            </div>
            <span className="text-xs font-mono tracking-widest text-slate-500 uppercase">MedKura Health</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            AI Report Summariser
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Paste a patient's medical report or discharge summary. Our AI will extract key findings,
            medications, red flags, and the patient's query — in under 60 seconds.
          </p>
        </div>

        {/* Input Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Medical Report
            </label>
            <button
              onClick={loadSample}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2"
              disabled={state === "loading"}
            >
              Load sample report
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Paste the patient's discharge summary or medical report here..."
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all font-mono"
            rows={10}
            disabled={state === "loading"}
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-600 font-mono">
              {reportText.length.toLocaleString()} chars
            </span>

            <div className="flex gap-3">
              {state !== "idle" && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-lg transition-all"
                >
                  Reset
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={state === "loading" || !reportText.trim()}
                className="px-5 py-2 text-sm font-semibold bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2"
              >
                {state === "loading" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Summarising...
                  </>
                ) : (
                  <>
                    <span>✦</span>
                    Summarise with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {state === "loading" && (
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="w-10 h-10 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Claude is reading the report...</p>
            <p className="text-slate-600 text-xs mt-1 font-mono">This usually takes 5–10 seconds</p>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="mt-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-lg">⚠</span>
              <div>
                <p className="text-red-300 font-semibold text-sm mb-1">Something went wrong</p>
                <p className="text-red-400/80 text-sm">{errorMsg}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success state */}
        {state === "success" && summary && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <p className="text-xs font-mono uppercase tracking-widest text-teal-400">AI Summary Ready</p>
            </div>
            <SummaryCard summary={summary} />
          </div>
        )}
      </div>
    </div>
  );
}
