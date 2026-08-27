function createTimesheetEntryForm() {
  const today = new Date().toISOString().slice(0, 10);
  return `<div class="task-modal-overlay timesheet-modal" id="timesheet-entry-card" hidden>
    <div class="task-modal-card timesheet-modal-card">
      <div class="task-modal-header"><h3 id="timesheet-entry-title">New timesheet</h3><button class="icon-button" type="button" id="close-timesheet" aria-label="Close timesheet dialog">&times;</button></div>
      <form id="timesheet-entry-form" class="timesheet-manual-form">
        <p class="timesheet-form-intro">Enter your work hours and total break time for the day.</p>
        <label class="field-block"><span>Date</span><input id="timesheet-date" type="date" value="${today}" required /></label>
      <div class="timesheet-time-grid">
        <label class="field-block"><span>Work Start Time</span><input name="check_in" type="time" required /></label>
        <label class="field-block"><span>Work End Time</span><input name="check_out" type="time" required /></label>
        <label class="field-block"><span>Total Break Time (minutes)</span><input name="total_break_minutes" type="number" min="0" step="1" placeholder="0" /></label>
      </div>
        <label class="field-block"><span>Break reason</span><input id="timesheet-break-reason" maxlength="200" placeholder="Optional" /></label>
        <p class="form-error" id="timesheet-form-error" role="alert"></p>
        <div class="form-actions-grid timesheet-form-actions"><button class="btn btn-ghost" type="button" id="cancel-timesheet">Cancel</button><button class="btn btn-primary" type="submit">Save timesheet</button></div>
      </form>
    </div>
  </div>`;
}

function timesheetEventLabel(type) {
  return {
    check_in: "Check in",
    break_start: "Break start",
    break_end: "Break end",
    check_out: "Check out",
  }[type] || type;
}

function timesheetInputParts(timestampUtc) {
  const date = new Date(timestampUtc);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getUserTimeZone(), year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date).reduce((values, part) => ({ ...values, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function createTimesheetEditForm() {
  return `<div class="task-modal-overlay timesheet-modal" id="timesheet-edit-card" hidden>
    <div class="task-modal-card timesheet-modal-card">
      <div class="task-modal-header"><h3>Edit attendance time</h3><button class="icon-button" type="button" id="close-timesheet-edit" aria-label="Close edit dialog">&times;</button></div>
      <form id="timesheet-edit-form" class="timesheet-manual-form">
      <input id="edit-timesheet-event-id" type="hidden" />
      <label class="field-block"><span>Event</span><input id="edit-timesheet-event-label" type="text" readonly /></label>
      <div class="timesheet-edit-date-time"><label class="field-block"><span>Date</span><input id="edit-timesheet-date" type="date" required /></label><label class="field-block"><span>Time</span><input id="edit-timesheet-time" type="time" required /></label></div>
      <label class="field-block"><span>Break reason</span><input id="edit-timesheet-reason" maxlength="200" placeholder="Optional" /></label>
      <p class="form-error" id="timesheet-edit-error" role="alert"></p>
      <div class="form-actions-grid timesheet-form-actions"><button class="btn btn-ghost" type="button" id="cancel-timesheet-edit">Cancel</button><button class="btn btn-primary" type="submit">Save change</button></div>
      </form>
    </div>
  </div>`;
}

function openTimesheetEventEditor(event) {
  const editCard = document.getElementById("timesheet-edit-card");
  const editForm = document.getElementById("timesheet-edit-form");
  if (!event || !editCard || !editForm) return;
  document.getElementById("edit-timesheet-event-id").value = event.id;
  document.getElementById("edit-timesheet-event-label").value = timesheetEventLabel(event.type);
  const inputParts = timesheetInputParts(event.timestampUtc);
  document.getElementById("edit-timesheet-date").value = inputParts.date;
  document.getElementById("edit-timesheet-time").value = inputParts.time;
  document.getElementById("edit-timesheet-reason").value = event.reason || "";
  editCard.hidden = false;
  editForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function openTimesheetDayEditor(dateKey) {
  const entryCard = document.getElementById("timesheet-entry-card");
  const entryForm = document.getElementById("timesheet-entry-form");
  if (!entryCard || !entryForm) return;
  const historyDay = (state.historyData || []).find((day) => day.date === dateKey);
  const events = (historyDay?.events || []).filter((event) => ["check_in", "break_start", "break_end", "check_out"].includes(event.type));
  if (!events.length) return;

  entryForm.reset();
  entryForm.dataset.mode = "edit-day";
  entryForm._editEvents = events;
  document.getElementById("timesheet-entry-title").textContent = "Edit timesheet";
  document.getElementById("timesheet-date").value = dateKey;
  
  // Populate work start/end times
  const checkInEvent = events.find(e => e.type === "check_in");
  const checkOutEvent = events.find(e => e.type === "check_out");
  if (checkInEvent) {
    entryForm.querySelector("[name=check_in]").value = timesheetInputParts(checkInEvent.timestampUtc).time;
  }
  if (checkOutEvent) {
    entryForm.querySelector("[name=check_out]").value = timesheetInputParts(checkOutEvent.timestampUtc).time;
  }
  
  // Calculate and populate total break minutes
  const breakSeconds = historyDay?.breakSeconds || 0;
  const breakMinutes = Math.round(breakSeconds / 60);
  if (breakMinutes > 0) {
    entryForm.querySelector("[name=total_break_minutes]").value = breakMinutes;
  }
  
  // Populate break reason if exists
  const breakStartEvent = events.find(e => e.type === "break_start");
  if (breakStartEvent?.reason) {
    document.getElementById("timesheet-break-reason").value = breakStartEvent.reason;
  }
  
  entryCard.hidden = false;
  const newButton = document.getElementById("new-timesheet");
  if (newButton) newButton.hidden = true;
}

function attachTimesheetFormListeners() {
  const entryCard = document.getElementById("timesheet-entry-card");
  const entryForm = document.getElementById("timesheet-entry-form");
  const errorBox = document.getElementById("timesheet-form-error");
  if (!entryCard || !entryForm) return;

  const newButton = document.getElementById("new-timesheet");
  if (newButton) newButton.addEventListener("click", () => {
    entryForm.dataset.mode = "new";
    entryForm._editEvents = [];
    document.getElementById("timesheet-entry-title").textContent = "New timesheet";
    entryForm.reset();
    document.getElementById("timesheet-date").value = new Date().toISOString().slice(0, 10);
    entryCard.hidden = false;
    newButton.hidden = true;
    entryForm.querySelector("input")?.focus();
  });

  const cancelButton = document.getElementById("cancel-timesheet");
  if (cancelButton) cancelButton.addEventListener("click", () => {
    entryForm.reset();
    document.getElementById("timesheet-date").value = new Date().toISOString().slice(0, 10);
    entryCard.hidden = true;
    entryForm.dataset.mode = "new";
    entryForm._editEvents = [];
    if (newButton) newButton.hidden = false;
  });
  const closeButton = document.getElementById("close-timesheet");
  if (closeButton) closeButton.addEventListener("click", () => { entryCard.hidden = true; if (newButton) newButton.hidden = false; });
  entryCard.addEventListener("click", (event) => {
    if (event.target === entryCard) {
      entryCard.hidden = true;
      if (newButton) newButton.hidden = false;
    }
  });

  entryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (errorBox) errorBox.textContent = "";
    const formData = new FormData(entryForm);
    const date = document.getElementById("timesheet-date").value;
    const checkInTime = formData.get("check_in");
    const checkOutTime = formData.get("check_out");
    const totalBreakMinutes = parseInt(formData.get("total_break_minutes") || "0");
    
    if (!checkInTime || !checkOutTime) {
      if (errorBox) errorBox.textContent = "Work start and end times are required.";
      return;
    }
    if (checkInTime >= checkOutTime) {
      if (errorBox) errorBox.textContent = "Work end time must be after work start time.";
      return;
    }
    
    // Validate break time doesn't exceed work duration
    const checkInDate = new Date(`${date}T${checkInTime}`);
    const checkOutDate = new Date(`${date}T${checkOutTime}`);
    const workDurationMinutes = (checkOutDate - checkInDate) / (60 * 1000);
    if (totalBreakMinutes >= workDurationMinutes) {
      if (errorBox) errorBox.textContent = "Break time cannot exceed work duration.";
      return;
    }

    const submitButton = entryForm.querySelector("button[type=submit]");
    if (submitButton) submitButton.disabled = true;
    try {
      const reason = document.getElementById("timesheet-break-reason").value.trim();
      const editEvents = entryForm._editEvents || [];
      
      // Delete existing events for this day
      for (const existing of editEvents) {
        await apiJson(`/api/attendance/events/${existing.id}`, { method: "DELETE" });
      }
      
      // Create new events in chronological order
      const checkInPayload = {
        timestampUtc: new Date(`${date}T${checkInTime}`).toISOString(),
      };
      await apiJson(`/api/attendance/check-in`, {
        method: "POST",
        body: JSON.stringify(checkInPayload),
      });
      
      // If break time is specified, create break events in the middle of work period
      if (totalBreakMinutes > 0) {
        const checkInTimeMs = new Date(`${date}T${checkInTime}`).getTime();
        const checkOutTimeMs = new Date(`${date}T${checkOutTime}`).getTime();
        const workDurationMs = checkOutTimeMs - checkInTimeMs;
        
        // Start break at midpoint of work period
        const breakStartTimeMs = checkInTimeMs + (workDurationMs / 2) - (totalBreakMinutes * 60 * 1000 / 2);
        const breakStartPayload = {
          timestampUtc: new Date(breakStartTimeMs).toISOString(),
          reason: reason || "Break",
        };
        await apiJson(`/api/attendance/break-start`, {
          method: "POST",
          body: JSON.stringify(breakStartPayload),
        });
        
        // End break after break duration
        const breakEndTimeMs = breakStartTimeMs + (totalBreakMinutes * 60 * 1000);
        const breakEndPayload = {
          timestampUtc: new Date(breakEndTimeMs).toISOString(),
        };
        await apiJson(`/api/attendance/break-end`, {
          method: "POST",
          body: JSON.stringify(breakEndPayload),
        });
      }
      
      // Create check-out event last
      const checkOutPayload = {
        timestampUtc: new Date(`${date}T${checkOutTime}`).toISOString(),
      };
      await apiJson(`/api/attendance/check-out`, {
        method: "POST",
        body: JSON.stringify(checkOutPayload),
      });
      
      await loadToday();
      await loadHistory();
      renderTimesheets();
    } catch (error) {
      console.error("[Timesheet] Save failed", error);
      if (errorBox) errorBox.textContent = error.error || "Unable to save the timesheet.";
      if (submitButton) submitButton.disabled = false;
    }
  });

  const editCard = document.getElementById("timesheet-edit-card");
  const editForm = document.getElementById("timesheet-edit-form");
  const editError = document.getElementById("timesheet-edit-error");
  for (const button of document.querySelectorAll("[data-edit-timesheet-day]")) {
    button.addEventListener("click", () => openTimesheetDayEditor(button.dataset.editTimesheetDay));
  }

  for (const button of document.querySelectorAll("[data-delete-timesheet-day]")) {
    button.addEventListener("click", () => deleteTimesheetDay(button.dataset.deleteTimesheetDay));
  }

  const historyBody = document.getElementById("history-body");
  if (historyBody) historyBody.addEventListener("click", (event) => {
    const deleteDayButton = event.target.closest("[data-delete-timesheet-day]");
    if (deleteDayButton) {
      deleteTimesheetDay(deleteDayButton.dataset.deleteTimesheetDay);
      return;
    }
    const editDayButton = event.target.closest("[data-edit-timesheet-day]");
    if (editDayButton) {
      openTimesheetDayEditor(editDayButton.dataset.editTimesheetDay);
      return;
    }
    const button = event.target.closest("[data-edit-timesheet-event]");
    if (!button) return;
    const selected = (state.todayEvents || []).find((item) => item.id === button.dataset.editTimesheetEvent) || {
      id: button.dataset.editTimesheetEvent,
      type: button.dataset.eventType,
      timestampUtc: button.dataset.eventTimestamp,
      reason: "",
    };
    openTimesheetEventEditor(selected);
  });

  const cancelEdit = document.getElementById("cancel-timesheet-edit");
  if (cancelEdit) cancelEdit.addEventListener("click", () => { editCard.hidden = true; });
  const closeEdit = document.getElementById("close-timesheet-edit");
  if (closeEdit) closeEdit.addEventListener("click", () => { editCard.hidden = true; });
  if (editCard) editCard.addEventListener("click", (event) => {
    if (event.target === editCard) editCard.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    entryCard.hidden = true;
    if (newButton) newButton.hidden = false;
    if (editCard) editCard.hidden = true;
  });
  if (editForm) editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (editError) editError.textContent = "";
    const saveButton = editForm.querySelector("button[type=submit]");
    if (saveButton) saveButton.disabled = true;
    try {
      await apiJson(`/api/attendance/events/${document.getElementById("edit-timesheet-event-id").value}`, {
        method: "PUT",
        body: JSON.stringify({
          timestampUtc: new Date(`${document.getElementById("edit-timesheet-date").value}T${document.getElementById("edit-timesheet-time").value}`).toISOString(),
          reason: document.getElementById("edit-timesheet-reason").value.trim(),
        }),
      });
      await loadToday();
      await loadHistory();
      renderTimesheets();
    } catch (error) {
      if (editError) editError.textContent = error.error || "Unable to update this event.";
      if (saveButton) saveButton.disabled = false;
    }
  });
}

function createWeeklyMatrixView() {
  const zone = getUserTimeZone();
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekData = weekDays.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    const dayData = (state.historyData || []).find(d => d.date === dateKey);
    const hasData = dayData && dayData.events && dayData.events.length > 0;
    
    return {
      day,
      date: dateKey,
      workStart: dayData?.checkInUtc ? formatTime(dayData.checkInUtc, zone) : '—',
      workEnd: dayData?.checkOutUtc ? formatTime(dayData.checkOutUtc, zone) : '—',
      breakTime: dayData ? formatDuration(dayData.breakSeconds) : '—',
      workTime: dayData ? formatDuration(dayData.workedSeconds) : '—',
      hasData,
      eventIds: hasData ? dayData.events.map(e => e.id).join(',') : ''
    };
  });

  const matrixRows = weekData.map(day => `
    <tr class="matrix-row">
      <td class="matrix-day">${day.day}</td>
      <td class="matrix-date">${day.date}</td>
      <td class="matrix-time">${day.workStart}</td>
      <td class="matrix-time">${day.workEnd}</td>
      <td class="matrix-duration">${day.breakTime}</td>
      <td class="matrix-duration work-time">${day.workTime}</td>
      <td class="matrix-actions">
        ${day.hasData ? `
          <button type="button" class="mini-action icon-action" title="Edit" data-edit-timesheet-day="${day.date}">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button type="button" class="mini-action danger icon-action" title="Delete" data-delete-timesheet-day="${day.eventIds}">
            <span class="material-symbols-outlined">delete</span>
          </button>
        ` : '<span class="no-data">—</span>'}
      </td>
    </tr>
  `).join('');

  return `<div class="card weekly-matrix-card">
    <div class="card-heading"><h2>Weekly Timesheet Matrix</h2></div>
    <div class="matrix-table-container">
      <table class="weekly-matrix-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Date</th>
            <th>Work Start</th>
            <th>Work End</th>
            <th>Total Break Time</th>
            <th>Net Work Time</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${matrixRows}</tbody>
      </table>
    </div>
  </div>`;
}

function createTimesheetsTemplate() {
  const zone = getUserTimeZone();
  const selectedPeriod = normalizeDashboardPeriod(state.dashboardPeriod);
  const periodDesc = selectedPeriod === "week" ? "this week" : selectedPeriod === "month" ? "this month" : "today";
  const dayDurations = computeDurationsClient(state.todayEvents);
  const summaryWorked = formatDuration(dayDurations.workedSeconds);
  const summaryBreak = formatDuration(dayDurations.breakSeconds);
  const standardSeconds = selectedPeriod === "week" ? 40 * 3600 : selectedPeriod === "month" ? 160 * 3600 : 8 * 3600;
  const summaryOvertime = formatDuration(Math.max(0, (dayDurations.workedSeconds || 0) - standardSeconds));

    return `<div class="period-tabs timesheet-period-tabs" role="tablist" aria-label="Select timesheet period">
        <button class="tab ${state.dashboardPeriod === "day" ? "active" : ""}" type="button" data-period="day" aria-pressed="${state.dashboardPeriod === "day"}">Today</button>
        <button class="tab ${state.dashboardPeriod === "week" ? "active" : ""}" type="button" data-period="week" aria-pressed="${state.dashboardPeriod === "week"}">Week</button>
        <button class="tab ${state.dashboardPeriod === "month" ? "active" : ""}" type="button" data-period="month" aria-pressed="${state.dashboardPeriod === "month"}">Month</button>
      </div>
      <section class="card timesheet-toolbar"><div><h2>Timesheets</h2><p>Review your recorded work hours or add a manual entry.</p></div><button class="btn btn-primary" type="button" id="new-timesheet">New Timesheet</button></section>
      ${createTimesheetEntryForm()}
      ${createTimesheetEditForm()}
      <section class="card tracked-card">
          <div class="card-heading"><h2>Timesheet summary</h2></div>
          <div class="metric-panel">
            <div class="metrics-left">
              <div class="metric-line"><span class="metric-label">Worked ${periodDesc}</span><span class="metric-value" id="worked-value">${summaryWorked}</span></div>
              <div class="metric-line"><span class="metric-label">Breaks ${periodDesc}</span><span class="metric-value" id="break-value">${summaryBreak}</span></div>
              <div class="metric-line"><span class="metric-label">Overtime ${periodDesc}</span><span class="metric-value" id="overtime-value">${summaryOvertime}</span></div>
            </div>
          </div>
        </section>
        ${state.dashboardPeriod === "week" ? createWeeklyMatrixView() : ''}
      `;
}

async function deleteTimesheetDay(eventIds) {
  const ids = String(eventIds || "").split(",").filter(Boolean);
  if (!ids.length || !window.confirm("Delete the complete timesheet for this day? This cannot be undone.")) return;
  try {
    for (const eventId of ids) {
      await apiJson(`/api/attendance/events/${eventId}`, { method: "DELETE" });
    }
    await loadToday();
    await loadHistory();
    renderTimesheets();
  } catch (error) {
    alert(error.error || "Unable to delete the daily timesheet.");
  }
}