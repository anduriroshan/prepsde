/* ============================================
   PrepSDE — Application Logic
   ============================================ */

// ============================================
// PLAN DATA — Your 24-week preparation plan
// ============================================
const PLAN_DATA = {
  phases: [
    {
      id: 1,
      name: "Foundation Reset",
      weeks: [1, 2, 3, 4, 5, 6],
      color: "phase-1"
    },
    {
      id: 2,
      name: "Pattern Building",
      weeks: [7, 8, 9, 10, 11, 12],
      color: "phase-2"
    },
    {
      id: 3,
      name: "Advanced + AI Focus",
      weeks: [13, 14, 15, 16, 17, 18],
      color: "phase-3"
    },
    {
      id: 4,
      name: "Interview Simulation",
      weeks: [19, 20, 21, 22, 23, 24],
      color: "phase-4"
    }
  ],
  weeklyTasks: {
    1: {
      dsa: [
        "Solve NeetCode 150 — Arrays & Hashing (9 problems)",
        "Watch NeetCode's roadmap video to understand the method",
        "Spend max 20 min thinking per problem, then watch solution"
      ],
      systemDesign: [
        "Read System Design Primer: How to approach a system design question",
        "Read: Performance vs Scalability, Latency vs Throughput"
      ],
      behavioral: [
        "Write your first 2 STAR stories from work experience"
      ]
    },
    2: {
      dsa: [
        "Solve NeetCode 150 — Two Pointers section (5 problems)",
        "Re-solve Day 3 review problems from Week 1",
        "Start your pattern notebook: Pattern → When to use → Template"
      ],
      systemDesign: [
        "Read System Design Primer: CAP Theorem",
        "Read: DNS, CDN, Load Balancer basics"
      ],
      behavioral: [
        "Write 1 more STAR story: a time you disagreed with your team"
      ]
    },
    3: {
      dsa: [
        "Solve NeetCode 150 — Sliding Window (6 problems)",
        "Review all Week 1 problems (Day 15 review)",
        "Add sliding window template to pattern notebook"
      ],
      systemDesign: [
        "Watch Gaurav Sen: System Design Basics (first 5 videos)",
        "Read: Reverse Proxy, Application Layer"
      ],
      behavioral: [
        "Write 1 STAR story: a time you led a technical decision"
      ]
    },
    4: {
      dsa: [
        "Solve NeetCode 150 — Stack (7 problems)",
        "Re-solve any problems you struggled with in weeks 1-3"
      ],
      systemDesign: [
        "Read System Design Primer: Database section (RDBMS vs NoSQL)",
        "Watch Gaurav Sen: remaining 5 videos from basics playlist"
      ],
      behavioral: [
        "Write 1 STAR story: learning something new quickly"
      ]
    },
    5: {
      dsa: [
        "Solve NeetCode 150 — Binary Search (7 problems)",
        "Practice: solve 1 problem per day timed (25 min max)"
      ],
      systemDesign: [
        "Read System Design Primer: Caching, Asynchronism",
        "Make Anki flashcards for all concepts covered so far"
      ],
      behavioral: [
        "Write 1 STAR story: delivering under pressure"
      ]
    },
    6: {
      dsa: [
        "Solve NeetCode 150 — Linked List (11 problems)",
        "Start NeetCode 150 — Trees (first 8 problems)",
        "Milestone check: should have ~60 problems done"
      ],
      systemDesign: [
        "Read System Design Primer: Communication protocols",
        "Review and quiz yourself on all flashcards"
      ],
      behavioral: [
        "Review all 5 STAR stories, practice saying them out loud"
      ]
    },
    7: {
      dsa: [
        "Complete NeetCode 150 — Trees (remaining 7 problems)",
        "Solve NeetCode 150 — Heap/Priority Queue (7 problems)"
      ],
      systemDesign: [
        "Design a URL Shortener (TinyURL) — full 45 min practice",
        "Watch ByteByteGo: URL Shortener design video"
      ],
      lld: [
        "Study SOLID Principles with real examples",
        "Design: Parking Lot System (class diagrams + code)"
      ]
    },
    8: {
      dsa: [
        "Start NeetCode 150 — Graphs (first 7 problems, BFS/DFS)",
        "Learn Union-Find (Disjoint Set) — solve 3 problems"
      ],
      systemDesign: [
        "Design a Rate Limiter — full 45 min practice",
        "Read Alex Xu Chapter on Rate Limiter"
      ],
      lld: [
        "Learn Factory, Strategy, Observer patterns",
        "Design: Library Management System"
      ]
    },
    9: {
      dsa: [
        "Complete NeetCode 150 — Graphs (remaining 6 problems)",
        "Watch NeetCode's DP playlist — understand the patterns first"
      ],
      systemDesign: [
        "Design a Chat System (WhatsApp) — full 45 min practice",
        "Study WebSocket, long polling, message queues"
      ],
      lld: [
        "Design: Elevator System"
      ],
      ai: [
        "Read Chip Huyen — Designing ML Systems, Chapters 1-2",
        "Write up how your Accenture RAG system works (interview prep)"
      ]
    },
    10: {
      dsa: [
        "NeetCode 150 — 1-D DP (10 problems)",
        "Master patterns: Fibonacci-style, Climbing Stairs, House Robber"
      ],
      systemDesign: [
        "Design a News Feed (Twitter/Instagram) — full 45 min",
        "Study fan-out, pull vs push models"
      ],
      lld: [
        "Design: Snake & Ladder Game"
      ],
      ai: [
        "Read Chip Huyen Chapters 3-4",
        "Study & whiteboard the LLM production architecture diagram"
      ]
    },
    11: {
      dsa: [
        "NeetCode 150 — 2-D DP (8 problems)",
        "Key patterns: Knapsack, LCS, LIS, Matrix chain"
      ],
      systemDesign: [
        "Design a Notification System — full 45 min practice",
        "Study push notification infrastructure"
      ],
      lld: [
        "Design: Splitwise (expense sharing)"
      ],
      ai: [
        "Read Eugene Yan — Patterns for Building LLM-based Systems",
        "Study multi-tenant vector store architecture"
      ]
    },
    12: {
      dsa: [
        "NeetCode 150 — Backtracking (9 problems)",
        "NeetCode 150 — Tries (3 problems)",
        "Milestone: ~130/150 NeetCode problems should be done"
      ],
      systemDesign: [
        "Design a Search Autocomplete — full 45 min practice",
        "Study Trie-based search, ranking algorithms"
      ],
      lld: [
        "Design: Online Book Reader"
      ],
      ai: [
        "Read Chip Huyen — Building LLM Apps for Production",
        "Study agentic design patterns: ReAct, Plan-then-Execute"
      ]
    },
    13: {
      dsa: [
        "NeetCode 150 — Intervals (6 problems)",
        "NeetCode 150 — Greedy (8 problems)",
        "Start LeetCode weekly contests (Saturday/Sunday)"
      ],
      ai: [
        "Deep dive: Multi-tenant vector store pipeline design",
        "Study Pinecone namespaces, Milvus partitions, Weaviate tenants",
        "Build a small multi-tenant RAG demo with FastAPI"
      ],
      mlops: [
        "Start Made With ML course — first 3 modules",
        "Set up MLflow locally and track an experiment"
      ]
    },
    14: {
      dsa: [
        "Complete remaining NeetCode 150 problems",
        "Revisit all problems you couldn't solve independently",
        "Practice: 2 medium problems daily in under 30 min"
      ],
      ai: [
        "Deep dive: Agentic AI system safety and security",
        "Study prompt injection defenses, tool authorization",
        "Design: Multi-agent orchestration system (whiteboard practice)"
      ],
      mlops: [
        "Made With ML — continue modules",
        "Study model serving: BentoML, vLLM, TF Serving"
      ]
    },
    15: {
      dsa: [
        "LeetCode contest + review solutions",
        "Practice: 2 medium problems daily, focus on speed",
        "Learn Monotonic Stack pattern (3 problems)"
      ],
      ai: [
        "Deep dive: LLM Gateway pattern, semantic caching",
        "Study LLM evaluation pipelines: RAGAS, DeepEval",
        "Design: AI code review system (practice whiteboard)"
      ],
      mlops: [
        "Made With ML — complete remaining modules",
        "Study data drift detection with Evidently AI"
      ]
    },
    16: {
      dsa: [
        "LeetCode contest + review",
        "Practice: 2 mediums + 1 hard daily",
        "Focus on any weak pattern areas"
      ],
      ai: [
        "Deep dive: Agent memory design & data isolation",
        "Study observability: LangSmith, Langfuse, Phoenix",
        "Design: Enterprise search RAG pipeline (whiteboard)"
      ],
      mlops: [
        "Start Full Stack Deep Learning course",
        "Study CI/CD for ML pipelines"
      ]
    },
    17: {
      dsa: [
        "LeetCode contest + review",
        "Re-solve any NeetCode 150 problems marked difficult",
        "Practice explaining solutions out loud (mock interview prep)"
      ],
      ai: [
        "Deep dive: Cost optimization — model routing strategies",
        "Study fine-tuning workflows and evaluation",
        "Design: Multi-model LLM gateway (whiteboard)"
      ],
      mlops: [
        "Full Stack Deep Learning — continue",
        "Study Kubernetes basics for ML workloads"
      ]
    },
    18: {
      dsa: [
        "LeetCode contest + review",
        "Full NeetCode 150 review — ensure all problems are fresh",
        "Time yourself on random mediums (target: 25 min)"
      ],
      ai: [
        "Practice all AI system design questions from micro1 interview",
        "Design: End-to-end production AI platform",
        "Prepare AI system design stories from Accenture work"
      ],
      mlops: [
        "Complete Full Stack Deep Learning",
        "Build: LLM evaluation pipeline with RAGAS metrics"
      ]
    },
    19: {
      dsa: [
        "3 timed mock DSA interviews (Pramp or interviewing.io)",
        "Practice 45 min format: clarify → code → test → optimize"
      ],
      systemDesign: [
        "2 mock system design interviews",
        "Practice: Design YouTube — talk for 35-40 min straight"
      ],
      ai: [
        "1 AI system design mock interview",
        "Practice: Design a RAG pipeline for enterprise search"
      ],
      behavioral: [
        "Memorize Amazon Leadership Principles",
        "Practice 3 behavioral questions out loud"
      ]
    },
    20: {
      dsa: [
        "3 timed mock DSA interviews",
        "Review and fix weak areas identified in mocks"
      ],
      systemDesign: [
        "Design Google Drive — full 40 min practice",
        "Design a Ride-Sharing App — full 40 min practice"
      ],
      ai: [
        "Design: AI-powered customer support system",
        "Start applying to practice-tier companies"
      ],
      behavioral: [
        "Practice 3 more behavioral questions",
        "Record yourself and review"
      ]
    },
    21: {
      dsa: [
        "3 timed mock interviews",
        "Focus on hard problems — at least 2 hards per session"
      ],
      systemDesign: [
        "Design a Web Crawler — full practice",
        "Design a Key-Value Store — full practice"
      ],
      ai: [
        "Mock: Design a multi-tenant AI platform",
        "Review all AI system design notes"
      ],
      behavioral: [
        "Full behavioral mock interview (6 questions, 45 min)",
        "Refine STAR stories based on feedback"
      ]
    },
    22: {
      dsa: [
        "3 timed mock interviews",
        "Company-specific practice (LeetCode tagged questions)"
      ],
      systemDesign: [
        "Design a Typeahead Suggestion System",
        "Design a Social Media Feed"
      ],
      ai: [
        "Apply to target-tier companies (Microsoft, Meta, Uber)"
      ],
      behavioral: [
        "Practice Google-style behavioral questions",
        "Practice Amazon LP-style questions"
      ]
    },
    23: {
      dsa: [
        "Daily mock interviews — simulate real interview conditions",
        "Review all NeetCode 150 one final time"
      ],
      systemDesign: [
        "Full system design loop: random topic, 45 min, no prep",
        "Apply to reach-tier companies (Amazon, Google)"
      ],
      behavioral: [
        "Final behavioral prep — ensure 15+ stories are polished"
      ]
    },
    24: {
      dsa: [
        "Light practice — maintain skills, don't burn out",
        "Review pattern notebook one final time"
      ],
      systemDesign: [
        "Quick review of all designed systems",
        "Practice explaining trade-offs concisely"
      ],
      behavioral: [
        "Final review of all stories",
        "Prepare questions to ask interviewers"
      ],
      ai: [
        "Final review of all AI system design patterns",
        "Prepare your Accenture project deep-dive narrative"
      ]
    }
  }
};

// Pattern names for tracking
const PATTERN_NAMES = {
  "arrays": "Arrays & Hashing",
  "two-pointers": "Two Pointers",
  "sliding-window": "Sliding Window",
  "stack": "Stack",
  "binary-search": "Binary Search",
  "linked-list": "Linked List",
  "trees": "Trees",
  "tries": "Tries",
  "heap": "Heap / PQ",
  "backtracking": "Backtracking",
  "graphs": "Graphs",
  "dp": "Dynamic Programming",
  "greedy": "Greedy",
  "intervals": "Intervals",
  "math": "Math & Geometry",
  "bit": "Bit Manipulation",
  "strings": "Strings"
};

// ============================================
// STATE MANAGEMENT
// ============================================
const STATE_KEYS = {
  SETTINGS: 'sde2_settings',
  PROBLEMS: 'sde2_problems',
  REFLECTIONS: 'sde2_reflections',
  DAILY_TASKS: 'sde2_daily_tasks',
  EMAIL_CONFIG: 'sde2_email_config',
  AI_CONFIG: 'sde2_ai_config'
};

function loadState(key, fallback = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveState(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getSettings() {
  return loadState(STATE_KEYS.SETTINGS, {
    name: 'Roshan',
    startDate: '2026-06-16',
    endDate: '2026-12-15'
  });
}

function getProblems() {
  return loadState(STATE_KEYS.PROBLEMS, []);
}

function getReflections() {
  return loadState(STATE_KEYS.REFLECTIONS, []);
}

function getDailyTasks() {
  return loadState(STATE_KEYS.DAILY_TASKS, {});
}

function getEmailConfig() {
  return loadState(STATE_KEYS.EMAIL_CONFIG, {
    email: '',
    serviceId: '',
    templateId: '',
    publicKey: ''
  });
}

function getAIConfig() {
  return loadState(STATE_KEYS.AI_CONFIG, { geminiKey: '' });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getToday() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getCurrentWeek() {
  const settings = getSettings();
  const today = getToday();
  const daysSinceStart = daysBetween(settings.startDate, today);
  if (daysSinceStart < 0) return 0;
  return Math.min(Math.floor(daysSinceStart / 7) + 1, 24);
}

function getCurrentPhase() {
  const week = getCurrentWeek();
  if (week <= 0) return null;
  return PLAN_DATA.phases.find(p => p.weeks.includes(week)) || PLAN_DATA.phases[0];
}

function getDayNumber() {
  const settings = getSettings();
  return Math.max(0, daysBetween(settings.startDate, getToday()) + 1);
}

function getDaysRemaining() {
  const settings = getSettings();
  return Math.max(0, daysBetween(getToday(), settings.endDate));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function calculateStreak() {
  const reflections = getReflections();
  const dailyTasks = getDailyTasks();
  if (reflections.length === 0 && Object.keys(dailyTasks).length === 0) return 0;

  let streak = 0;
  let checkDate = getToday();

  // Check if today has any activity
  const todayHasActivity = dailyTasks[checkDate] || reflections.find(r => r.date === checkDate);
  if (!todayHasActivity) {
    checkDate = addDays(checkDate, -1);
  }

  while (true) {
    const hasActivity = dailyTasks[checkDate] || reflections.find(r => r.date === checkDate);
    if (hasActivity) {
      streak++;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
  }

  return streak;
}

function showToast(message, icon = '✅') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  toastMsg.textContent = message;
  toastIcon.textContent = icon;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}


// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
  // Desktop sidebar nav
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.dataset.view;
      switchView(viewId);
    });
  });

  // Mobile bottom nav
  const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
  mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.dataset.view;
      switchView(viewId);
    });
  });
}

function switchView(viewId) {
  // Update desktop nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  // Update mobile nav buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  // Activate both
  document.querySelectorAll(`[data-view="${viewId}"]`).forEach(b => b.classList.add('active'));

  // Update views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const activeView = document.getElementById(`view-${viewId}`);
  if (activeView) activeView.classList.add('active');

  // Scroll to top on view switch
  window.scrollTo(0, 0);

  // Render view-specific content
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'dsa') renderDSATracker();
  if (viewId === 'reflections') renderReflections();
  if (viewId === 'progress') renderProgress();
  if (viewId === 'settings') loadSettings();
}


// ============================================
// DASHBOARD
// ============================================
function renderDashboard() {
  const settings = getSettings();
  const streak = calculateStreak();
  const problems = getProblems();
  const week = getCurrentWeek();
  const phase = getCurrentPhase();

  // Greeting
  document.getElementById('greeting').textContent = `${getGreeting()}, ${settings.name}`;
  document.getElementById('date-display').textContent = formatDate(getToday());

  // Phase banner
  if (phase) {
    document.getElementById('phase-badge').textContent = `Phase ${phase.id}`;
    document.getElementById('phase-name').textContent = phase.name;
    document.getElementById('week-number').textContent = `Week ${week}`;
    const progress = ((week - phase.weeks[0]) / phase.weeks.length) * 100;
    document.getElementById('phase-progress-fill').style.width = `${Math.min(100, progress)}%`;
  }

  // Stats
  document.getElementById('stat-streak').textContent = streak;
  document.getElementById('stat-problems').textContent = problems.length;
  document.getElementById('stat-days-left').textContent = getDaysRemaining();

  // Reviews due today
  const reviewsDue = getReviewsDueToday();
  document.getElementById('stat-reviews-due').textContent = reviewsDue.length;

  // Streak sidebar
  document.getElementById('streak-sidebar-count').textContent = streak;

  // Render today's tasks
  renderTodaysTasks(week);

  // Reflection status
  const todayReflection = getReflections().find(r => r.date === getToday());
  const reflectionStatus = document.getElementById('reflection-status');
  if (todayReflection) {
    reflectionStatus.textContent = '✅ Done!';
    reflectionStatus.style.color = 'var(--accent-emerald)';
    // Pre-fill the form
    document.getElementById('reflection-accomplished').value = todayReflection.accomplished || '';
    document.getElementById('reflection-struggle').value = todayReflection.struggle || '';
    document.getElementById('reflection-tomorrow').value = todayReflection.tomorrow || '';
    updateRatingStars(todayReflection.rating || 0);
  } else {
    reflectionStatus.textContent = 'Not done yet';
    reflectionStatus.style.color = '';
  }
}

function renderTodaysTasks(week) {
  const container = document.getElementById('tasks-container');
  const dailyTasks = getDailyTasks();
  const today = getToday();
  const todayData = dailyTasks[today] || { completed: {} };

  if (week <= 0 || week > 24) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📅</span>
        <p>Your preparation hasn't started yet! Adjust your start date in Settings.</p>
      </div>`;
    document.getElementById('task-completion').textContent = '';
    return;
  }

  const weekTasks = PLAN_DATA.weeklyTasks[week] || {};
  const categories = {
    dsa: { label: 'DSA', icon: 'dsa' },
    systemDesign: { label: 'System Design', icon: 'sd' },
    lld: { label: 'Low-Level Design', icon: 'lld' },
    ai: { label: 'AI/ML System Design', icon: 'ai' },
    mlops: { label: 'MLOps / LLMOps', icon: 'mlops' },
    behavioral: { label: 'Behavioral', icon: 'behavioral' }
  };

  let html = '';
  let totalTasks = 0;
  let completedTasks = 0;

  for (const [catKey, catInfo] of Object.entries(categories)) {
    const tasks = weekTasks[catKey];
    if (!tasks || tasks.length === 0) continue;

    html += `<div class="task-category">
      <div class="task-category-header">
        <span class="category-dot ${catInfo.icon}"></span>
        ${catInfo.label}
      </div>`;

    tasks.forEach((task, idx) => {
      const taskId = `${catKey}-${idx}`;
      const isCompleted = todayData.completed[taskId] === true;
      if (isCompleted) completedTasks++;
      totalTasks++;

      html += `<div class="task-item ${isCompleted ? 'completed' : ''}" data-task-id="${taskId}">
        <div class="task-checkbox">${isCompleted ? '✓' : ''}</div>
        <span class="task-text">${task}</span>
      </div>`;
    });

    html += '</div>';
  }

  // Add review-due tasks
  const reviewsDue = getReviewsDueToday();
  if (reviewsDue.length > 0) {
    html += `<div class="task-category">
      <div class="task-category-header">
        <span class="category-dot dsa"></span>
        Spaced Repetition Reviews (3-7-15 Rule)
      </div>`;
    reviewsDue.forEach(p => {
      const taskId = `review-${p.id}`;
      const isCompleted = todayData.completed[taskId] === true;
      if (isCompleted) completedTasks++;
      totalTasks++;

      html += `<div class="task-item ${isCompleted ? 'completed' : ''}" data-task-id="${taskId}">
        <div class="task-checkbox">${isCompleted ? '✓' : ''}</div>
        <span class="task-text">🔁 Review: ${p.name} (${p.difficulty})</span>
        <span class="task-time">${p.reviewType}</span>
      </div>`;
    });
    html += '</div>';
  }

  container.innerHTML = html;
  document.getElementById('task-completion').textContent = `${completedTasks}/${totalTasks}`;

  // Add click handlers
  container.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', () => {
      const taskId = item.dataset.taskId;
      toggleTask(taskId);
    });
  });
}

function toggleTask(taskId) {
  const today = getToday();
  const dailyTasks = getDailyTasks();
  if (!dailyTasks[today]) {
    dailyTasks[today] = { completed: {} };
  }
  dailyTasks[today].completed[taskId] = !dailyTasks[today].completed[taskId];
  saveState(STATE_KEYS.DAILY_TASKS, dailyTasks);
  renderDashboard();
}

function getReviewsDueToday() {
  const problems = getProblems();
  const today = getToday();
  const due = [];

  problems.forEach(p => {
    const daysSinceSolved = daysBetween(p.dateSolved, today);
    let reviewType = null;

    // 3-7-15 rule
    if (daysSinceSolved === 3 && !p.reviews?.day3) {
      reviewType = 'Day 3';
    } else if (daysSinceSolved === 7 && !p.reviews?.day7) {
      reviewType = 'Day 7';
    } else if (daysSinceSolved === 15 && !p.reviews?.day15) {
      reviewType = 'Day 15';
    }

    if (reviewType) {
      due.push({ ...p, reviewType });
    }
  });

  return due;
}


// ============================================
// DSA TRACKER
// ============================================
function renderDSATracker() {
  const problems = getProblems();
  const reviewsDue = getReviewsDueToday();
  const currentFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

  // Review alert
  const reviewAlert = document.getElementById('review-alert');
  const reviewDueList = document.getElementById('review-due-list');
  if (reviewsDue.length > 0) {
    reviewAlert.style.display = 'block';
    reviewDueList.innerHTML = reviewsDue.map(p => `
      <div class="task-item" style="margin-bottom: 6px;">
        <span class="task-text">🔁 <strong>${p.name}</strong> — ${p.reviewType} review</span>
        <button class="action-btn review-btn" data-problem-id="${p.id}" data-review-type="${p.reviewType}">
          Mark Reviewed
        </button>
      </div>
    `).join('');

    reviewDueList.querySelectorAll('.review-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        markReviewed(btn.dataset.problemId, btn.dataset.reviewType);
      });
    });
  } else {
    reviewAlert.style.display = 'none';
  }

  // Filter problems
  let filtered = problems;
  if (currentFilter === 'review') {
    filtered = reviewsDue;
  } else if (currentFilter !== 'all') {
    filtered = problems.filter(p => p.pattern === currentFilter);
  }

  // Problems list
  const problemsList = document.getElementById('problems-list');
  const emptyState = document.getElementById('empty-problems');
  const problemsTable = document.querySelector('.problems-table');

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    problemsTable.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    problemsTable.style.display = 'block';

    problemsList.innerHTML = filtered.map(p => {
      const nextReview = getNextReviewDate(p);
      const nextReviewText = nextReview ? `${formatDateShort(nextReview.date)} (${nextReview.type})` : 'Done ✅';
      const reviewStatus = nextReview
        ? (daysBetween(getToday(), nextReview.date) <= 0 ? 'due' : 'upcoming')
        : 'done';

      return `<div class="problem-row">
        <span class="problem-name">
          ${p.link ? `<a href="${p.link}" target="_blank" rel="noopener">${p.name}</a>` : p.name}
        </span>
        <span><span class="diff-badge ${p.difficulty}">${p.difficulty}</span></span>
        <span class="pattern-badge">${PATTERN_NAMES[p.pattern] || p.pattern}</span>
        <span>${formatDateShort(p.dateSolved)}</span>
        <span class="review-status ${reviewStatus}">${nextReviewText}</span>
        <span class="problem-actions">
          <button class="action-btn delete-btn" data-id="${p.id}" title="Delete">🗑</button>
        </span>
      </div>`;
    }).join('');

    problemsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteProblem(btn.dataset.id));
    });
  }
}

function getNextReviewDate(problem) {
  const reviews = problem.reviews || {};
  if (!reviews.day3) return { date: addDays(problem.dateSolved, 3), type: 'Day 3' };
  if (!reviews.day7) return { date: addDays(problem.dateSolved, 7), type: 'Day 7' };
  if (!reviews.day15) return { date: addDays(problem.dateSolved, 15), type: 'Day 15' };
  return null;
}

function markReviewed(problemId, reviewType) {
  const problems = getProblems();
  const problem = problems.find(p => p.id === problemId);
  if (!problem) return;

  if (!problem.reviews) problem.reviews = {};
  if (reviewType === 'Day 3') problem.reviews.day3 = getToday();
  if (reviewType === 'Day 7') problem.reviews.day7 = getToday();
  if (reviewType === 'Day 15') problem.reviews.day15 = getToday();

  saveState(STATE_KEYS.PROBLEMS, problems);
  showToast(`${problem.name} — ${reviewType} review done!`);
  renderDSATracker();
  renderDashboard();
}

function addProblem() {
  const name = document.getElementById('problem-name').value.trim();
  if (!name) {
    showToast('Please enter a problem name', '⚠️');
    return;
  }

  const problem = {
    id: generateId(),
    name: name,
    link: document.getElementById('problem-link').value.trim(),
    difficulty: document.getElementById('problem-difficulty').value,
    pattern: document.getElementById('problem-pattern').value,
    solvedIndependently: document.querySelector('input[name="solved-independently"]:checked').value,
    notes: document.getElementById('problem-notes').value.trim(),
    dateSolved: getToday(),
    reviews: {}
  };

  const problems = getProblems();
  problems.unshift(problem);
  saveState(STATE_KEYS.PROBLEMS, problems);

  // Mark today as having activity
  const dailyTasks = getDailyTasks();
  if (!dailyTasks[getToday()]) dailyTasks[getToday()] = { completed: {} };
  dailyTasks[getToday()].problemSolved = true;
  saveState(STATE_KEYS.DAILY_TASKS, dailyTasks);

  // Close modal & clear form
  closeModal();
  document.getElementById('problem-name').value = '';
  document.getElementById('problem-link').value = '';
  document.getElementById('problem-notes').value = '';

  showToast(`${name} added! Next review: ${formatDateShort(addDays(getToday(), 3))}`);
  renderDSATracker();
  renderDashboard();
}

function deleteProblem(id) {
  if (!confirm('Delete this problem?')) return;
  let problems = getProblems();
  problems = problems.filter(p => p.id !== id);
  saveState(STATE_KEYS.PROBLEMS, problems);
  showToast('Problem deleted', '🗑');
  renderDSATracker();
}


// ============================================
// REFLECTIONS
// ============================================
function renderReflections() {
  const reflections = getReflections();
  const container = document.getElementById('reflections-timeline');
  const emptyState = document.getElementById('empty-reflections');

  if (reflections.length === 0) {
    emptyState.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(emptyState);
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = reflections.map(r => `
    <div class="reflection-card">
      <div class="reflection-card-header">
        <span class="reflection-date">${formatDate(r.date)} — Day ${r.dayNumber || '?'}</span>
        <span class="reflection-rating-display">${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}</span>
      </div>
      <div class="reflection-body">
        ${r.accomplished ? `<p><strong>Accomplished:</strong> ${escapeHtml(r.accomplished)}</p>` : ''}
        ${r.struggle ? `<p><strong>Struggled with:</strong> ${escapeHtml(r.struggle)}</p>` : ''}
        ${r.tomorrow ? `<p><strong>Tomorrow's focus:</strong> ${escapeHtml(r.tomorrow)}</p>` : ''}
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function saveReflection() {
  const accomplished = document.getElementById('reflection-accomplished').value.trim();
  const struggle = document.getElementById('reflection-struggle').value.trim();
  const tomorrow = document.getElementById('reflection-tomorrow').value.trim();
  const rating = currentRating;

  if (!accomplished && !struggle && !tomorrow) {
    showToast('Write at least one reflection!', '⚠️');
    return;
  }

  const reflections = getReflections();
  const today = getToday();

  // Update or add
  const existingIdx = reflections.findIndex(r => r.date === today);
  const reflection = {
    date: today,
    dayNumber: getDayNumber(),
    accomplished,
    struggle,
    tomorrow,
    rating
  };

  if (existingIdx >= 0) {
    reflections[existingIdx] = reflection;
  } else {
    reflections.unshift(reflection);
  }

  saveState(STATE_KEYS.REFLECTIONS, reflections);

  // Mark today as active
  const dailyTasks = getDailyTasks();
  if (!dailyTasks[today]) dailyTasks[today] = { completed: {} };
  dailyTasks[today].reflectionDone = true;
  saveState(STATE_KEYS.DAILY_TASKS, dailyTasks);

  showToast('Reflection saved! Day marked as complete. 🔥');
  renderDashboard();

  // Trigger AI analysis
  analyzeReflectionWithAI(reflection);
}

let currentRating = 0;

function initRatingStars() {
  const stars = document.querySelectorAll('#rating-stars .star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      currentRating = parseInt(star.dataset.rating);
      updateRatingStars(currentRating);
    });
    star.addEventListener('mouseenter', () => {
      updateRatingStars(parseInt(star.dataset.rating));
    });
  });

  document.getElementById('rating-stars').addEventListener('mouseleave', () => {
    updateRatingStars(currentRating);
  });
}

function updateRatingStars(rating) {
  const stars = document.querySelectorAll('#rating-stars .star');
  stars.forEach(star => {
    const val = parseInt(star.dataset.rating);
    star.classList.toggle('active', val <= rating);
  });
}


// ============================================
// AI COACH — GEMINI INTEGRATION
// ============================================
const GEMINI_MODEL = 'gemini-2.0-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function analyzeReflectionWithAI(reflection) {
  const aiConfig = getAIConfig();
  if (!aiConfig.geminiKey) {
    // No API key — skip silently
    return;
  }

  const coachCard = document.getElementById('ai-coach-card');
  const contentDiv = document.getElementById('ai-feedback-content');

  // Show loading state
  coachCard.style.display = 'block';
  contentDiv.innerHTML = `
    <div class="ai-loading">
      <div class="ai-loading-dots"><span></span><span></span><span></span></div>
      <span>Analyzing your reflection...</span>
    </div>`;

  // Scroll to AI card
  setTimeout(() => coachCard.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);

  const combinedText = [
    reflection.accomplished || '',
    reflection.struggle || '',
    reflection.tomorrow || ''
  ].join(' ').trim();

  const week = getCurrentWeek();
  const phase = getCurrentPhase();

  const prompt = `You are a strict but encouraging study coach for someone preparing for SDE2 interviews at Google/Amazon.
They are in Week ${week} (${phase ? phase.name : 'preparation'}) of a 24-week plan.

They submitted this daily reflection:
- What they accomplished: "${reflection.accomplished || '(empty)'}"
- What they struggled with: "${reflection.struggle || '(empty)'}"
- Tomorrow's focus: "${reflection.tomorrow || '(empty)'}"
- Self-rating: ${reflection.rating || 0}/5

Analyze if they ACTUALLY learned something meaningful today. Vague entries like "good", "did dsa", "ok", "studied", or single words mean they probably slacked off.

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "verdict": "productive" | "mediocre" | "lazy",
  "feedback": "Your honest 2-3 sentence coaching feedback. Be encouraging but real.",
  "microLesson": {
    "title": "A specific concept name (e.g., 'Sliding Window Pattern', 'CAP Theorem', 'Token Bucket Algorithm')",
    "category": "DSA" | "System Design" | "AI/ML",
    "content": "A clear 3-4 paragraph explanation teaching this concept. Include a simple example. Make it something they can learn in 5 minutes.",
    "practiceQuestion": "One concrete question to test their understanding of this concept."
  }
}

Rules for the microLesson:
- If verdict is "productive", teach something related to what they studied (go deeper)
- If verdict is "mediocre" or "lazy", teach a small foundational concept they should know
- Make it relevant to their current phase/week
- Keep it concise but actually educational`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${aiConfig.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('No response from Gemini');

    const result = JSON.parse(text);
    displayAIFeedback(result);

  } catch (err) {
    console.error('AI Coach error:', err);
    contentDiv.innerHTML = `
      <p style="color: var(--text-muted); font-size: 13px;">
        ⚠️ Couldn't analyze reflection: ${escapeHtml(err.message)}.
        Check your Gemini API key in Settings.
      </p>`;
  }
}

function displayAIFeedback(result) {
  const contentDiv = document.getElementById('ai-feedback-content');

  const verdictClass = result.verdict === 'productive' ? 'good'
    : result.verdict === 'mediocre' ? 'needs-work' : 'lazy';

  const verdictEmoji = result.verdict === 'productive' ? '✅'
    : result.verdict === 'mediocre' ? '⚠️' : '🚨';

  const verdictLabel = result.verdict === 'productive' ? 'Productive Day'
    : result.verdict === 'mediocre' ? 'Could Be Better' : 'You Slacked Off';

  let html = `
    <div class="ai-verdict ${verdictClass}">${verdictEmoji} ${verdictLabel}</div>
    <div class="ai-feedback-msg">${escapeHtml(result.feedback)}</div>`;

  if (result.microLesson) {
    const ml = result.microLesson;
    const lessonEmoji = ml.category === 'DSA' ? '💻'
      : ml.category === 'System Design' ? '🏗️' : '🤖';

    html += `
    <div class="micro-lesson">
      <div class="micro-lesson-header">
        <span class="micro-lesson-icon">${lessonEmoji}</span>
        <span class="micro-lesson-title">${escapeHtml(ml.title)}</span>
        <span class="micro-lesson-category">${escapeHtml(ml.category)}</span>
      </div>
      <div class="micro-lesson-content">${escapeHtml(ml.content)}</div>
      ${ml.practiceQuestion ? `
      <div class="micro-lesson-question">
        <strong>🧠 Quick Check</strong>
        ${escapeHtml(ml.practiceQuestion)}
      </div>` : ''}
    </div>`;
  }

  contentDiv.innerHTML = html;
}


// ============================================
// PROGRESS VIEW
// ============================================
function renderProgress() {
  const problems = getProblems();

  // NeetCode 150 progress
  const count = problems.length;
  document.getElementById('neetcode-fraction').textContent = `${count}/150`;
  document.getElementById('neetcode-progress').style.width = `${Math.min(100, (count / 150) * 100)}%`;

  // Pattern grid
  const patternCounts = {};
  Object.keys(PATTERN_NAMES).forEach(k => patternCounts[k] = 0);
  problems.forEach(p => {
    if (patternCounts[p.pattern] !== undefined) patternCounts[p.pattern]++;
  });

  const patternGrid = document.getElementById('pattern-grid');
  patternGrid.innerHTML = Object.entries(PATTERN_NAMES).map(([key, name]) => `
    <div class="pattern-card">
      <div class="pattern-card-name">${name}</div>
      <div class="pattern-card-count">${patternCounts[key]}</div>
    </div>
  `).join('');

  // Activity calendar (last 26 weeks = 182 days)
  const calendarGrid = document.getElementById('calendar-grid');
  const dailyTasks = getDailyTasks();
  const today = getToday();
  let calendarHtml = '';

  for (let i = 181; i >= 0; i--) {
    const date = addDays(today, -i);
    const dayData = dailyTasks[date];
    let level = 0;
    if (dayData) {
      const completedCount = Object.values(dayData.completed || {}).filter(Boolean).length;
      if (completedCount >= 5 || dayData.reflectionDone) level = 3;
      else if (completedCount >= 3) level = 2;
      else if (completedCount >= 1 || dayData.problemSolved) level = 1;
    }
    const isToday = date === today;
    calendarHtml += `<div class="calendar-cell level-${level} ${isToday ? 'today' : ''}" title="${formatDateShort(date)}${level > 0 ? ' — Active' : ''}"></div>`;
  }
  calendarGrid.innerHTML = calendarHtml;

  // Phase breakdown
  const phasesBreakdown = document.getElementById('phases-breakdown');
  const currentWeek = getCurrentWeek();
  phasesBreakdown.innerHTML = PLAN_DATA.phases.map(phase => {
    let progress = 0;
    if (currentWeek > phase.weeks[phase.weeks.length - 1]) {
      progress = 100;
    } else if (currentWeek >= phase.weeks[0]) {
      progress = ((currentWeek - phase.weeks[0]) / phase.weeks.length) * 100;
    }
    return `
      <div class="phase-row">
        <span class="phase-row-badge ${phase.color}">Phase ${phase.id}</span>
        <span class="phase-row-name">${phase.name}</span>
        <div class="phase-row-bar">
          <div class="phase-row-fill ${phase.color}" style="width: ${progress}%"></div>
        </div>
        <span class="phase-row-percent">${Math.round(progress)}%</span>
      </div>
    `;
  }).join('');
}


// ============================================
// SETTINGS
// ============================================
function loadSettings() {
  const settings = getSettings();
  const emailConfig = getEmailConfig();
  const aiConfig = getAIConfig();

  document.getElementById('setting-name').value = settings.name || 'Roshan';
  document.getElementById('setting-start-date').value = settings.startDate || '2026-06-16';
  document.getElementById('setting-end-date').value = settings.endDate || '2026-12-15';

  document.getElementById('setting-gemini-key').value = aiConfig.geminiKey || '';

  document.getElementById('setting-email').value = emailConfig.email || '';
  document.getElementById('setting-emailjs-service').value = emailConfig.serviceId || '';
  document.getElementById('setting-emailjs-template').value = emailConfig.templateId || '';
  document.getElementById('setting-emailjs-key').value = emailConfig.publicKey || '';
}

function saveSettings() {
  const settings = {
    name: document.getElementById('setting-name').value.trim() || 'Roshan',
    startDate: document.getElementById('setting-start-date').value,
    endDate: document.getElementById('setting-end-date').value
  };
  saveState(STATE_KEYS.SETTINGS, settings);
  showToast('Settings saved!');
  renderDashboard();
}

function saveEmailSettings() {
  const config = {
    email: document.getElementById('setting-email').value.trim(),
    serviceId: document.getElementById('setting-emailjs-service').value.trim(),
    templateId: document.getElementById('setting-emailjs-template').value.trim(),
    publicKey: document.getElementById('setting-emailjs-key').value.trim()
  };
  saveState(STATE_KEYS.EMAIL_CONFIG, config);
  showToast('Email settings saved!');
}

function exportData() {
  const data = {
    settings: getSettings(),
    problems: getProblems(),
    reflections: getReflections(),
    dailyTasks: getDailyTasks(),
    emailConfig: getEmailConfig(),
    exportDate: getToday()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-prep-backup-${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.settings) saveState(STATE_KEYS.SETTINGS, data.settings);
      if (data.problems) saveState(STATE_KEYS.PROBLEMS, data.problems);
      if (data.reflections) saveState(STATE_KEYS.REFLECTIONS, data.reflections);
      if (data.dailyTasks) saveState(STATE_KEYS.DAILY_TASKS, data.dailyTasks);
      if (data.emailConfig) saveState(STATE_KEYS.EMAIL_CONFIG, data.emailConfig);
      showToast('Data imported successfully!');
      renderDashboard();
      loadSettings();
    } catch {
      showToast('Invalid file format', '❌');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('Are you sure? This will delete ALL your progress, problems, and reflections. This cannot be undone.')) return;
  if (!confirm('Really? Type OK to confirm.')) return;

  Object.values(STATE_KEYS).forEach(key => localStorage.removeItem(key));
  showToast('All data cleared', '🗑');
  renderDashboard();
  loadSettings();
}


// ============================================
// EMAIL
// ============================================
function sendTodaysEmail() {
  const config = getEmailConfig();
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    showToast('Set up EmailJS in Settings first!', '⚠️');
    switchView('settings');
    return;
  }

  const settings = getSettings();
  const week = getCurrentWeek();
  const phase = getCurrentPhase();
  const weekTasks = PLAN_DATA.weeklyTasks[week] || {};
  const reviewsDue = getReviewsDueToday();
  const streak = calculateStreak();

  // Build tasks string
  let tasksText = '';
  const categories = { dsa: 'DSA', systemDesign: 'System Design', lld: 'Low-Level Design', ai: 'AI/ML System Design', mlops: 'MLOps', behavioral: 'Behavioral' };

  for (const [key, label] of Object.entries(categories)) {
    if (weekTasks[key] && weekTasks[key].length > 0) {
      tasksText += `\n📌 ${label}:\n`;
      weekTasks[key].forEach(t => tasksText += `  • ${t}\n`);
    }
  }

  if (reviewsDue.length > 0) {
    tasksText += `\n🔁 Spaced Repetition Reviews:\n`;
    reviewsDue.forEach(r => tasksText += `  • ${r.name} (${r.reviewType})\n`);
  }

  const templateParams = {
    to_name: settings.name,
    to_email: config.email,
    tasks_today: tasksText,
    streak_count: streak,
    week_number: week,
    phase_name: phase ? phase.name : 'Not started',
    day_number: getDayNumber()
  };

  showToast('Sending email...', '📨');

  emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey)
    .then(() => showToast('Email sent to ' + config.email + '! 📬'))
    .catch(err => {
      console.error('Email error:', err);
      showToast('Failed to send email. Check EmailJS settings.', '❌');
    });
}

function sendTestEmail() {
  const config = getEmailConfig();
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    showToast('Fill in all EmailJS fields first!', '⚠️');
    return;
  }
  saveEmailSettings();
  sendTodaysEmail();
}


// ============================================
// MODAL
// ============================================
function openModal() {
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}


// ============================================
// FILTER BAR
// ============================================
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDSATracker();
    });
  });
}


// ============================================
// INITIALIZE
// ============================================
function init() {
  initNavigation();
  initRatingStars();
  initFilters();

  // Event listeners
  document.getElementById('btn-save-reflection').addEventListener('click', saveReflection);
  document.getElementById('btn-add-problem').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-problem').addEventListener('click', closeModal);
  document.getElementById('btn-save-problem').addEventListener('click', addProblem);
  document.getElementById('btn-send-email').addEventListener('click', sendTodaysEmail);
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('btn-save-email-settings').addEventListener('click', saveEmailSettings);
  document.getElementById('btn-test-email').addEventListener('click', sendTestEmail);
  document.getElementById('btn-export-data').addEventListener('click', exportData);
  document.getElementById('btn-clear-data').addEventListener('click', clearAllData);

  // AI settings
  document.getElementById('btn-save-ai-settings').addEventListener('click', () => {
    const key = document.getElementById('setting-gemini-key').value.trim();
    saveState(STATE_KEYS.AI_CONFIG, { geminiKey: key });
    showToast('AI Coach settings saved!');
  });

  document.getElementById('import-file-input').addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
  });

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // PWA install prompt
  initPWAInstall();

  // Initial render
  renderDashboard();

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    document.addEventListener('click', function askNotifPermission() {
      Notification.requestPermission();
      document.removeEventListener('click', askNotifPermission);
    }, { once: true });
  }

  // Set up daily reminder check
  checkDailyReminder();
}

function checkDailyReminder() {
  // Check every 30 minutes if it's 9 AM and user hasn't started today
  setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // 9:00 AM reminder
    if (hour === 9 && minute < 30) {
      const dailyTasks = getDailyTasks();
      const today = getToday();
      if (!dailyTasks[today]) {
        sendBrowserNotification('🎯 Time to prep!', 'Your daily interview prep tasks are waiting. Let\'s keep the streak alive! 🔥');
      }
    }

    // 9:00 PM reminder for reflection
    if (hour === 21 && minute < 30) {
      const reflections = getReflections();
      const todayReflection = reflections.find(r => r.date === getToday());
      if (!todayReflection) {
        sendBrowserNotification('📝 Don\'t forget your reflection!', 'End your day with a quick reflection to lock in what you learned.');
      }
    }
  }, 30 * 60 * 1000); // Check every 30 min
}

function sendBrowserNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🎯' });
  }
}


// ============================================
// PWA INSTALL PROMPT
// ============================================
let deferredInstallPrompt = null;

function initPWAInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;

    // Show install banner
    const banner = document.getElementById('install-banner');
    if (banner) banner.style.display = 'flex';
  });

  // Install button
  const installBtn = document.getElementById('btn-install');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const result = await deferredInstallPrompt.userChoice;
      if (result.outcome === 'accepted') {
        showToast('App installed! 🎉');
      }
      deferredInstallPrompt = null;
      document.getElementById('install-banner').style.display = 'none';
    });
  }

  // Dismiss button
  const dismissBtn = document.getElementById('btn-dismiss-install');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      document.getElementById('install-banner').style.display = 'none';
    });
  }

  // Detect if already installed
  window.addEventListener('appinstalled', () => {
    document.getElementById('install-banner').style.display = 'none';
    deferredInstallPrompt = null;
  });
}


// Start the app
document.addEventListener('DOMContentLoaded', init);
