import { useState } from "react";

// ─── Types ───────────────────────────────────────────────
interface TimelineEvent {
  timestamp: string;
  description: string;
  type: "info" | "alert" | "success";
}

interface PatientCase {
  id: string;
  patientName: string;
  age: number;
  condition: string;
  currentStage: number;
  urgency: "normal" | "attention" | "urgent";
  representative: {
    name: string;
    phone: string;
  };
  nextAction: string;
  events: TimelineEvent[];
}

// ─── Mock Data ───────────────────────────────────────────
const MOCK_CASE: PatientCase = {
  id: "CASE-2024-0491",
  patientName: "Ravi Sharma",
  age: 52,
  condition: "Knee Replacement Surgery",
  currentStage: 3,
  urgency: "attention",
  representative: {
    name: "Priya Menon",
    phone: "+91 98765 43210",
  },
  nextAction: "Second opinion appointment confirmed with Dr. Ramesh on 15 Mar",
  events: [
    {
      timestamp: "2024-03-10T09:30:00",
      description: "Dr. Mehta confirmed availability for 3rd Jan consultation",
      type: "success",
    },
    {
      timestamp: "2024-03-08T14:15:00",
      description: "Lab report uploaded — MRI scan results available",
      type: "info",
    },
    {
      timestamp: "2024-03-07T11:00:00",
      description: "Insurance pre-authorisation submitted to Star Health",
      type: "info",
    },
    {
      timestamp: "2024-03-05T16:45:00",
      description: "Urgent: Blood sugar levels flagged by Dr. Kapoor",
      type: "alert",
    },
    {
      timestamp: "2024-03-01T10:00:00",
      description: "Case opened — Onboarding completed successfully",
      type: "success",
    },
  ],
};

const STAGES = [
  { label: "Onboarded", icon: "✓" },
  { label: "Lab Tests", icon: "🧪" },
  { label: "2nd Opinion", icon: "👨‍⚕️" },
  { label: "Hospital Selected", icon: "🏥" },
  { label: "Surgery Scheduled", icon: "📅" },
  { label: "Completed", icon: "⭐" },
];

// ─── Helpers ─────────────────────────────────────────────
const urgencyConfig = {
  normal: {
    label: "Normal",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  attention: {
    label: "Attention Needed",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  urgent: {
    label: "Urgent",
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-400",
  },
};

const eventConfig = {
  info: { icon: "ℹ", color: "text-sky-400", bar: "bg-sky-400" },
  success: { icon: "✓", color: "text-emerald-400", bar: "bg-emerald-400" },
  alert: { icon: "⚠", color: "text-red-400", bar: "bg-red-400" },
};

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Sub-components ──────────────────────────────────────
function StageProgress({ current }: { current: number }) {
  return (
    <div className="mt-6">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
        Care Journey
      </p>
      {/* Mobile: vertical list */}
      <div className="flex flex-col gap-2 sm:hidden">
        {STAGES.map((stage, i) => {
          const done = i + 1 < current;
          const active = i + 1 === current;
          return (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${done ? "bg-teal-500 text-white" : active ? "bg-teal-500/20 border-2 border-teal-400 text-teal-300" : "bg-slate-800 border border-slate-700 text-slate-600"}`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${active ? "text-teal-300 font-semibold" : done ? "text-slate-400" : "text-slate-600"}`}>
                {stage.label}
              </span>
              {active && (
                <span className="ml-auto text-xs text-teal-400 bg-teal-400/10 border border-teal-400/20 px-2 py-0.5 rounded-full">
                  Current
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:flex items-center">
        {STAGES.map((stage, i) => {
          const done = i + 1 < current;
          const active = i + 1 === current;
          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0 relative group">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${done ? "bg-teal-500 text-white shadow-[0_0_12px_rgba(20,184,166,0.4)]"
                      : active ? "bg-teal-500/15 border-2 border-teal-400 text-teal-300 shadow-[0_0_16px_rgba(20,184,166,0.25)]"
                      : "bg-slate-800 border border-slate-700 text-slate-600"}`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className={`absolute top-11 text-center text-[10px] leading-tight whitespace-nowrap
                    ${active ? "text-teal-300 font-semibold" : done ? "text-slate-400" : "text-slate-600"}`}
                >
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i + 1 < current ? "bg-teal-500" : "bg-slate-700"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="hidden sm:block h-7" /> {/* spacer for labels */}
    </div>
  );
}

function NotificationPanel({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-fit">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Activity</p>
        <span className="text-xs text-teal-400 bg-teal-400/10 border border-teal-400/20 px-2 py-0.5 rounded-full">
          {events.length} events
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {events.map((ev, i) => {
          const cfg = eventConfig[ev.type];
          return (
            <div key={i} className="flex gap-3 group">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${cfg.color} bg-slate-800 border border-slate-700`}>
                  {cfg.icon}
                </div>
                {i < events.length - 1 && (
                  <div className={`w-px flex-1 mt-1 ${cfg.bar} opacity-20`} />
                )}
              </div>
              <div className="pb-3">
                <p className="text-xs text-slate-400 font-mono mb-1">{formatTime(ev.timestamp)}</p>
                <p className="text-sm text-slate-200 leading-snug">{ev.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function PatientCaseDashboard() {
  const [patientCase, setPatientCase] = useState<PatientCase>(MOCK_CASE);

  const urgency = urgencyConfig[patientCase.urgency];
  const urgencyOrder: Array<"normal" | "attention" | "urgent"> = ["normal", "attention", "urgent"];

  function cycleUrgency() {
    const idx = urgencyOrder.indexOf(patientCase.urgency);
    const next = urgencyOrder[(idx + 1) % urgencyOrder.length];
    setPatientCase((prev) => ({ ...prev, urgency: next }));
  }

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 p-4 sm:p-6 lg:p-10 font-sans">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 text-sm font-bold">
            M
          </div>
          <span className="text-xs font-mono tracking-widest text-slate-500 uppercase">MedKura Health</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Patient Case Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time care coordination dashboard</p>
      </div>

      {/* Main Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Patient Card — spans 2 cols */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6">
          {/* Top row */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-600">{patientCase.id}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{patientCase.patientName}</h2>
              <p className="text-slate-400 text-sm">{patientCase.age} yrs · {patientCase.condition}</p>
            </div>

            {/* Urgency Badge + Toggle */}
            <div className="flex flex-col items-end gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${urgency.bg} ${urgency.text} ${urgency.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot} animate-pulse`} />
                {urgency.label}
              </div>
              <button
                onClick={cycleUrgency}
                className="text-xs text-slate-500 hover:text-teal-400 transition-colors underline underline-offset-2"
              >
                cycle urgency →
              </button>
            </div>
          </div>

          {/* Stage Progress */}
          <StageProgress current={patientCase.currentStage} />

          {/* Divider */}
          <div className="border-t border-slate-800 my-5" />

          {/* Representative */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Care Rep</p>
              <p className="font-semibold text-white">{patientCase.representative.name}</p>
              <p className="text-sm text-teal-400 font-mono mt-0.5">{patientCase.representative.phone}</p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Next Action</p>
              <p className="text-sm text-slate-200 leading-snug">{patientCase.nextAction}</p>
            </div>
          </div>
        </div>

        {/* Notification Panel */}
        <NotificationPanel events={patientCase.events} />
      </div>
    </div>
  );
}
