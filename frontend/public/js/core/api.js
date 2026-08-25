// @ts-nocheck
async function apiJson(path, options = {}) {
  const url = apiUrl(path);
  const method = options.method || "GET";
  let res;

  try {
    res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
  } catch (error) {
    console.error("[API] Fetch failed", { method, path, url, error });
    throw error;
  }

  let data;
  try {
    data = await res.json();
  } catch (error) {
    console.error("[API] Invalid JSON response", { method, path, status: res.status, error });
    throw new Error(`Invalid response from ${path}`);
  }

  if (!res.ok) {
    console.error("[API] Request failed", { method, path, status: res.status, data });
    throw data;
  }
  return data;
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function loadMe() {
  try {
    const data = await apiJson("/api/auth/me");
    state.employee = data.employee || null;
    state.user = state.employee;
    hydrateProfileFromUser();
    if (state.user) {
      const allowedLoggedInPages = Object.keys(PAGE_DEFINITIONS);
      if (!allowedLoggedInPages.includes(state.page)) {
        setPage("dashboard", false);
        return;
      }
    } else if (Object.keys(PAGE_DEFINITIONS).includes(state.page)) {
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

  // Break allowance is temporarily disabled.
  // Re-enable later by restoring the relevant state and UI logic.
  // if (data.breakAllowance) {
  //   state.breakAllowance = data.breakAllowance;
  // }

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

async function loadPublicHolidays(country = state.holidayCountry, year = state.holidayYear) {
  state.holidayLoading = true;
  try {
    const data = await apiJson(`/api/holidays?country=${encodeURIComponent(country)}&year=${year}`);
    state.holidayCountry = data.country;
    state.holidayYear = data.year;
    state.holidayData = data.holidays || [];
    state.holidaySource = data.source || "calendar";
    return data;
  } finally {
    state.holidayLoading = false;
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

async function createEmployee(payload) {
  if (!payload) return null;
  return apiJson("/api/auth/create-employee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function loadEmployees() {
  try {
    const data = await apiJson("/api/tasks/employees");
    state.employees = data.employees || [];
    state.users = state.employees;
    return { employees: state.employees };
  } catch (error) {
    console.log("Employees API not available, using empty data");
    state.employees = [];
    state.users = [];
    return { employees: [] };
  }
}

// Break allowance API is temporarily disabled.
// Re-enable this later when the business requirement comes back.
// async function updateEmployeeBreakAllowance(employeeId, dailyBreakAllowanceMinutes) {
//   if (!employeeId || dailyBreakAllowanceMinutes === undefined) return null;
//   return apiJson(`/api/auth/employees/${employeeId}/break-allowance`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ dailyBreakAllowanceMinutes }),
//   });
// }
