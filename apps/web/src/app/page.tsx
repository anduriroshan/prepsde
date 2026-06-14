const TODAY_TASKS = [
  { id: "1", label: "Solve NeetCode — Stack (7 problems)", done: false, estimate: "45 min" },
  { id: "2", label: "Read: Caching & CDNs", done: true, estimate: "20 min" },
  { id: "3", label: "Write STAR story #4", done: false, estimate: "15 min" },
];

const PACE = [
  { label: "Problems",    current: 8, target: 10 },
  { label: "Sys Design",  current: 3, target: 5 },
  { label: "Reflections", current: 5, target: 5 },
];

const DUE_REVIEWS = [
  { id: "1", name: "Two Sum",           tag: "Day 7 review" },
  { id: "2", name: "Valid Parentheses", tag: "Day 15 review" },
];

export default function HomePage() {
  const daysLeft = 184;

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-[#9a9a9a] text-[11px] font-medium tracking-widest uppercase mb-1">Dashboard</p>
          <h1 className="text-[#f0f0f0] text-[28px] font-bold">Hey, Roshan</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="text-[14px]">🔥</span>
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
        <p className="text-[#f0f0f0] font-black mb-2" style={{ fontSize: "80px", lineHeight: 1 }}>{daysLeft}</p>
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

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Today's Tasks */}
        <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex justify-between items-center border-b border-[rgba(255,255,255,0.04)]">
            <h2 className="text-[#f0f0f0] text-[15px] font-semibold">Today's Tasks</h2>
            <span className="text-[#9a9a9a] text-[12px]">
              {TODAY_TASKS.filter((t) => !t.done).length} remaining
            </span>
          </div>
          {TODAY_TASKS.map((task) => (
            <div key={task.id} className="flex items-center px-4 py-3 gap-3 border-b border-[rgba(255,255,255,0.04)] hover:bg-[#242424] cursor-pointer transition-colors">
              <div className="w-[3px] self-stretch rounded-full" style={{ backgroundColor: task.done ? "#555555" : "#638688" }} />
              <p className={`flex-1 text-[14px] ${task.done ? "text-[#555555] line-through" : "text-[#f0f0f0]"}`}>
                {task.label}
              </p>
              <span className="bg-[#242424] text-[#9a9a9a] text-[11px] font-mono px-2 py-0.5 rounded-tight">
                {task.estimate}
              </span>
            </div>
          ))}
        </div>

        {/* Weekly Pace */}
        <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4">
          <h2 className="text-[#f0f0f0] text-[15px] font-semibold mb-4">Weekly Pace</h2>
          {PACE.map((item) => (
            <div key={item.label} className="mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-[#9a9a9a] text-[13px]">{item.label}</span>
                <span className="text-[#9a9a9a] text-[12px] font-mono">{item.current}/{item.target}</span>
              </div>
              <div className="bg-[#242424] h-[4px]">
                <div className="bg-[#638688] h-full" style={{ width: `${(item.current / item.target) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Due Reviews */}
      <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.06)] rounded-card p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[#f0f0f0] text-[15px] font-semibold">Due for Review</h2>
          <span className="bg-[rgba(239,68,68,0.12)] text-[#ef4444] text-[11px] font-medium px-2 py-0.5 rounded-tight">
            {DUE_REVIEWS.length} due
          </span>
        </div>
        {DUE_REVIEWS.map((r, i) => (
          <div key={r.id}>
            {i > 0 && <div className="h-[1px] bg-[rgba(255,255,255,0.04)] my-2" />}
            <div className="flex justify-between items-center py-1 hover:text-[#638688] cursor-pointer transition-colors">
              <span className="text-[#f0f0f0] text-[14px]">{r.name}</span>
              <span className="text-[#9a9a9a] text-[12px] font-mono">{r.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
