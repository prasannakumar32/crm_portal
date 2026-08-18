// @ts-nocheck
async function apiJson(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function loadMe() {
  try {
    const data = await apiJson("/api/auth/me");
    state.user = data.user;
    hydrateProfileFromUser();
    if (state.user) {
      const allowedLoggedInPages = ["dashboard", "timesheets", "timeoff", "work-schedules", "tasks"];
      if (!allowedLoggedInPages.includes(state.page)) {
        setPage("dashboard", false);
        return;
      }
    } else if (state.page === "dashboard" || state.page === "timesheets" || state.page === "timeoff" || state.page === "work-schedules" || state.page === "tasks") {
      setPage("login", false);
      return;
    }
  } catch {
    state.error = "Unable to verify your session.";
  }
}

async function loadToday() {
  const data = await apiJson("/api/attendance/today");
  state.status = data.status;
  state.todayEvents = data.today;
  updateDashboardValues();
}

function normalizeDashboardPeriod(period) {
  const value = `${period || "day"}`.trim().toLowerCase();
  if (["week", "7d", "7"].includes(value)) return "week";
  if (["month", "30d", "30"].includes(value)) return "month";
  return "day";
}

function getDashboardDays(period) {
  const normalized = normalizeDashboardPeriod(period);
  if (normalized === "week") return 7;
  if (normalized === "month") return 30;
  return 1;
}

function aggregatePeriodHistory(historyData) {
  const totals = { workedSeconds: 0, breakSeconds: 0, breakCount: 0 };
  for (const day of historyData || []) {
    totals.workedSeconds += Number(day.workedSeconds || 0);
    totals.breakSeconds += Number(day.breakSeconds || 0);
    totals.breakCount += Number(day.breakCount || 0);
  }
  return totals;
}

async function loadHistory(period = state.dashboardPeriod) {
  const normalized = normalizeDashboardPeriod(period);
  const data = await apiJson(`/api/attendance/history?period=${normalized}`);
  state.historyData = data.days || [];
  state.dashboardPeriod = normalized;
  updateDashboardValues();
  renderHistory();
}

async function loadTask(id) {
  if (!id) return null;
  return apiJson(`/api/tasks/${id}`);
}

async function postTaskComment(taskId, message) {
  if (!taskId || !message) return null;
  return apiJson(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

async function postTaskAttachment(taskId, payload) {
  if (!taskId || !payload) return null;
  return apiJson(`/api/tasks/${taskId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function createProject(payload) {
  if (!payload) return null;
  return apiJson("/api/tasks/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function loadLeaves() {
  try {
    const data = await apiJson("/api/attendance/leaves");
    state.leaveData = data.leaves || [];
    return data;
  } catch (error) {
    console.log("Leaves API not available, using empty data");
    state.leaveData = [];
    return { leaves: [] };
  }
}

async function createLeave(payload) {
  if (!payload) return null;
  return apiJson("/api/attendance/leaves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function updateLeave(id, payload) {
  if (!id || !payload) return null;
  return apiJson(`/api/attendance/leaves/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function deleteLeave(id) {
  if (!id) return null;
  return apiJson(`/api/attendance/leaves/${id}`, {
    method: "DELETE",
  });
}
