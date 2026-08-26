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
  if (page === "login") {
    localStorage.removeItem("crm-current-page");
  } else {
    localStorage.setItem("crm-current-page", page);
  }
  if (updateHash) {
    location.hash = `#${page}`;
  }
  render();
}

// ============================================================================
// NAVIGATION & PAGE ROUTING
// ============================================================================

function render() {
  const allowedLoggedInPages = Object.keys(PAGE_DEFINITIONS);

  if (state.user) {
    if (!allowedLoggedInPages.includes(state.page)) {
      setPage("dashboard", false);
      return;
    }
    // Admin-only pages
    if (state.page === "user-management" && state.user.role !== "admin") {
      setPage("dashboard", false);
      return;
    }
  } else {
    if (state.page !== "login") {
      setPage("login", false);
      return;
    }
  }

  if (state.page === "login") {
    renderLogin();
    return;
  }

  const pageDefinition = getPageDefinition(state.page);
  if (pageDefinition) {
    pageDefinition.render();
    return;
  }

  setPage(state.user ? "dashboard" : "login", false);
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
  const isAdmin = state.user?.role === "admin";

  return `<div class="portal-shell">
    <aside class="sidebar">
      <div class="brand-block">
        <img src="images/t_m_logo.png" alt="Team Portal Logo" class="logo-img-sidebar"/>
        <span class="brand-text">tmark techs</span>
      </div>
      <nav class="nav-list">
        <div class="nav-title${state.page === "dashboard" ? " active" : ""}" data-page="dashboard"><span>Dashboard</span></div>
        <div class="nav-title${state.page === "timesheets" ? " active" : ""}" data-page="timesheets"><span>Timesheets</span></div>
        <div class="nav-title${state.page === "timeoff" ? " active" : ""}" data-page="timeoff"><span>Leave Requests</span></div>
        <div class="nav-title${state.page === "holidays" ? " active" : ""}" data-page="holidays"><span>Upcoming Holidays</span></div>
        <div class="nav-title${state.page === "tasks" ? " active" : ""}" data-page="tasks"><span>Tasks</span></div>
        <div class="nav-section-title">Settings</div>
        <div class="nav-title${state.page === "work-schedules" ? " active" : ""}" data-page="work-schedules"><span>Work Schedules</span></div>
        ${isAdmin ? `<div class="nav-section-title">Admin</div>
        <div class="nav-title${state.page === "user-management" ? " active" : ""}" data-page="user-management"><span>Employee Management</span></div>` : ""}
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
      <header class="app-header page-header-${state.page}">
        <div><h1>${title}</h1></div>
        <div class="header-actions">
          <span class="current-time" id="current-time-label">—</span>
          <span class="login-time" id="login-time-label">Logged in for ${loggedInDisplay}</span>
          <span class="user-chip">Signed in as <strong>${state.user.fullName}</strong></span>
          <span class="badge location-badge">${dbLocation} · ${zoneAbbr}</span>
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

  const renderLeaveRows = (items) => items.map((item) => {
    const start = new Date(item.startDate);
    const month = start.toLocaleString("en", { month: "short" }).toUpperCase();
    const day = String(start.getDate()).padStart(2, "0");
    const title = item.name || "Leave request";
    const category = item.type || "Leave";
    const end = item.endDate ? new Date(item.endDate) : start;
    const range = item.endDate ? `${formatDate(item.startDate, getUserTimeZone())} – ${formatDate(item.endDate, getUserTimeZone())}` : formatDate(item.startDate, getUserTimeZone());
    const adminActions = state.user?.role === "admin" ? `<div class="row-admin-actions">
      <button type="button" class="mini-action" data-action="edit-leave" data-id="${item.id}">Edit</button>
      <button type="button" class="mini-action danger" data-action="delete-leave" data-id="${item.id}">Delete</button>
    </div>` : "";
    return `<div class="holiday-row">
      <span class="holiday-date">${month}<br/>${day}</span>
      <div>
        <div class="holiday-name">${title}</div>
        <div class="holiday-place">${category} · ${item.location || dbLocation}</div>
        <div class="holiday-meta">${range}</div>
        <div class="holiday-status status-${item.status?.toLowerCase() || "approved"}">${item.status || "Approved"}</div>
        ${adminActions}
      </div>
    </div>`;
  }).join("");

  const renderPublicHolidayRows = (items) => items.map((item) => {
    const dateText = String(item.date || item.startDate || "").trim().slice(0, 10);
    const date = new Date(`${dateText}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || Number.isNaN(date.getTime())) return "";
    const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(date).toUpperCase();
    const day = new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: "UTC" }).format(date);
    const label = item.localName || item.name || "Public holiday";
    const dateLabel = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
    return `<div class="holiday-row">
      <span class="holiday-date">${month}<br/>${day}</span>
      <div>
        <div class="holiday-name">${label}</div>
        <div class="holiday-place">${item.created ? "Added holiday" : `Public holiday · ${item.country || state.holidayCountry}`}</div>
        <div class="holiday-meta">${dateLabel}</div>
        <div class="holiday-status status-approved">${item.created ? "Added holiday" : "Public holiday"}</div>
      </div>
    </div>`;
  }).join("");

  const publicHolidays = (state.holidayData || [])
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const createdHolidays = (state.leaveData || [])
    .filter((item) => String(item.type || "").toLowerCase() === "holiday")
    .map((item) => ({ ...item, date: item.startDate, localName: item.name, created: true }))
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const upcomingHolidayItems = [...publicHolidays, ...createdHolidays].sort(
    (a, b) => new Date(a.date || a.startDate) - new Date(b.date || b.startDate)
  );
  const timeOffItems = (state.leaveData || [])
    .filter((item) => String(item.type || "").toLowerCase() !== "holiday")
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  return `<div class="period-tabs dashboard-period-tabs" role="tablist" aria-label="Select dashboard period">
          <button class="tab ${state.dashboardPeriod === "day" ? "active" : ""}" type="button" id="tab-day" data-period="day" aria-pressed="${state.dashboardPeriod === "day"}">Today</button>
          <button class="tab ${state.dashboardPeriod === "week" ? "active" : ""}" type="button" id="tab-week" data-period="week" aria-pressed="${state.dashboardPeriod === "week"}">Week</button>
          <button class="tab ${state.dashboardPeriod === "month" ? "active" : ""}" type="button" id="tab-month" data-period="month" aria-pressed="${state.dashboardPeriod === "month"}">Month</button>
        </div>
        ${createBreakReasonModalHtml()}
        <div class="hero-area">
          <section class="card profile-card">
            <h2>Hello ${state.user.fullName}</h2>
            <div class="subtext">${heroSubtext}</div>
            <div class="profile-details-row"><span class="small-label">Location</span><span class="value-text">${dbLocation}</span></div>
            <div class="profile-details-row"><span class="small-label">Timezone</span><span class="value-text">${dbTimezone}</span></div>
          </section>
          <section class="card leave-summary-card">
            <div class="card-title-row">
              <div>
                <h2>Time off</h2>
                <span class="card-subtitle">Your upcoming leave requests</span>
              </div>
              <button class="icon-button dashboard-card-link" type="button" data-dashboard-page="timeoff" aria-label="View all time off">›</button>
            </div>
            <div class="holiday-list">${renderLeaveRows(timeOffItems.slice(0, 4)) || '<p class="empty-note">No upcoming time off.</p>'}</div>
          </section>
          <section class="card leave-summary-card">
            <div class="card-title-row">
              <div>
                <h2>Upcoming holidays</h2>
                <span class="card-subtitle">Public and added holidays</span>
              </div>
              <button class="icon-button dashboard-card-link" type="button" data-dashboard-page="holidays" aria-label="View all holidays">›</button>
            </div>
            <div class="holiday-list">${renderPublicHolidayRows(upcomingHolidayItems.slice(0, 4)) || '<p class="empty-note">No upcoming holidays.</p>'}</div>
          </section>
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

  const historyRows = getDisplayHistoryRows();
  const sortedRows = [...historyRows].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

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

  if (window.dailyHoursChartInstance) {
    window.dailyHoursChartInstance.destroy();
  }

  window.dailyHoursChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Worked",
          data: workedHours,
          backgroundColor: "rgba(44, 122, 122, 0.75)",
          borderColor: "rgba(44, 122, 122, 1)",
          borderWidth: 1,
          borderRadius: 4,
          stack: "hours",
        },
        {
          label: "Break",
          data: breakHours,
          backgroundColor: "rgba(245, 158, 11, 0.7)",
          borderColor: "rgba(245, 158, 11, 1)",
          borderWidth: 1,
          borderRadius: 4,
          stack: "hours",
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
          stacked: true,
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
          stacked: true,
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
  Promise.all([
    loadLeaves(),
    loadPublicHolidays(state.holidayCountry, state.holidayYear),
  ]).then(() => {
    root.innerHTML = createPageShell("Dashboard", createDashboardTemplate());
    attachDashboardListeners();
    updateDashboardValues();
    renderTimeline();
    renderHistory();
    renderDailyHoursChart();
  }).catch(() => {
    // Fallback: render with empty leaves data
    state.leaveData = [];
    root.innerHTML = createPageShell("Dashboard", createDashboardTemplate());
    attachDashboardListeners();
    updateDashboardValues();
    renderTimeline();
    renderHistory();
    renderDailyHoursChart();
  });
}

// Home page removed — login is now the default landing page.

function renderLogin() {
  root.innerHTML = renderLoginForm();

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
      state.employee = data;
      state.user = state.employee;
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

function openBreakReasonModal() {
  const modal = document.getElementById("break-reason-modal");
  const otherWrap = document.getElementById("break-reason-custom-wrap");
  if (!modal) return;

  const selected = document.querySelector('input[name="breakReason"]:checked');
  if (selected && selected.value === "Other") {
    if (otherWrap) otherWrap.style.display = "block";
  } else if (otherWrap) {
    otherWrap.style.display = "none";
    const otherInput = document.getElementById("break-reason-other");
    if (otherInput) otherInput.value = "";
  }

  modal.style.display = "flex";
}

function closeBreakReasonModal() {
  const modal = document.getElementById("break-reason-modal");
  if (modal) modal.style.display = "none";
}

function openAttendanceTimeModal(endpoint) {
  const modal = document.getElementById("attendance-time-modal");
  const form = document.getElementById("attendance-time-form");
  const input = document.getElementById("attendance-time");
  const title = document.getElementById("attendance-time-title");
  if (!modal || !form || !input) return;

  title.textContent = `${actionTextMap[endpoint] || "Attendance action"} time`;
  input.value = new Date().toISOString().slice(0, 16);
  form.dataset.endpoint = endpoint;
  modal.style.display = "flex";
  input.focus();
}

function closeAttendanceTimeModal() {
  const modal = document.getElementById("attendance-time-modal");
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

  for (const link of document.querySelectorAll("[data-dashboard-page]")) {
    link.addEventListener("click", () => setPage(link.dataset.dashboardPage));
  }

  const logoutButton = document.getElementById("logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
      } catch (err) {
        console.error("Logout API failed.", err);
      } finally {
        state.employee = null;
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
        state.holidayEditTarget = null;
        closeLeaveModal();
        if (state.page === "timeoff") renderTimeOff();
        else if (state.page === "holidays") renderHolidays();
        else renderDashboard();
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
        name: document.getElementById("schedule-name").value.trim(),
        date: document.getElementById("schedule-date").value,
        shift: document.getElementById("schedule-shift").value || "Morning",
        start: document.getElementById("schedule-start").value,
        end: document.getElementById("schedule-end").value,
        location: document.getElementById("schedule-location").value.trim() || state.user?.location || "Australia",
        assigned: document.getElementById("schedule-assigned").value.trim() || state.user?.fullName || "Team",
        status: document.getElementById("schedule-status").value || "Confirmed",
      };
      if (!nextRecord.name || !nextRecord.date || !nextRecord.start || !nextRecord.end || !nextRecord.location || !nextRecord.assigned) return;
      const existing = state.scheduleData.find((row) => row.id === nextRecord.id);
      if (existing) {
        Object.assign(existing, nextRecord);
      } else {
        state.scheduleData.push(nextRecord);
      }
      saveSchedules();
      closeScheduleModal();
      if (state.page === "work-schedules") renderWorkSchedules();
    });
  }

  const scheduleActions = document.querySelectorAll("[data-action='edit-schedule'], [data-action='delete-schedule']");
  for (const button of scheduleActions) {
    button.addEventListener("click", () => {
      const scheduleId = Number(button.dataset.id);
      const schedule = state.scheduleData.find((row) => row.id === scheduleId);
      if (!schedule) return;
      if (button.dataset.action === "edit-schedule") {
        openScheduleModal(schedule);
        return;
      }
      state.scheduleData = state.scheduleData.filter((row) => row.id !== scheduleId);
      saveSchedules();
      renderWorkSchedules();
    });
  }

  const tabs = document.querySelectorAll(".dashboard-period-tabs .tab");
  for (const tab of tabs) {
    tab.addEventListener("click", async () => {
      const nextPeriod = tab.dataset.period || "day";
      state.dashboardPeriod = normalizeDashboardPeriod(nextPeriod);
      await loadHistory(state.dashboardPeriod);
      renderDashboard();
    });
  }

  // Dashboard leave row actions - redirect to Leave Requests for editing
  const dashboardHolidayRows = document.querySelectorAll("[data-action='edit-leave']");
  for (const btn of dashboardHolidayRows) {
    btn.addEventListener("click", () => {
      setPage("timeoff");
    });
  }

  const deleteHolidayRows = document.querySelectorAll("[data-action='delete-leave']");
  for (const btn of deleteHolidayRows) {
    btn.addEventListener("click", async () => {
      const target = btn.dataset.id;
      if (!confirm("Are you sure you want to delete this leave request?")) {
        return;
      }
      try {
        await apiJson(`/api/attendance/leaves/${target}`, {
          method: "DELETE",
        });
        await loadLeaves();
        renderDashboard();
      } catch (error) {
        console.error("Failed to delete leave:", error);
        alert("Failed to delete leave. Please try again.");
      }
    });
  }

  // Add Leave button on dashboard
  // Leave modal event listeners (shared between dashboard and timeoff pages)
  attachLeaveModalListeners();

  const breakReasonInputs = document.querySelectorAll('input[name="breakReason"]');
  for (const input of breakReasonInputs) {
    input.addEventListener("change", () => {
      const otherWrap = document.getElementById("break-reason-custom-wrap");
      if (!otherWrap) return;
      otherWrap.style.display = input.value === "Other" ? "block" : "none";
      if (input.value !== "Other") {
        const otherInput = document.getElementById("break-reason-other");
        if (otherInput) otherInput.value = "";
      }
    });
  }

  const breakReasonForm = document.getElementById("break-reason-form");
  if (breakReasonForm) {
    breakReasonForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selected = document.querySelector('input[name="breakReason"]:checked');
      let reason = selected ? selected.value : "Breakfast";
      if (reason === "Other") {
        const otherInput = document.getElementById("break-reason-other");
        const customValue = otherInput ? otherInput.value.trim() : "";
        if (!customValue) {
          alert("Please tell us the reason for your break.");
          if (otherInput) otherInput.focus();
          return;
        }
        reason = customValue;
      }

      closeBreakReasonModal();
      openAttendanceTimeModal("break-start");
      const timeForm = document.getElementById("attendance-time-form");
      if (timeForm) timeForm.dataset.reason = reason;
    });
  }

  const breakReasonClose = document.getElementById("close-break-reason-modal");
  if (breakReasonClose) breakReasonClose.addEventListener("click", closeBreakReasonModal);

  const breakReasonCancel = document.getElementById("cancel-break-reason");
  if (breakReasonCancel) breakReasonCancel.addEventListener("click", closeBreakReasonModal);

  const breakReasonOverlay = document.getElementById("break-reason-modal");
  if (breakReasonOverlay) {
    breakReasonOverlay.addEventListener("click", (event) => {
      if (event.target === breakReasonOverlay) closeBreakReasonModal();
    });
  }

  const breakStart = document.getElementById("btn-break-start");
  if (breakStart) {
    breakStart.addEventListener("click", () => {
      openBreakReasonModal();
    });
  }

  const attendanceTimeForm = document.getElementById("attendance-time-form");
  if (attendanceTimeForm) {
    attendanceTimeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const time = document.getElementById("attendance-time").value;
      if (!time) return;
      const endpoint = attendanceTimeForm.dataset.endpoint;
      const reason = attendanceTimeForm.dataset.reason;
      closeAttendanceTimeModal();
      await performAction(endpoint, { timestampUtc: new Date(time).toISOString(), ...(reason ? { reason } : {}) });
      delete attendanceTimeForm.dataset.reason;
    });
  }

  const attendanceTimeCancel = document.getElementById("cancel-attendance-time");
  if (attendanceTimeCancel) attendanceTimeCancel.addEventListener("click", closeAttendanceTimeModal);
  const attendanceTimeClose = document.getElementById("close-attendance-time-modal");
  if (attendanceTimeClose) attendanceTimeClose.addEventListener("click", closeAttendanceTimeModal);

  for (const [buttonId, endpoint] of Object.entries(actionEndpointMap)) {
    const button = document.getElementById(buttonId);
    if (button) {
      if (endpoint === "break-start") {
        // Skip - we handle this separately above
        continue;
      } else {
        button.addEventListener("click", () => openAttendanceTimeModal(endpoint));
      }
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
    if (state.page === "timesheets") {
      const actionCell = document.createElement("td");
      const events = (day.events || []).filter((event) => ["check_in", "break_start", "break_end", "check_out"].includes(event.type));
      const firstEvent = events[0];
      const eventIds = events.map((event) => event.id).join(",");
      const dayActions = events.length ? `<span class="timesheet-history-day-actions"><button class="mini-action" type="button" data-edit-timesheet-day="${day.date}">Edit day</button><button class="mini-action danger" type="button" data-delete-timesheet-day="${eventIds}">Delete day</button></span>` : "";
      actionCell.innerHTML = dayActions || "—";
      tr.append(actionCell);
    }
    body.appendChild(tr);
  });
}

function createCell(content, className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = content;
  return td;
}

async function performAction(endpoint, extraPayload = {}) {
  setBusy(true);
  try {
    const loc = await captureLocation();
    const data = await apiJson(`/api/attendance/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...loc, ...extraPayload }),
    });
    state.status = data.status;
    state.todayEvents = data.today;
    // Break allowance is temporarily disabled.
    // if (data.breakAllowance) {
    //   state.breakAllowance = data.breakAllowance;
    // }
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

function openLeaveModal(leaveId, holidayMode = false) {
  const modal = document.getElementById("leave-modal");
  const modalTitle = document.getElementById("leave-modal-title");
  if (!modal) return;

  const isAdmin = state.user?.role === "admin";
  const leave = leaveId == null ? (holidayMode ? state.holidayEditTarget : null) : (state.leaveData || []).find((row) => row.id === leaveId);
  const idInput = document.getElementById("leave-id");
  const nameInput = document.getElementById("leave-name");
  const typeInput = document.getElementById("leave-type");
  const locationInput = document.getElementById("leave-location");
  const dateInput = document.getElementById("leave-date");
  const endDateInput = document.getElementById("leave-end-date");
  const reasonInput = document.getElementById("leave-reason");
  const statusInput = document.getElementById("leave-status");

  if (modalTitle) modalTitle.textContent = holidayMode ? (leave ? "Edit Holiday" : "New Upcoming Holiday") : leave ? (isAdmin ? "Edit Leave Request" : "View/Edit Leave Request") : "New Leave Request";
  if (idInput) idInput.value = leave ? String(leave.id) : "";
  if (nameInput) nameInput.value = leave?.name || "";
  if (typeInput) {
    typeInput.value = holidayMode ? "Holiday" : leave?.type || "Annual Leave";
    typeInput.disabled = holidayMode;
  }
  const nameLabel = document.getElementById("leave-name-label");
  const reasonLabel = document.getElementById("leave-reason-label");
  const submitButton = document.getElementById("submit-leave");
  if (nameLabel) nameLabel.childNodes[0].textContent = holidayMode ? "Holiday Name " : "Leave Name ";
  if (reasonLabel) reasonLabel.childNodes[0].textContent = holidayMode ? "Description " : "Reason ";
  if (submitButton) submitButton.textContent = holidayMode ? (leave ? "Save Holiday" : "Create Holiday") : "Submit Request";
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

function attachLeaveModalListeners() {
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
        status: document.getElementById("leave-status").value || "Requested",
      };
      if (!payload.name || !payload.startDate || !payload.endDate || !payload.reason) return;
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
        } else if (state.page === "holidays") {
          renderHolidays();
        } else {
          renderDashboard();
        }
      } catch (error) {
        console.error("Failed to save leave:", error);
        alert("Failed to save leave. Please try again.");
      }
    });
  }
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

function createEmployeeManagementTemplate() {
  const users = state.employees || state.users || [];
  const userRows = users.map((user) => `
    <tr>
      <td>${user.fullName || "—"}</td>
      <td>${user.username || "—"}</td>
      <td><span class="badge role-badge role-${user.role === "user" ? "employee" : (user.role || "employee")}">${user.role === "user" ? "employee" : (user.role || "employee")}</span></td>
      <td>${user.location || "—"}</td>
      <td>${user.timezone || "—"}</td>
      <td>
        <button type="button" class="mini-action" data-action="edit-user" data-id="${user.id}">Edit</button>
        <button type="button" class="mini-action" data-action="delete-user" data-id="${user.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  return `<section class="card users-card">
          <div class="card-title-row">
            <h2>Employee Management</h2>
            <div class="admin-inline-actions">
              <button class="btn btn-primary" type="button" id="add-user">Create New Employee</button>
              <button class="btn btn-ghost" type="button" id="refresh-users">↻ Refresh</button>
            </div>
          </div>
          <div class="users-table-container">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Timezone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="users-body">${userRows || '<tr><td colspan="6" class="empty-note">No employees found. Create the first employee to get started.</td></tr>'}</tbody>
            </table>
          </div>
        </section>
        <div class="task-modal-overlay" id="user-modal" style="display:none;">
          <div class="task-modal-card">
            <div class="task-modal-header">
              <h3 id="user-modal-title">Create New Employee</h3>
              <button class="icon-button" id="close-user-modal" type="button">&times;</button>
            </div>
            <form id="user-form">
              <input type="hidden" id="user-id" />
              <div class="form-section"><h4 class="form-section-title">Employee Details</h4><div class="form-grid">
                <label class="field-block full-width"><span>Full Name <span class="required-indicator">*</span></span><input id="user-fullname" required /></label>
                <label class="field-block"><span>Username <span class="required-indicator">*</span></span><input id="user-username" required /></label>
                <label class="field-block"><span>Role</span><select id="user-role"><option value="employee">Employee</option><option value="admin">Admin</option></select></label>
                <label class="field-block"><span>Location</span><input id="user-location" /></label>
                <label class="field-block"><span>Timezone</span><input id="user-timezone" /></label>
                <label class="field-block full-width"><span>Password <span id="user-password-hint">*</span></span><input id="user-password" type="password" minlength="8" /></label>
              </div></div>
              <div class="form-section"><div class="form-grid form-actions-grid">
                <button class="btn btn-ghost" type="button" id="cancel-user">Cancel</button>
                <button class="btn btn-primary" type="submit" id="submit-user">Create Employee</button>
              </div></div>
            </form>
          </div>
        </div>
        <!-- Break allowance form is temporarily disabled. Restore this block when needed.
        <div class="task-modal-overlay" id="break-allowance-modal" style="display:none;">
          <div class="task-modal-card">
            <div class="task-modal-header">
              <h3>Edit Break Allowance</h3>
              <button class="icon-button" id="close-break-allowance-modal" type="button">×</button>
            </div>
            <form id="break-allowance-form">
              <input type="hidden" id="break-allowance-user-id" />
              <div class="form-section">
                <h4 class="form-section-title">Break Time Settings</h4>
                <div class="form-grid">
                  <label class="field-block full-width"><span>Daily Break Allowance (minutes)</span><input id="break-allowance-minutes" type="number" min="0" max="480" placeholder="60" /></label>
                </div>
              </div>
              <div class="form-section">
                <div class="form-grid form-actions-grid">
                  <button class="btn btn-ghost" type="button" id="cancel-break-allowance">Cancel</button>
                  <button class="btn btn-primary" type="submit" id="submit-break-allowance">Update Allowance</button>
                </div>
              </div>
            </form>
          </div>
        </div>
        -->
      `;
}

function renderEmployeeManagement() {
  loadEmployees().then(() => {
    root.innerHTML = createPageShell("Employee Management", createEmployeeManagementTemplate());
    attachDashboardListeners();
    updateUserManagementListeners();
  }).catch(() => {
    state.users = [];
    root.innerHTML = createPageShell("Employee Management", createEmployeeManagementTemplate());
    attachDashboardListeners();
    updateUserManagementListeners();
  });
}

function updateUserManagementListeners() {
  const addUserButton = document.getElementById("add-user");
  if (addUserButton) {
    addUserButton.addEventListener("click", () => openUserModal(null));
  }

  for (const button of document.querySelectorAll("[data-action='edit-user']")) {
    button.addEventListener("click", () => {
      const user = (state.employees || []).find((employee) => String(employee.id) === String(button.dataset.id));
      if (user) openUserModal(user);
    });
  }

  for (const button of document.querySelectorAll("[data-action='delete-user']")) {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this employee? This cannot be undone.")) return;
      try {
        await deleteEmployee(button.dataset.id);
        await loadEmployees();
        renderEmployeeManagement();
      } catch (error) {
        console.error("Failed to delete employee:", error);
        alert(error.error || "Failed to delete employee. Please try again.");
      }
    });
  }

  const refreshButton = document.getElementById("refresh-users");
  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      await loadEmployees();
      if (state.page === "user-management") renderEmployeeManagement();
    });
  }

  // Break allowance is temporarily disabled.
  // Re-enable later by restoring the edit buttons, modal markup, and submit handler.
  // const editBreakButtons = document.querySelectorAll("[data-action='edit-break-allowance']");
  // for (const btn of editBreakButtons) {
  //   btn.addEventListener("click", () => {
  //     const userId = btn.dataset.id;
  //     const currentAllowance = btn.dataset.breakAllowance || 60;
  //     openBreakAllowanceModal(userId, currentAllowance);
  //   });
  // }
  // const breakAllowanceForm = document.getElementById("break-allowance-form");
  // if (breakAllowanceForm) {
  //   breakAllowanceForm.addEventListener("submit", async (event) => {
  //     event.preventDefault();
  //     const userId = document.getElementById("break-allowance-user-id").value;
  //     const dailyBreakAllowanceMinutes = parseInt(document.getElementById("break-allowance-minutes").value) || 60;
  //     if (!userId) {
  //       alert("Employee ID is required.");
  //       return;
  //     }
  //     try {
  //       await updateEmployeeBreakAllowance(userId, dailyBreakAllowanceMinutes);
  //       await loadEmployees();
  //       closeBreakAllowanceModal();
  //       if (state.page === "user-management") renderEmployeeManagement();
  //     } catch (error) {
  //       console.error("Failed to update break allowance:", error);
  //       alert(error.error || "Failed to update break allowance. Please try again.");
  //     }
  //   });
  // }

  const userForm = document.getElementById("user-form");
  if (userForm) {
    userForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const employeeId = document.getElementById("user-id").value;
      const payload = {
        fullName: document.getElementById("user-fullname").value,
        username: document.getElementById("user-username").value,
        password: document.getElementById("user-password").value,
        role: document.getElementById("user-role").value,
        location: document.getElementById("user-location").value || null,
        timezone: document.getElementById("user-timezone").value || null,
        dailyBreakAllowanceMinutes: 60,
      };

      if (!payload.fullName || !payload.username || (!employeeId && !payload.password)) {
        alert("Please fill in all required fields.");
        return;
      }
      if (employeeId && !payload.password) delete payload.password;

      try {
        if (employeeId) await updateEmployee(employeeId, payload);
        else await createEmployee(payload);
        await loadEmployees();
        closeUserModal();
        if (state.page === "user-management") renderEmployeeManagement();
      } catch (error) {
        console.error("Failed to create employee:", error);
        alert(error.error || "Failed to create employee. Please try again.");
      }
    });
  }

  const cancelUserButton = document.getElementById("cancel-user");
  if (cancelUserButton) {
    cancelUserButton.addEventListener("click", closeUserModal);
  }

  const closeUserModalButton = document.getElementById("close-user-modal");
  if (closeUserModalButton) {
    closeUserModalButton.addEventListener("click", closeUserModal);
  }

  const userModalOverlay = document.getElementById("user-modal");
  if (userModalOverlay) {
    userModalOverlay.addEventListener("click", (event) => {
      if (event.target === userModalOverlay) closeUserModal();
    });
  }
}

function openUserModal(user = null) {
  const modal = document.getElementById("user-modal");
  if (!modal) return;

  const fullnameInput = document.getElementById("user-fullname");
  const usernameInput = document.getElementById("user-username");
  const passwordInput = document.getElementById("user-password");
  const roleInput = document.getElementById("user-role");
  const locationInput = document.getElementById("user-location");
  const timezoneInput = document.getElementById("user-timezone");
  const breakAllowanceInput = document.getElementById("user-break-allowance");
  const idInput = document.getElementById("user-id");
  const modalTitle = document.getElementById("user-modal-title");
  const submitButton = document.getElementById("submit-user");
  const passwordHint = document.getElementById("user-password-hint");

  if (idInput) idInput.value = user?.id || "";
  if (modalTitle) modalTitle.textContent = user ? "Edit Employee" : "Create New Employee";
  if (submitButton) submitButton.textContent = user ? "Save Changes" : "Create Employee";
  if (fullnameInput) fullnameInput.value = user?.fullName || "";
  if (usernameInput) usernameInput.value = user?.username || "";
  if (passwordInput) passwordInput.value = "";
  if (passwordInput) passwordInput.required = !user;
  if (passwordHint) passwordHint.textContent = user ? "(leave blank to keep current)" : "*";
  if (roleInput) roleInput.value = user?.role === "user" ? "employee" : (user?.role || "employee");
  if (locationInput) locationInput.value = user?.location || state.user?.location || "";
  if (timezoneInput) timezoneInput.value = user?.timezone || state.user?.timezone || "";
  if (breakAllowanceInput) breakAllowanceInput.value = user?.dailyBreakAllowanceMinutes || "60";

  modal.style.display = "flex";
  setTimeout(() => fullnameInput.focus(), 100);
}

// Break allowance modal helpers are temporarily disabled.
// Re-enable these later when the feature is needed again.
// function openBreakAllowanceModal(userId, currentAllowance) {
//   const modal = document.getElementById("break-allowance-modal");
//   if (!modal) return;
//
//   const userIdInput = document.getElementById("break-allowance-user-id");
//   const allowanceInput = document.getElementById("break-allowance-minutes");
//
//   if (userIdInput) userIdInput.value = userId;
//   if (allowanceInput) allowanceInput.value = currentAllowance || 60;
//
//   modal.style.display = "flex";
//   setTimeout(() => allowanceInput.focus(), 100);
// }
//
// function closeBreakAllowanceModal() {
//   const modal = document.getElementById("break-allowance-modal");
//   if (modal) modal.style.display = "none";
// }

function closeUserModal() {
  const modal = document.getElementById("user-modal");
  if (modal) modal.style.display = "none";
}

