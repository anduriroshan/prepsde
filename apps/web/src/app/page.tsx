const TODAY_TASKS = [
  { id: "1", label: "Solve NeetCode — Stack (7 problems)", done: false, estimate: "45 min" },
  { id: "2", label: "Read: Caching & CDNs", done: true, estimate: "20 min" },
  { id: "3", label: "Write STAR story #4", done: false, estimate: "15 min" },
];

const DUE_REVIEWS = [
  { id: "1", name: "Two Sum",           tag: "Day 7 review" },
  { id: "2", name: "Valid Parentheses", tag: "Day 15 review" },
];

const METRICS = [
  {
    label: "Day Streak",
    value: "42",
    unit: "days",
    icon: "local_fire_department",
    extra: "streak" as const,
  },
  {
    label: "Due Reviews",
    value: "2",
    unit: "cards",
    icon: "repeat",
    progress: { current: 0, total: 2 },
  },
  {
    label: "Problems",
    value: "42",
    unit: "solved",
    icon: "code",
    segments: { filled: 4, total: 14 },
  },
  {
    label: "Avg Accuracy",
    value: "78",
    unit: "%",
    icon: "task_alt",
    progress: { current: 78, total: 100 },
  },
];

function BentoCard({ item }: { item: typeof METRICS[0] }) {
  return (
    <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4 h-36 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[#9a9a9a] text-[11px] font-medium tracking-widest uppercase">{item.label}</span>
        <span className="material-symbols-outlined text-[#638688]" style={{ fontSize: 18 }}>{item.icon}</span>
      </div>
      <div>
        <p className="text-[#f0f0f0] font-black leading-none mb-2" style={{ fontSize: 42 }}>
          {item.value}
          <span className="text-[#9a9a9a] text-[14px] font-normal ml-1">{item.unit}</span>
        </p>
        {item.extra === "streak" && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            ))}
          </div>
        )}
        {"progress" in item && item.progress && (
          <div className="bg-[#242424] h-[3px]">
            <div
              className="bg-[#638688] h-full transition-all"
              style={{ width: `${(item.progress.current / item.progress.total) * 100}%` }}
            />
          </div>
        )}
        {"segments" in item && item.segments && (
          <div className="flex gap-0.5">
            {Array.from({ length: item.segments.total }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[3px] rounded-sm"
                style={{ backgroundColor: i < item.segments!.filled ? "#638688" : "#242424" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BurnDownChart() {
  return (
    <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[#f0f0f0] text-[15px] font-semibold">Burn-Down Trajectory</h2>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-[2px] bg-[#638688] rounded" />
            <span className="text-[#9a9a9a] text-[11px]">Actual Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-[2px] bg-[#555555] rounded" style={{ borderTop: "2px dashed #555555", height: 0 }} />
            <span className="text-[#9a9a9a] text-[11px]">Ideal Pace</span>
          </div>
        </div>
      </div>

      <div className="relative h-[140px]">
        <svg width="100%" height="100%" viewBox="0 0 1000 200" preserveAspectRatio="none" className="absolute inset-0">
          <defs>
            <linearGradient id="grad-teal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#638688" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#638688" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[50, 100, 150].map((y) => (
            <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}
          {/* Ideal pace (dashed) */}
          <path d="M 0 180 L 1000 20" fill="none" stroke="#555555" strokeDasharray="10,8" strokeWidth="2" />
          {/* Actual progress area fill */}
          <path
            d="M 0 180 L 130 168 L 300 140 L 480 152 L 650 110 L 730 88 L 730 200 L 0 200 Z"
            fill="url(#grad-teal)"
          />
          {/* Actual progress line */}
          <path
            d="M 0 180 L 130 168 L 300 140 L 480 152 L 650 110 L 730 88"
            fill="none"
            stroke="#638688"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Current position marker */}
          <circle cx="730" cy="88" r="8" fill="#0d0d0d" stroke="#638688" strokeWidth="2.5" />
          <circle cx="730" cy="88" r="3" fill="#638688" />
        </svg>
      </div>

      <div className="flex justify-between mt-3">
        {["Start", "Wk 2", "Wk 4", "Wk 6", "Today", "Deadline"].map((label) => (
          <span
            key={label}
            className={`text-[11px] font-mono ${label === "Today" ? "text-[#638688] font-bold" : "text-[#555555]"}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const daysLeft = 184;

  return (
    <div className="p-8 max-w-3xl">
      {/* Pace indicator pill */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-2.5 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded-full px-4 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-50" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]" />
          </span>
          <span className="text-[#22c55e] text-[11px] font-semibold tracking-widest uppercase">
            You are on track
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-[#9a9a9a] text-[11px] font-medium tracking-widest uppercase mb-1">Dashboard</p>
          <h1 className="text-[#f0f0f0] text-[28px] font-bold">Hey, Roshan</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-full px-3 py-1 flex items-center gap-1.5">
            <span>🔥</span>
            <span className="text-[#f0f0f0] text-[13px] font-semibold font-mono">12</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#638688] flex items-center justify-center">
            <span className="text-white text-[13px] font-bold">AR</span>
          </div>
        </div>
      </div>

      {/* Deadline Hero */}
      <div className="bg-[#1a1a1a] border border-[rgba(99,134,136,0.2)] rounded-large p-8 mb-5">
        <p className="text-[#9a9a9a] text-[11px] font-medium tracking-widest uppercase mb-2">Days to Interview</p>
        <p className="text-[#f0f0f0] font-black mb-3" style={{ fontSize: "80px", lineHeight: 1 }}>{daysLeft}</p>
        <div className="flex items-center justify-between">
          <p className="text-[#9a9a9a] text-[14px]">Target: Dec 15, 2026</p>
          <span className="bg-[rgba(34,197,94,0.12)] text-[#22c55e] text-[12px] font-medium px-3 py-1 rounded-tight">
            ● On Track
          </span>
        </div>
        <div className="mt-5 bg-[#242424] h-[3px]">
          <div className="bg-[#638688] h-full" style={{ width: "36%" }} />
        </div>
        <p className="text-[#555555] text-[11px] mt-1.5 font-mono">36% of prep complete</p>
      </div>

      {/* Bento 2×2 metric cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {METRICS.map((m) => (
          <BentoCard key={m.label} item={m} />
        ))}
      </div>

      {/* Burn-Down Chart */}
      <BurnDownChart />

      {/* Today's Tasks + Due Reviews */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex justify-between items-center border-b border-[rgba(255,255,255,0.04)]">
            <h2 className="text-[#f0f0f0] text-[14px] font-semibold">Today's Tasks</h2>
            <span className="text-[#9a9a9a] text-[12px]">
              {TODAY_TASKS.filter((t) => !t.done).length} remaining
            </span>
          </div>
          {TODAY_TASKS.map((task) => (
            <div
              key={task.id}
              className="flex items-center px-4 py-3 gap-3 border-b border-[rgba(255,255,255,0.04)] hover:bg-[#242424] cursor-pointer transition-colors"
            >
              <div
                className="w-[3px] self-stretch rounded-full"
                style={{ backgroundColor: task.done ? "#555555" : "#638688" }}
              />
              <p className={`flex-1 text-[13px] ${task.done ? "text-[#555555] line-through" : "text-[#f0f0f0]"}`}>
                {task.label}
              </p>
              <span className="bg-[#242424] text-[#9a9a9a] text-[11px] font-mono px-2 py-0.5 rounded-tight">
                {task.estimate}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[#f0f0f0] text-[14px] font-semibold">Due for Review</h2>
            <span className="bg-[rgba(239,68,68,0.12)] text-[#ef4444] text-[11px] font-medium px-2 py-0.5 rounded-tight">
              {DUE_REVIEWS.length} due
            </span>
          </div>
          {DUE_REVIEWS.map((r, i) => (
            <div key={r.id}>
              {i > 0 && <div className="h-[1px] bg-[rgba(255,255,255,0.04)] my-2" />}
              <div className="flex justify-between items-center py-1.5 hover:text-[#638688] cursor-pointer transition-colors group">
                <span className="text-[#f0f0f0] text-[13px] group-hover:text-[#638688] transition-colors">{r.name}</span>
                <span className="text-[#9a9a9a] text-[11px] font-mono">{r.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
