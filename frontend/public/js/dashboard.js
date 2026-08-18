// @ts-nocheck
// ============================================================================
// CORE FUNCTIONS
// ============================================================================

function hydrateProfileFromUser() {
  if (!state.user) {
    state.locationLabel = "Location unavailable";
    return;
  }
  state.locationLabel = state.user.location || "Australia";
}

function setLocationLabel(value) {
  state.locationLabel = value;
  const labelEl = document.querySelector(".location-strip");
  if (labelEl) labelEl.textContent = value;
}

function setBusy(value) {
  state.busy = value;
  updateButtons();
}

function setSubmitting(value) {
  state.submitting = value;
  const submit = document.querySelector("button[type=submit]");
  if (submit) submit.disabled = value;
}

function setError(message) {
  state.error = message;
  const errorBox = document.querySelector(".form-error");
  if (errorBox) {
    if (message) {
      errorBox.textContent = message;
      errorBox.classList.add("visible");
    } else {
      errorBox.textContent = "";
      errorBox.classList.remove("visible");
    }
  }
}

function setPage(page, updateHash = true) {
  state.page = page;
  if (updateHash) {
    location.hash = `#${page}`;
  }
  render();
}

// ============================================================================
// NAVIGATION & PAGE ROUTING
// ============================================================================

function render() {
  const allowedLoggedInPages = ["dashboard", "timesheets", "timeoff", "work-schedules", "tasks"];

  if (state.user) {
    if (!allowedLoggedInPages.includes(state.page)) {
      setPage("dashboard", false);
      return;
    }
  } else {
    if (state.page !== "login") {
      setPage("login", false);
      return;
    }
  }

  switch (state.page) {
    case "login":
      renderLogin();
      break;
    case "dashboard":
      renderDashboard();
      break;
    case "timesheets":
      renderTimesheets();
      break;
    case "timeoff":
      renderTimeOff();
      break;
    case "work-schedules":
      renderWorkSchedules();
      break;
    case "tasks":
      renderTasksPage();
      break;
    default:
      if (state.user) {
        setPage("dashboard", false);
      } else {
        setPage("login", false);
      }
      break;
  }
}

function getLoginTimeText() {
  const loginTime = getLatestCheckInTime(state.todayEvents) || state.user?.loggedInAt || state.user?.loginAt || null;
  if (!loginTime) return "—";
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(loginTime).getTime()) / 1000));
  return formatDurationHms(elapsedSeconds);
}

function getDisplayHistoryRows() {
  const selectedPeriod = normalizeDashboardPeriod(state.dashboardPeriod);
  if (selectedPeriod !== "day") {
    return state.historyData;
  }

  return state.historyData.filter((day) => {
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: getUserTimeZone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return day.date === todayKey;
  });
}

// ============================================================================
// PAGE SHELL COMPONENT
// ============================================================================

function createPageShell(title, contentHtml) {
  const dbLocation = state.user?.location || "Australia";
  const dbTimezone = state.user?.timezone || "AEST (UTC+10:00)";
  const zoneAbbr = getDisplayTimeZoneLabel();
  const loggedInDisplay = getLoginTimeText();

  return `<div class="portal-shell">
    <aside class="sidebar">
      <div class="brand-block">
        <img src="images/t_m_logo.png" alt="Team Portal Logo" class="logo-img-sidebar"/>
        <span class="brand-text">tmark techs</span>
      </div>
      <nav class="nav-list">
        <div class="nav-title${state.page === "dashboard" ? " active" : ""}" data-page="dashboard"><span>Dashboard</span></div>
        <div class="nav-title${state.page === "timesheets" ? " active" : ""}" data-page="timesheets"><span>Timesheets</span></div>
        <div class="nav-title${state.page === "timeoff" ? " active" : ""}" data-page="timeoff"><span>Time Off</span></div>
        <div class="nav-title${state.page === "tasks" ? " active" : ""}" data-page="tasks"><span>Tasks</span></div>
        <div class="nav-section-title">Settings</div>
        <div class="nav-title${state.page === "work-schedules" ? " active" : ""}" data-page="work-schedules"><span>Work Schedules</span></div>
      </nav>
      <div class="profile-mini">
        <div class="profile-dot"></div>
        <div>
          <div class="profile-name">${state.user.fullName}</div>
          <div class="profile-role">${state.user.role || "Team"}</div>
          <div class="profile-login">Logged in for ${loggedInDisplay}</div>
        </div>
        <span class="chevron">›</span>
      </div>
      <button class="btn btn-ghost sidebar-logout" id="logout-btn" type="button">Log out</button>
    </aside>
    <section class="workspace">
      <header class="app-header">
        <div><h1>${title}</h1></div>
        <div class="header-actions">
          <span class="current-time" id="current-time-label">—</span>
          <span class="login-time" id="login-time-label">Logged in for ${loggedInDisplay}</span>
          <span class="user-chip">Signed in as <strong>${state.user.fullName}</strong></span>
          <span class="badge location-badge">${dbLocation} · ${zoneAbbr}</span>
          <span class="header-icon-actions">
            <button class="icon-action-button btn-checkin small" id="btn-check-in" type="button" data-action="check-in">
              <span class="icon-button-stack">
                <span class="icon-symbol">✓</span>
                <span class="icon-text">Check in</span>
              </span>
            </button>
            <button class="icon-action-button btn-break small" id="btn-break-start" type="button" data-action="break-start">
              <span class="icon-button-stack">
                <span class="icon-symbol">☕</span>
                <span class="icon-text">Start break</span>
              </span>
            </button>
            <button class="icon-action-button btn-break small" id="btn-break-end" type="button" data-action="break-end">
              <span class="icon-button-stack">
                <span class="icon-symbol">↺</span>
                <span class="icon-text">End break</span>
              </span>
            </button>
            <button class="icon-action-button btn-checkout small" id="btn-check-out" type="button" data-action="check-out">
              <span class="icon-button-stack">
                <span class="icon-symbol">×</span>
                <span class="icon-text">Check out</span>
              </span>
            </button>
          </span>
        </div>
      </header>
      <section class="content-panel dashboard-frame">
        ${contentHtml}
      </section>
    </section>
  </div>`;
}

// ============================================================================
// PAGE RENDERING FUNCTIONS
// ============================================================================

function createDashboardTemplate() {
  const dbLocation = state.user?.location || "Australia";
  const dbTimezone = state.user?.timezone || "AEST (UTC+10:00)";
  const activeZone = normalizeTimeZone(dbTimezone);
  const zoneAbbr = getDisplayTimeZoneLabel();
  const selectedPeriod = normalizeDashboardPeriod(state.dashboardPeriod);
  const durations = computeDurationsClient(state.todayEvents);
  const periodTotals = aggregatePeriodHistory(state.historyData);
  const summaryWorkedSeconds = selectedPeriod === "day" ? durations.workedSeconds : periodTotals.workedSeconds;
  const summaryBreakSeconds = selectedPeriod === "day" ? durations.breakSeconds : periodTotals.breakSeconds;
  const summaryWorked = formatDuration(summaryWorkedSeconds);
  const summaryBreak = formatDuration(summaryBreakSeconds);
  const standardSeconds = selectedPeriod === "week" ? 40 * 3600 : selectedPeriod === "month" ? 160 * 3600 : 8 * 3600;
  const summaryOvertime = formatDuration(Math.max(0, (summaryWorkedSeconds || 0) - standardSeconds));
  const periodDesc = selectedPeriod === "week" ? "this week" : selectedPeriod === "month" ? "this month" : "today";
  const workedLabel = `Worked ${periodDesc}`;
  const breakLabel = `Breaks ${periodDesc}`;
  const overtimeLabel = `Overtime ${periodDesc}`;
  const heroSubtext = `Here's your dashboard for ${periodDesc}.`;

  const leaveRows = (state.leaveData || []).map((item) => {
    const start = new Date(item.startDate);
    const month = start.toLocaleString("en", { month: "short" }).toUpperCase();
    const day = String(start.getDate()).padStart(2, "0");
    const title = item.name || "Time off";
    const category = item.type || "Leave";
    const adminActions = state.user?.role === "admin" ? `<div class="row-admin-actions">
      <button type="button" class="mini-action" data-action="edit-leave" data-id="${item.id}">Edit</button>
      <button type="button" class="mini-action danger" data-action="delete-leave" data-id="${item.id}">Delete</button>
    </div>` : "";
    return `<div class="holiday-row">
      <span class="holiday-date">${month}<br/>${day}</span>
      <div>
        <div class="holiday-name">${title}</div>
        <div class="holiday-place">${category} · ${item.location || dbLocation}</div>
      </div>
      ${adminActions}
    </div>`;
  }).join("");

  return `<div class="period-tabs">
          <button class="tab ${state.dashboardPeriod === "day" ? "active" : ""}" type="button" id="tab-day" data-period="day">Day</button>
          <button class="tab ${state.dashboardPeriod === "week" ? "active" : ""}" type="button" id="tab-week" data-period="week">Week</button>
          <button class="tab ${state.dashboardPeriod === "month" ? "active" : ""}" type="button" id="tab-month" data-period="month">Month</button>
        </div>
        <div class="hero-area">
          <section class="card profile-card">
            <h2>Hello ${state.user.fullName}</h2>
            <div class="subtext">${heroSubtext}</div>
            <div class="profile-details-row"><span class="small-label">Location</span><span class="value-text">${dbLocation}</span></div>
            <div class="profile-details-row"><span class="small-label">Timezone</span><span class="value-text">${dbTimezone}</span></div>
          </section>
          <aside class="card holidays-card">
            <div class="card-title-row">
              <h2>Upcoming Holidays and Time Off</h2>
            </div>
            <div class="holiday-list">${leaveRows}</div>
          </aside>
        </div>
        <section class="card tracked-card">
          <div class="card-heading"><h2>Tracked Hours</h2></div>
          <div class="metric-panel">
            <div class="metrics-left">
              <div class="metric-line"><span class="metric-label">${workedLabel}</span><span class="metric-value" id="worked-value">${summaryWorked}</span></div>
              <div class="metric-line"><span class="metric-label">${breakLabel}</span><span class="metric-value" id="break-value">${summaryBreak}</span></div>
              <div class="metric-line"><span class="metric-label">${overtimeLabel}</span><span class="metric-value" id="overtime-value">${summaryOvertime}</span></div>
            </div>
            <div class="graph-area">
              <div class="status-row">
                <span class="status-pill status-${state.status}"><span class="dot"></span><span id="status-text">${statusLabels[state.status]}</span></span>
                <span class="location-strip" id="location-strip">${state.locationLabel}</span>
              </div>
              <div class="chart-container" style="margin-top:18px;">
                <canvas id="daily-hours-chart"></canvas>
              </div>
              <div class="summary-grid" style="margin-top:18px;">
                <div class="summary-tile"><div class="label">${workedLabel}</div><div class="value" id="worked-value-summary">${summaryWorked}</div></div>
                <div class="summary-tile"><div class="label">${breakLabel}</div><div class="value" id="break-value-summary">${summaryBreak}</div></div>
                <div class="summary-tile"><div class="label">${overtimeLabel}</div><div class="value" id="overtime-value-summary">${summaryOvertime}</div></div>
              </div>
            </div>
          </div>
        </section>
        <section class="two-column">
          <div class="card timeline-card">
            <h2>Today's timeline</h2>
            <ul class="timeline" id="timeline"></ul>
            <p class="empty-note" id="timeline-empty">No activity yet today — check in to get started.</p>
          </div>
          <div class="card history-card">
            <h2>History (${periodDesc})</h2>
            <table class="history">
              <thead><tr><th>Date</th><th>Check in (${zoneAbbr})</th><th>Check out (${zoneAbbr})</th><th>Break</th><th>Worked</th></tr></thead>
              <tbody id="history-body"></tbody>
            </table>
            <p class="empty-note" id="history-empty" style="display:none;">No history yet.</p>
          </div>
        </section>
        <section class="clock-board" style="display: none;">
          <div class="clock-zone">
            <span class="zone-label">${zoneAbbr}</span>
            <div class="flap-row" id="zone-flaps"></div>
            <span class="zone-date" id="zone-date">—</span>
          </div>
        </section>
        <p class="footnote">Times shown in ${activeZone} and IST. User location is read from the database profile for ${dbLocation}, with browser GPS tagging for live events.</p>
      `;
}

function renderDailyHoursChart() {
  const canvas = document.getElementById("daily-hours-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  
  // Get history data for the current period
  const historyRows = getDisplayHistoryRows();
  
  // Sort data chronologically (oldest first, newest last) to ensure proper display
  const sortedRows = [...historyRows].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });
  
  // Extract data for the chart
  const labels = sortedRows.map(day => {
    const date = new Date(day.date);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  });
  
  const workedHours = sortedRows.map(day => {
    const hours = (day.workedSeconds || 0) / 3600;
    return parseFloat(hours.toFixed(2));
  });
  
  const breakHours = sortedRows.map(day => {
    const hours = (day.breakSeconds || 0) / 3600;
    return parseFloat(hours.toFixed(2));
  });

  // Destroy existing chart if it exists
  if (window.dailyHoursChartInstance) {
    window.dailyHoursChartInstance.destroy();
  }

  // Create new chart
  window.dailyHoursChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Worked Hours",
          data: workedHours,
          backgroundColor: "rgba(44, 122, 122, 0.7)",
          borderColor: "rgba(44, 122, 122, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Break Hours",
          data: breakHours,
          backgroundColor: "rgba(245, 158, 11, 0.7)",
          borderColor: "rgba(245, 158, 11, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            font: {
              family: "Inter",
              size: 12,
            },
            color: "#15343b",
          },
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw}h`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: false,
          grid: {
            display: false,
          },
          ticks: {
            font: {
              family: "Inter",
              size: 11,
            },
            color: "#526f73",
          },
        },
        y: {
          stacked: false,
          beginAtZero: true,
          grid: {
            color: "rgba(191, 214, 215, 0.3)",
          },
          ticks: {
            font: {
              family: "Inter",
              size: 11,
            },
            color: "#526f73",
            callback: function(value) {
              return value + "h";
            },
          },
        },
      },
    },
  });
}

function renderDashboard() {
  root.innerHTML = createPageShell("Dashboard", createDashboardTemplate());
  attachDashboardListeners();
  updateDashboardValues();
  renderTimeline();
  renderHistory();
  renderDailyHoursChart();
}

function createTimesheetsTemplate() {
  const zone = getUserTimeZone();
  // Sort data chronologically (oldest first, newest last) for professional display
  const sortedRows = [...state.historyData].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });
  
  const historyRows = sortedRows.map((day) => `
      <tr>
        <td>${day.date}</td>
        <td>${day.checkInUtc ? formatTime(day.checkInUtc, zone) : "—"}</td>
        <td>${day.checkOutUtc ? formatTime(day.checkOutUtc, zone) : "—"}</td>
        <td>${formatDuration(day.breakSeconds)}</td>
        <td>${formatDuration(day.workedSeconds)}</td>
      </tr>
    `).join("");
  const selectedPeriod = normalizeDashboardPeriod(state.dashboardPeriod);
  const periodDesc = selectedPeriod === "week" ? "this week" : selectedPeriod === "month" ? "this month" : "today";
  const dayDurations = computeDurationsClient(state.todayEvents);
  const summaryWorked = formatDuration(dayDurations.workedSeconds);
  const summaryBreak = formatDuration(dayDurations.breakSeconds);
  const standardSeconds = selectedPeriod === "week" ? 40 * 3600 : selectedPeriod === "month" ? 160 * 3600 : 8 * 3600;
  const summaryOvertime = formatDuration(Math.max(0, (dayDurations.workedSeconds || 0) - standardSeconds));

  return `<section class="card tracked-card">
          <div class="card-heading"><h2>Timesheet summary</h2></div>
          <div class="metric-panel">
            <div class="metrics-left">
              <div class="metric-line"><span class="metric-label">Worked ${periodDesc}</span><span class="metric-value" id="worked-value">${summaryWorked}</span></div>
              <div class="metric-line"><span class="metric-label">Breaks ${periodDesc}</span><span class="metric-value" id="break-value">${summaryBreak}</span></div>
              <div class="metric-line"><span class="metric-label">Overtime ${periodDesc}</span><span class="metric-value" id="overtime-value">${summaryOvertime}</span></div>
            </div>
          </div>
        </section>
        <div class="card history-card">
          <h2>Daily timesheet history</h2>
          <table class="history">
            <thead><tr><th>Date</th><th>Check in (${zone})</th><th>Check out (${zone})</th><th>Break</th><th>Worked</th></tr></thead>
            <tbody id="history-body">${historyRows}</tbody>
          </table>
          <p class="empty-note" id="history-empty" style="display:${state.historyData.length ? "none" : "block"};">No history yet.</p>
        </div>
      `;
}

function createTimeOffTemplate() {
  const isAdmin = state.user?.role === "admin";
  const dbLocation = state.user?.location || "Australia";
  const leaveRows = (state.leaveData || []).map((item) => {
    const start = new Date(item.startDate);
    const end = item.endDate ? new Date(item.endDate) : start;
    const month = start.toLocaleString("en", { month: "short" }).toUpperCase();
    const day = String(start.getDate()).padStart(2, "0");
    const range = item.endDate ? `${formatDate(item.startDate, getUserTimeZone())} – ${formatDate(item.endDate, getUserTimeZone())}` : formatDate(item.startDate, getUserTimeZone());
    // Admins see approve/reject controls; regular users can edit/delete their requests
    const adminActions = isAdmin ? `
      <div class="row-admin-actions">
        ${item.status === "Pending" || item.status === "Requested" ? `
          <button type="button" class="mini-action" data-action="approve-leave" data-id="${item.id}">Approve</button>
          <button type="button" class="mini-action danger" data-action="reject-leave" data-id="${item.id}">Reject</button>
        ` : ""}
      </div>
    ` : `
      <div class="row-admin-actions">
        <button type="button" class="mini-action" data-action="edit-leave" data-id="${item.id}">Edit</button>
        <button type="button" class="mini-action danger" data-action="delete-leave" data-id="${item.id}">Delete</button>
      </div>
    `;
    return `<div class="holiday-row">
      <span class="holiday-date">${month}<br/>${day}</span>
      <div>
        <div class="holiday-name">${item.name || "Time off"}</div>
        <div class="holiday-place">${item.type || "Leave"} · ${item.location || state.user?.location || "Australia"}</div>
        <div class="holiday-meta">${range}${
          item.reason ? ` · ${item.reason}` : ""
        }</div>
        <div class="holiday-status status-${item.status?.toLowerCase() || "approved"}">${item.status || "Approved"}</div>
        ${adminActions}
      </div>
    </div>`;
  }).join("");
  return `<section class="card holidays-card">
          <div class="card-title-row">
            <h2>Time off requests</h2>
            <div class="admin-inline-actions">
              ${!isAdmin ? `<button class="btn btn-primary" type="button" id="add-leave">New Time Off Request</button>` : ''}
              <button class="btn btn-ghost" type="button" id="refresh-leaves">↻ Refresh</button>
            </div>
          </div>
          <div class="holiday-list">${leaveRows || '<p class="empty-note">No time off requests yet.</p>'}</div>
        </section>
        <div class="task-modal-overlay" id="leave-modal" style="display:none;">
          <div class="task-modal-card">
            <div class="task-modal-header">
              <h3 id="leave-modal-title">New Time Off Request</h3>
              <button class="icon-button" id="close-leave-modal" type="button">×</button>
            </div>
            <form id="leave-form">
              <input type="hidden" id="leave-id" />
              <div class="form-section">
                <h4 class="form-section-title">Leave Details</h4>
                <div class="form-grid">
                  <label class="field-block full-width"><span>Leave Name <span class="required-indicator">*</span></span><input id="leave-name" required placeholder="Enter leave name" /></label>
                  <label class="field-block"><span>Type</span><select id="leave-type"><option value="Holiday">Holiday</option><option value="Annual Leave">Annual Leave</option><option value="Sick Leave">Sick Leave</option><option value="Personal Leave">Personal Leave</option></select></label>
                  <label class="field-block"><span>Location</span><input id="leave-location" value="${dbLocation}" required /></label>
                </div>
              </div>
              <div class="form-section">
                <h4 class="form-section-title">Date & Status</h4>
                <div class="form-grid">
                  <label class="field-block"><span>Start Date <span class="required-indicator">*</span></span><input id="leave-date" type="date" required /></label>
                  <label class="field-block"><span>End Date <span class="required-indicator">*</span></span><input id="leave-end-date" type="date" required /></label>
                  <label class="field-block full-width"><span>Reason <span class="required-indicator">*</span></span><input id="leave-reason" required placeholder="Enter reason for leave" /></label>
                  ${isAdmin ? `
                  <label class="field-block"><span>Status</span><select id="leave-status"><option value="Approved">Approved</option><option value="Pending">Pending</option><option value="Requested">Requested</option><option value="Rejected">Rejected</option></select></label>
                  ` : `<input type="hidden" id="leave-status" value="Requested" />`}
                </div>
              </div>
              <div class="form-section">
                <div class="form-grid form-actions-grid">
                  <button class="btn btn-ghost" type="button" id="cancel-leave">Cancel</button>
                  <button class="btn btn-primary" type="submit" id="submit-leave">Submit Request</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      `;
}

// Home page removed — login is now the default landing page.

function renderLogin() {
  root.innerHTML = `<div class="auth-shell">
    <div class="auth-card">
      <div class="auth-brand"><img src="images/t_m_logo.png" alt="Team Portal Logo" class="logo-img"/><h1>Team Portal</h1></div>
      <p class="auth-sub">Sign in to access your attendance dashboard.</p>
      <div class="form-error" id="form-error"></div>
      <form id="login-form" novalidate>
        <div class="field"><label for="username">Username</label><input id="username" name="username" type="text" autocomplete="username" required placeholder="Enter your username" /></div>
        <div class="field"><label for="password">Password</label>
          <div class="password-field">
            <input id="password" name="password" type="password" autocomplete="current-password" required placeholder="Enter your password" />
            <button class="password-toggle" id="toggle-password" type="button" aria-pressed="false" aria-label="Show password">
              <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg class="eye-off-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
        </div>
        <button class="btn btn-primary" type="submit" id="submit-btn">Sign in</button>
      </form>
      <div class="auth-switch">Need access? <strong>Contact your admin.</strong></div>
    </div>
  </div>`;

  setError(state.error);
  const form = document.getElementById("login-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    try {
      const data = await apiJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      state.user = data;
      hydrateProfileFromUser();
      setPage("dashboard");
      await loadToday();
      await loadHistory();
    } catch (err) {
      setError(err.error || "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  });

  const toggleBtn = document.getElementById("toggle-password");
  if (toggleBtn) {
    const pwd = document.getElementById("password");
    const eyeIcon = toggleBtn.querySelector('.eye-icon');
    const eyeOffIcon = toggleBtn.querySelector('.eye-off-icon');
    
    const setState = (visible) => {
      if (pwd) {
        pwd.type = visible ? 'text' : 'password';
      }
      toggleBtn.setAttribute('aria-pressed', String(visible));
      toggleBtn.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
      
      if (eyeIcon && eyeOffIcon) {
        eyeIcon.style.display = visible ? 'none' : 'block';
        eyeOffIcon.style.display = visible ? 'block' : 'none';
      }
    };
    
    // initialize
    setState(false);
    
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const pwdEl = document.getElementById("password");
      if (!pwdEl) return;
      const makeVisible = pwdEl.type === "password";
      setState(makeVisible);
    });
    
    // keyboard support (Space/Enter)
    toggleBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleBtn.click();
      }
    });
  }
}

function renderTimesheets() {
  root.innerHTML = createPageShell("Timesheets", createTimesheetsTemplate());
  attachDashboardListeners();
  updateDashboardValues();
  renderHistory();
}

function renderTimeOff() {
  loadLeaves().then(() => {
    root.innerHTML = createPageShell("Time Off", createTimeOffTemplate());
    attachDashboardListeners();
    updateDashboardValues();
  }).catch(() => {
    // Fallback: render with empty leaves data
    state.leaveData = [];
    root.innerHTML = createPageShell("Time Off", createTimeOffTemplate());
    attachDashboardListeners();
    updateDashboardValues();
  });
}

function renderWorkSchedules() {
  root.innerHTML = createPageShell("Work Schedules", createWorkSchedulesTemplate());
  attachDashboardListeners();
  updateDashboardValues();
}

function createWorkSchedulesTemplate() {
  const rows = (state.scheduleData || []).map((item) => `
    <div class="schedule-row">
      <div class="schedule-item schedule-date">
        <strong>${item.date}</strong>
        <span>${item.shift}</span>
      </div>
      <div class="schedule-item schedule-time">
        <strong>${item.start} - ${item.end}</strong>
        <span>${item.location}</span>
      </div>
      <div class="schedule-item schedule-owner">
        <strong>${item.owner}</strong>
        <span>${item.status}</span>
      </div>
    </div>
  `).join("");

  return `
    <section class="card profile-card">
      <div class="card-title-row">
        <div>
          <h2>Work schedules</h2>
          <p>Manage employee shifts, regional schedules, and daily attendance plans.</p>
        </div>
        <button class="btn btn-primary" type="button" id="new-schedule">New schedule</button>
      </div>
      <div class="schedule-header-row">
        <span>Date & shift</span>
        <span>Time & location</span>
        <span>Owner & status</span>
      </div>
      <div class="schedule-list">
        ${rows}
      </div>
      ${rows.length === 0 ? `<p class="empty-note">No work schedules created yet.</p>` : ""}
    </section>
    ${createScheduleModalHtml()}
  `;
}

function createScheduleModalHtml() {
  return `
    <div class="task-modal-overlay" id="schedule-modal" style="display:none;">
      <div class="task-modal-card">
        <div class="task-modal-header">
          <h3 id="schedule-modal-title">New Work Schedule</h3>
          <button class="icon-button" id="close-schedule-modal" type="button">×</button>
        </div>
        <form id="schedule-form">
          <input type="hidden" id="schedule-id" />
          <div class="form-section">
            <h4 class="form-section-title">Schedule Details</h4>
            <div class="form-grid">
              <label class="field-block"><span>Date <span class="required-indicator">*</span></span><input type="date" id="schedule-date" required /></label>
              <label class="field-block"><span>Shift</span><select id="schedule-shift"><option value="Morning">Morning</option><option value="Afternoon">Afternoon</option><option value="Night">Night</option></select></label>
              <label class="field-block"><span>Start Time <span class="required-indicator">*</span></span><input type="time" id="schedule-start" required /></label>
              <label class="field-block"><span>End Time <span class="required-indicator">*</span></span><input type="time" id="schedule-end" required /></label>
            </div>
          </div>
          <div class="form-section">
            <h4 class="form-section-title">Assignment & Status</h4>
            <div class="form-grid">
              <label class="field-block"><span>Location <span class="required-indicator">*</span></span><input id="schedule-location" required placeholder="Enter location" /></label>
              <label class="field-block"><span>Owner <span class="required-indicator">*</span></span><input id="schedule-owner" required placeholder="Enter owner name" /></label>
              <label class="field-block"><span>Status</span><select id="schedule-status"><option value="Confirmed">Confirmed</option><option value="Planned">Planned</option><option value="Pending">Pending</option><option value="Blocked">Blocked</option></select></label>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" id="cancel-schedule">Cancel</button>
            <button class="btn btn-primary" type="submit">Save Schedule</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function openScheduleModal(schedule = null) {
  const modal = document.getElementById("schedule-modal");
  const titleEl = document.getElementById("schedule-modal-title");
  const formId = document.getElementById("schedule-id");
  const dateInput = document.getElementById("schedule-date");
  const shiftInput = document.getElementById("schedule-shift");
  const startInput = document.getElementById("schedule-start");
  const endInput = document.getElementById("schedule-end");
  const locationInput = document.getElementById("schedule-location");
  const ownerInput = document.getElementById("schedule-owner");
  const statusInput = document.getElementById("schedule-status");

  if (!modal || !titleEl || !formId || !dateInput || !shiftInput || !startInput || !endInput || !locationInput || !ownerInput || !statusInput) return;

  titleEl.textContent = schedule ? "Edit Work Schedule" : "New Work Schedule";
  formId.value = schedule?.id || "";
  dateInput.value = schedule?.date || "";
  shiftInput.value = schedule?.shift || "Morning";
  startInput.value = schedule?.start || "";
  endInput.value = schedule?.end || "";
  locationInput.value = schedule?.location || "";
  ownerInput.value = schedule?.owner || "";
  statusInput.value = schedule?.status || "Confirmed";

  modal.style.display = "flex";
  
  // Focus on date input for better UX
  setTimeout(() => dateInput.focus(), 100);
}

function closeScheduleModal() {
  const modal = document.getElementById("schedule-modal");
  if (modal) modal.style.display = "none";
}

function attachDashboardListeners() {
  const navLinks = document.querySelectorAll(".nav-title[data-page]");
  for (const link of navLinks) {
    link.addEventListener("click", () => {
      const nextPage = link.dataset.page;
      if (nextPage) {
        setPage(nextPage);
      }
    });
  }

  const logoutButton = document.getElementById("logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
      } catch (err) {
        console.error("Logout API failed.", err);
      } finally {
        state.user = null;
        state.status = "not_checked_in";
        state.todayEvents = [];
        state.historyData = [];
        state.dashboardPeriod = "day";
        state.locationLabel = "Location unavailable";
        setPage("login");
      }
    });
  }

  const addLeave = document.getElementById("add-leave");
  if (addLeave) {
    addLeave.addEventListener("click", () => {
      openLeaveModal(null);
    });
  }

  const refreshButton = document.getElementById("refresh-leaves");
  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await loadLeaves();
      if (state.page === "timeoff") renderTimeOff();
      else renderDashboard();
    });
  }

  const holidayRows = document.querySelectorAll("[data-action='edit-leave']");
  for (const btn of holidayRows) {
    btn.addEventListener("click", () => openLeaveModal(btn.dataset.id));
  }

  const approveButtons = document.querySelectorAll("[data-action='approve-leave']");
  for (const btn of approveButtons) {
    btn.addEventListener("click", async () => {
      const target = btn.dataset.id;
      try {
        await updateLeave(target, { status: "Approved" });
        await loadLeaves();
        if (state.page === "timeoff") renderTimeOff();
        else renderDashboard();
      } catch (error) {
        console.error("Failed to approve leave:", error);
        alert("Failed to approve leave. Please try again.");
      }
    });
  }

  const rejectButtons = document.querySelectorAll("[data-action='reject-leave']");
  for (const btn of rejectButtons) {
    btn.addEventListener("click", async () => {
      const target = btn.dataset.id;
      try {
        await updateLeave(target, { status: "Rejected" });
        await loadLeaves();
        if (state.page === "timeoff") renderTimeOff();
        else renderDashboard();
      } catch (error) {
        console.error("Failed to reject leave:", error);
        alert("Failed to reject leave. Please try again.");
      }
    });
  }

  const deleteRows = document.querySelectorAll("[data-action='delete-leave']");
  for (const btn of deleteRows) {
    btn.addEventListener("click", async () => {
      const target = btn.dataset.id;
      try {
        await deleteLeave(target);
        await loadLeaves();
        if (state.page === "timeoff") renderTimeOff();
        else renderDashboard();
      } catch (error) {
        console.error("Failed to delete leave:", error);
        alert("Failed to delete leave. Please try again.");
      }
    });
  }

  const scheduleButton = document.getElementById("new-schedule");
  if (scheduleButton) {
    scheduleButton.addEventListener("click", (event) => {
      event.preventDefault();
      openScheduleModal(null);
    });
  }

  if (!scheduleButton) {
    document.body.addEventListener("click", (event) => {
      const target = event.target.closest("#new-schedule");
      if (target) {
        event.preventDefault();
        openScheduleModal(null);
      }
    });
  }

  const closeModal = document.getElementById("close-leave-modal");
  if (closeModal) closeModal.addEventListener("click", closeLeaveModal);
  const cancelModal = document.getElementById("cancel-leave");
  if (cancelModal) cancelModal.addEventListener("click", closeLeaveModal);

  const leaveOverlay = document.getElementById("leave-modal");
  if (leaveOverlay) {
    leaveOverlay.addEventListener("click", (event) => {
      if (event.target === leaveOverlay) closeLeaveModal();
    });
  }

  const leaveForm = document.getElementById("leave-form");
  if (leaveForm) {
    leaveForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const leaveId = document.getElementById("leave-id").value;
      const payload = {
        name: document.getElementById("leave-name").value,
        type: document.getElementById("leave-type").value,
        location: document.getElementById("leave-location").value,
        startDate: document.getElementById("leave-date").value,
        endDate: document.getElementById("leave-end-date").value,
        reason: document.getElementById("leave-reason").value,
        status: document.getElementById("leave-status").value,
      };
      
      try {
        if (leaveId) {
          await updateLeave(leaveId, payload);
        } else {
          await createLeave(payload);
        }
        await loadLeaves();
        closeLeaveModal();
        if (state.page === "timeoff") {
          renderTimeOff();
        } else {
          renderDashboard();
        }
      } catch (error) {
        console.error("Failed to save leave:", error);
        alert("Failed to save leave. Please try again.");
      }
    });
  }

  const scheduleClose = document.getElementById("close-schedule-modal");
  if (scheduleClose) scheduleClose.addEventListener("click", closeScheduleModal);
  const scheduleCancel = document.getElementById("cancel-schedule");
  if (scheduleCancel) scheduleCancel.addEventListener("click", closeScheduleModal);

  const scheduleOverlay = document.getElementById("schedule-modal");
  if (scheduleOverlay) {
    scheduleOverlay.addEventListener("click", (event) => {
      if (event.target === scheduleOverlay) closeScheduleModal();
    });
  }

  const form = document.getElementById("leave-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const leaveId = Number(document.getElementById("leave-id").value || Date.now());
      const nextRecord = {
        id: leaveId || Date.now(),
        name: document.getElementById("leave-name").value.trim(),
        type: document.getElementById("leave-type").value || "Holiday",
        startDate: document.getElementById("leave-date").value,
        endDate: document.getElementById("leave-end-date").value || document.getElementById("leave-date").value,
        location: document.getElementById("leave-location").value.trim() || state.user?.location || "Australia",
        reason: document.getElementById("leave-reason").value.trim(),
        status: document.getElementById("leave-status").value || "Approved",
      };
      if (!nextRecord.name || !nextRecord.startDate || !nextRecord.endDate) return;
      const existing = state.leaveData.find((row) => row.id === nextRecord.id);
      if (existing) {
        Object.assign(existing, nextRecord);
      } else {
        state.leaveData.push(nextRecord);
      }
      closeLeaveModal();
      if (state.page === "timeoff") renderTimeOff();
      else renderDashboard();
    });
  }

  const scheduleForm = document.getElementById("schedule-form");
  if (scheduleForm) {
    scheduleForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const scheduleId = Number(document.getElementById("schedule-id").value || Date.now());
      const nextRecord = {
        id: scheduleId || Date.now(),
        date: document.getElementById("schedule-date").value,
        shift: document.getElementById("schedule-shift").value || "Morning",
        start: document.getElementById("schedule-start").value,
        end: document.getElementById("schedule-end").value,
        location: document.getElementById("schedule-location").value.trim() || state.user?.location || "Australia",
        owner: document.getElementById("schedule-owner").value.trim() || state.user?.fullName || "Team",
        status: document.getElementById("schedule-status").value || "Confirmed",
      };
      if (!nextRecord.date || !nextRecord.start || !nextRecord.end || !nextRecord.location || !nextRecord.owner) return;
      const existing = state.scheduleData.find((row) => row.id === nextRecord.id);
      if (existing) {
        Object.assign(existing, nextRecord);
      } else {
        state.scheduleData.push(nextRecord);
      }
      closeScheduleModal();
      if (state.page === "work-schedules") renderWorkSchedules();
    });
  }

  const tabs = document.querySelectorAll(".period-tabs .tab");
  for (const tab of tabs) {
    tab.addEventListener("click", async () => {
      const nextPeriod = tab.dataset.period || "day";
      state.dashboardPeriod = normalizeDashboardPeriod(nextPeriod);
      await loadHistory(state.dashboardPeriod);
      renderDashboard();
    });
  }

  for (const [buttonId, endpoint] of Object.entries(actionEndpointMap)) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener("click", () => performAction(endpoint));
    }
  }
}

function updateDashboardValues() {
  const statusEl = document.getElementById("status-text");
  const pill = document.querySelector(".status-pill");
  if (statusEl) statusEl.textContent = statusLabels[state.status] || state.status;
  if (pill) {
    pill.className = `status-pill status-${state.status}`;
  }

  const durations = computeDurationsClient(state.todayEvents);
  const workedValue = document.getElementById("worked-value");
  const workedValueSummary = document.getElementById("worked-value-summary");
  const breakValue = document.getElementById("break-value");
  const breakValueSummary = document.getElementById("break-value-summary");
  const overtimeValue = document.getElementById("overtime-value");
  const overtimeValueSummary = document.getElementById("overtime-value-summary");

  const selectedPeriod = normalizeDashboardPeriod(state.dashboardPeriod);
  const periodTotals = aggregatePeriodHistory(state.historyData);

  const summaryWorkedSeconds = selectedPeriod === "day" ? durations.workedSeconds : periodTotals.workedSeconds;
  const summaryBreakSeconds = selectedPeriod === "day" ? durations.breakSeconds : periodTotals.breakSeconds;
  const summaryWorked = formatDuration(summaryWorkedSeconds);
  const summaryBreak = formatDuration(summaryBreakSeconds);
  const standardSeconds = selectedPeriod === "week" ? 40 * 3600 : selectedPeriod === "month" ? 160 * 3600 : 8 * 3600;
  const summaryOvertime = formatDuration(Math.max(0, (summaryWorkedSeconds || 0) - standardSeconds));

  if (workedValue) workedValue.textContent = summaryWorked;
  if (workedValueSummary) workedValueSummary.textContent = summaryWorked;
  if (breakValue) breakValue.textContent = summaryBreak;
  if (breakValueSummary) breakValueSummary.textContent = summaryBreak;
  if (overtimeValue) overtimeValue.textContent = summaryOvertime;
  if (overtimeValueSummary) overtimeValueSummary.textContent = summaryOvertime;
  setLocationLabel(state.locationLabel);
  updateButtons();
  tickClock();
}

function updateButtons() {
  const enabled = enabledByStatus[state.status] || [];
  const checkInBtn = document.getElementById("btn-check-in");
  const breakStartBtn = document.getElementById("btn-break-start");
  const breakEndBtn = document.getElementById("btn-break-end");
  const checkOutBtn = document.getElementById("btn-check-out");
  if (checkInBtn) checkInBtn.disabled = state.busy || !enabled.includes("check_in");
  if (breakStartBtn) breakStartBtn.disabled = state.busy || !enabled.includes("break_start");
  if (breakEndBtn) breakEndBtn.disabled = state.busy || !enabled.includes("break_end");
  if (checkOutBtn) checkOutBtn.disabled = state.busy || !enabled.includes("check_out");
}

function renderTimeline() {
  const timelineEl = document.getElementById("timeline");
  const emptyNote = document.getElementById("timeline-empty");
  if (!timelineEl || !emptyNote) return;
  timelineEl.innerHTML = "";
  if (!state.todayEvents.length) {
    emptyNote.style.display = "block";
    return;
  }
  emptyNote.style.display = "none";
  const zone = getUserTimeZone();
  state.todayEvents.forEach((eve) => {
    const li = document.createElement("li");
    const typeSpan = document.createElement("span");
    typeSpan.className = "ev-type";
    typeSpan.textContent = actionLabels[eve.type] || eve.type;
    const timeSpan = document.createElement("span");
    timeSpan.className = "ev-time";
    const zoneLabel = getDisplayTimeZoneLabel();
    timeSpan.textContent = `${formatTime(eve.timestampUtc, zone)} ${zoneLabel} · ${formatTime(eve.timestampUtc, IST_TIME_ZONE)} IST`;
    const locSpan = document.createElement("span");
    locSpan.className = "ev-loc";
    locSpan.textContent = eve.address ? eve.address : eve.latitude != null ? `${eve.latitude.toFixed(3)}, ${eve.latitude.toFixed(3)}` : "No location";
    li.append(typeSpan, timeSpan, locSpan);
    timelineEl.appendChild(li);
  });
}

function renderHistory() {
  const body = document.getElementById("history-body");
  const empty = document.getElementById("history-empty");
  if (!body || !empty) return;

  const rows = getDisplayHistoryRows();
  body.innerHTML = "";
  if (!rows.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  const zone = getUserTimeZone();
  
  // Sort rows chronologically (oldest first, newest last) for professional display
  const sortedRows = [...rows].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });
  
  sortedRows.forEach((day) => {
    const tr = document.createElement("tr");
    tr.append(createCell(day.date, "day-cell"));
    tr.append(createCell(day.checkInUtc ? formatTime(day.checkInUtc, zone) : "—"));
    tr.append(createCell(day.checkOutUtc ? formatTime(day.checkOutUtc, zone) : "—"));
    tr.append(createCell(formatDuration(day.breakSeconds)));
    tr.append(createCell(formatDuration(day.workedSeconds)));
    body.appendChild(tr);
  });
}

function createCell(content, className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = content;
  return td;
}

async function performAction(endpoint) {
  setBusy(true);
  try {
    const loc = await captureLocation();
    const data = await apiJson(`/api/attendance/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loc),
    });
    state.status = data.status;
    state.todayEvents = data.today;
    updateDashboardValues();
    await loadHistory();
  } catch (err) {
    alert(err.error || "That action couldn't be completed.");
  } finally {
    setBusy(false);
  }
}

function tickClock() {
  const now = new Date();
  state.clock = now;
  const userZone = getUserTimeZone();
  const zone = formatTime(now.toISOString(), userZone);
  const zoneDate = formatDate(now.toISOString(), userZone);
  const ist = formatTime(now.toISOString(), IST_TIME_ZONE);
  const istDate = formatDate(now.toISOString(), IST_TIME_ZONE);

  const zoneFlaps = document.getElementById("zone-flaps");
  const zoneDateEl = document.getElementById("zone-date");
  const istFlaps = document.getElementById("gmt-flaps");
  const istDateEl = document.getElementById("gmt-date");
  if (zoneFlaps) setFlapText(zoneFlaps, zone);
  if (zoneDateEl) zoneDateEl.textContent = zoneDate;
  if (istFlaps) setFlapText(istFlaps, ist);
  if (istDateEl) istDateEl.textContent = istDate;

  const timeLabel = document.getElementById("current-time-label");
  if (timeLabel) {
    timeLabel.textContent = `${zone} ${getDisplayTimeZoneLabel()}`;
  }

  const loginLabel = document.getElementById("login-time-label");
  if (loginLabel) {
    loginLabel.textContent = getLoginTimeText();
  }
}

function setFlapText(container, text) {
  if (container.children.length !== text.length) {
    container.innerHTML = "";
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = `flap-digit${ch === ":" ? " sep" : ""}`;
      span.textContent = ch;
      container.appendChild(span);
    }
    return;
  }
  for (let i = 0; i < text.length; i += 1) {
    const span = container.children[i];
    if (span.textContent !== text[i]) {
      span.textContent = text[i];
      if (text[i] !== ":") {
        span.classList.remove("flip");
        void span.offsetWidth;
        span.classList.add("flip");
      }
    }
  }
}

function openLeaveModal(leaveId) {
  const modal = document.getElementById("leave-modal");
  const modalTitle = document.getElementById("leave-modal-title");
  if (!modal) return;

  const isAdmin = state.user?.role === "admin";
  const leave = leaveId == null ? null : (state.leaveData || []).find((row) => row.id === leaveId);
  const idInput = document.getElementById("leave-id");
  const nameInput = document.getElementById("leave-name");
  const typeInput = document.getElementById("leave-type");
  const locationInput = document.getElementById("leave-location");
  const dateInput = document.getElementById("leave-date");
  const endDateInput = document.getElementById("leave-end-date");
  const reasonInput = document.getElementById("leave-reason");
  const statusInput = document.getElementById("leave-status");

  if (modalTitle) modalTitle.textContent = leave ? (isAdmin ? "Edit Time Off" : "View/Edit Request") : "New Time Off Request";
  if (idInput) idInput.value = leave ? String(leave.id) : "";
  if (nameInput) nameInput.value = leave?.name || "";
  if (typeInput) typeInput.value = leave?.type || "Annual Leave";
  if (locationInput) locationInput.value = leave?.location || state.user?.location || "Australia";
  if (dateInput) dateInput.value = leave?.startDate || new Date().toISOString().slice(0, 10);
  if (endDateInput) endDateInput.value = leave?.endDate || leave?.startDate || new Date().toISOString().slice(0, 10);
  if (reasonInput) reasonInput.value = leave?.reason || "";
  if (statusInput) {
    if (isAdmin) {
      statusInput.value = leave?.status || "Pending";
    } else {
      // For regular users, default to "Requested" when creating new leave
      statusInput.value = leave?.status || "Requested";
    }
  }

  modal.style.display = "flex";
  
  // Focus on name input for better UX
  setTimeout(() => nameInput.focus(), 100);
}

function closeLeaveModal() {
  const modal = document.getElementById("leave-modal");
  if (modal) modal.style.display = "none";
}

function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

async function captureLocation() {
  const coords = await getBrowserLocation();
  if (!coords) {
    return { latitude: null, longitude: null, address: null };
  }
  const address = await reverseGeocode(coords.latitude, coords.longitude);
  return { latitude: coords.latitude, longitude: coords.longitude, address };
}

