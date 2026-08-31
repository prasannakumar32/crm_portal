function createTimesheetEntryForm() {
  const today = getDateKeyInTimeZone();
  return `<div class="task-modal-overlay timesheet-modal" id="timesheet-entry-card" hidden>
    <div class="task-modal-card timesheet-modal-card">
      <div class="task-modal-header"><h3 id="timesheet-entry-title">New timesheet</h3><button class="icon-button" type="button" id="close-timesheet" aria-label="Close timesheet dialog">&times;</button></div>
      <form id="timesheet-entry-form" class="timesheet-manual-form">
        <p class="timesheet-form-intro">Enter your work hours and total break time for the day.</p>
        <label class="field-block"><span>Date</span><input id="timesheet-date" type="date" value="${today}" required /></label>
      <div class="timesheet-time-grid">
        <label class="field-block"><span>Work Start Time</span>
          <div class="time-input-wrapper">
            <div class="time-input-group">
              <input name="check_in_hour" type="number" min="1" max="12" placeholder="12" required class="time-hour" />
              <span class="time-separator">:</span>
              <input name="check_in_minute" type="number" min="0" max="59" placeholder="00" required class="time-minute" />
              <select name="check_in_ampm" class="time-ampm">
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </label>
        <label class="field-block"><span>Work End Time</span>
          <div class="time-input-wrapper">
            <div class="time-input-group">
              <input name="check_out_hour" type="number" min="1" max="12" placeholder="12" required class="time-hour" />
              <span class="time-separator">:</span>
              <input name="check_out_minute" type="number" min="0" max="59" placeholder="00" required class="time-minute" />
              <select name="check_out_ampm" class="time-ampm">
                <option value="AM">AM</option>
                <option value="PM" selected>PM</option>
              </select>
            </div>
          </div>
        </label>
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

function openTimesheetForDate(dateKey) {
  const entryCard = document.getElementById("timesheet-entry-card");
  const entryForm = document.getElementById("timesheet-entry-form");
  if (!entryCard || !entryForm) return;
  
  entryForm.reset();
  entryForm.dataset.mode = "new";
  entryForm._editEvents = [];
  document.getElementById("timesheet-entry-title").textContent = "New timesheet";
  document.getElementById("timesheet-date").value = dateKey;
  entryCard.hidden = false;
  
  entryForm.querySelector("input")?.focus();
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
  
  // Populate work start/end times with AM/PM format
  const checkInEvent = events.find(e => e.type === "check_in");
  const checkOutEvent = events.find(e => e.type === "check_out");
  
  if (checkInEvent) {
    const checkInTime = timesheetInputParts(checkInEvent.timestampUtc).time;
    const [hour, minute] = checkInTime.split(':').map(Number);
    const isPM = hour >= 12;
    const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    entryForm.querySelector("[name=check_in_hour]").value = hour12;
    entryForm.querySelector("[name=check_in_minute]").value = String(minute).padStart(2, '0');
    entryForm.querySelector("[name=check_in_ampm]").value = isPM ? "PM" : "AM";
  }
  if (checkOutEvent) {
    const checkOutTime = timesheetInputParts(checkOutEvent.timestampUtc).time;
    const [hour, minute] = checkOutTime.split(':').map(Number);
    const isPM = hour >= 12;
    const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    entryForm.querySelector("[name=check_out_hour]").value = hour12;
    entryForm.querySelector("[name=check_out_minute]").value = String(minute).padStart(2, '0');
    entryForm.querySelector("[name=check_out_ampm]").value = isPM ? "PM" : "AM";
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
}

function attachTimesheetFormListeners() {
  const entryCard = document.getElementById("timesheet-entry-card");
  const entryForm = document.getElementById("timesheet-entry-form");
  const errorBox = document.getElementById("timesheet-form-error");
  if (!entryCard || !entryForm) return;

  const cancelButton = document.getElementById("cancel-timesheet");
  if (cancelButton) cancelButton.addEventListener("click", () => {
    entryForm.reset();
    document.getElementById("timesheet-date").value = getDateKeyInTimeZone();
    entryCard.hidden = true;
    entryForm.dataset.mode = "new";
    entryForm._editEvents = [];
  });
  const closeButton = document.getElementById("close-timesheet");
  if (closeButton) closeButton.addEventListener("click", () => { entryCard.hidden = true; });
  entryCard.addEventListener("click", (event) => {
    if (event.target === entryCard) {
      entryCard.hidden = true;
    }
  });

  entryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const showFormError = (message) => {
      if (!errorBox) return;
      errorBox.textContent = message;
      errorBox.classList.add("visible");
    };
    if (errorBox) {
      errorBox.textContent = "";
      errorBox.classList.remove("visible");
    }
    const formData = new FormData(entryForm);
    const date = document.getElementById("timesheet-date").value;
    
    // Get AM/PM time values
    const checkInHour = parseInt(formData.get("check_in_hour"));
    const checkInMinute = parseInt(formData.get("check_in_minute"));
    const checkInAmPm = formData.get("check_in_ampm");
    const checkOutHour = parseInt(formData.get("check_out_hour"));
    const checkOutMinute = parseInt(formData.get("check_out_minute"));
    const checkOutAmPm = formData.get("check_out_ampm");
    const totalBreakMinutes = parseInt(formData.get("total_break_minutes")) || 0;
    
    // Validate time inputs
    if (!date || [checkInHour, checkInMinute, checkOutHour, checkOutMinute].some(Number.isNaN)) {
      showFormError("Work date, start time, and end time are required.");
      return;
    }
    if (checkInHour < 1 || checkInHour > 12 || checkOutHour < 1 || checkOutHour > 12) {
      showFormError("Hour must be between 1 and 12.");
      return;
    }
    if (checkInMinute < 0 || checkInMinute > 59 || checkOutMinute < 0 || checkOutMinute > 59) {
      showFormError("Minute must be between 0 and 59.");
      return;
    }
    
    // Convert AM/PM to 24-hour format
    const checkIn24Hour = checkInAmPm === "PM" && checkInHour !== 12 ? checkInHour + 12 : (checkInAmPm === "AM" && checkInHour === 12 ? 0 : checkInHour);
    const checkOut24Hour = checkOutAmPm === "PM" && checkOutHour !== 12 ? checkOutHour + 12 : (checkOutAmPm === "AM" && checkOutHour === 12 ? 0 : checkOutHour);
    
    let checkInTime = `${String(checkIn24Hour).padStart(2, '0')}:${String(checkInMinute).padStart(2, '0')}`;
    let checkOutTime = `${String(checkOut24Hour).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}`;
    
    if (checkInTime >= checkOutTime) {
      showFormError("Work end time must be after work start time.");
      return;
    }
    
    // Validate break time doesn't exceed work duration
    const checkInDate = new Date(userTimeToUtcIso(date, checkInTime));
    const checkOutDate = new Date(userTimeToUtcIso(date, checkOutTime));
    const workDurationMinutes = (checkOutDate - checkInDate) / (60 * 1000);
    if (totalBreakMinutes >= workDurationMinutes) {
      showFormError("Break time cannot exceed work duration.");
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
        timestampUtc: checkInDate.toISOString(),
      };
      await apiJson(`/api/attendance/check-in`, {
        method: "POST",
        body: JSON.stringify(checkInPayload),
      });
      
      // If break time is specified, create break events in the middle of work period
      if (totalBreakMinutes > 0) {
        const checkInTimeMs = checkInDate.getTime();
        const checkOutTimeMs = checkOutDate.getTime();
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
        timestampUtc: checkOutDate.toISOString(),
      };
      await apiJson(`/api/attendance/check-out`, {
        method: "POST",
        body: JSON.stringify(checkOutPayload),
      });
      
      await loadToday();
      await loadHistory();
      showSuccess("Timesheet saved successfully.");
      renderTimesheets();
    } catch (error) {
      console.error("[Timesheet] Save failed", error);
      showFormError(error.error || error.message || "Unable to save the timesheet.");
      showErrorNotification(error.error || error.message || "Unable to save the timesheet.");
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
    const addDayButton = event.target.closest("[data-add-timesheet-day]");
    if (addDayButton) {
      openTimesheetForDate(addDayButton.dataset.addTimesheetDay);
      return;
    }
  });
  
  // Add event listeners for matrix table edit/delete/add buttons
  const matrixTable = document.querySelector(".weekly-matrix-table");
  if (matrixTable) matrixTable.addEventListener("click", (event) => {
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
    const addDayButton = event.target.closest("[data-add-timesheet-day]");
    if (addDayButton) {
      openTimesheetForDate(addDayButton.dataset.addTimesheetDay);
      return;
    }
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
          timestampUtc: userTimeToUtcIso(document.getElementById("edit-timesheet-date").value, document.getElementById("edit-timesheet-time").value),
          reason: document.getElementById("edit-timesheet-reason").value.trim(),
        }),
      });
      await loadToday();
      await loadHistory();
      showSuccess("Timesheet updated successfully.");
      renderTimesheets();
    } catch (error) {
      if (editError) editError.textContent = error.error || "Unable to update this event.";
      showErrorNotification(error.error || "Unable to update this event.");
      if (saveButton) saveButton.disabled = false;
    }
  });
}

function createWeeklyMatrixView() {
  const zone = getUserTimeZone();
  const todayKey = getDateKeyInTimeZone();
  const currentDay = new Date(`${todayKey}T12:00:00Z`).getUTCDay();
  const mondayKey = addDaysToDateKey(todayKey, -(currentDay === 0 ? 6 : currentDay - 1));
  
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekData = weekDays.map((day, index) => {
    const dateKey = addDaysToDateKey(mondayKey, index);
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
        ` : `
          <button type="button" class="mini-action icon-action" title="Add timesheet" data-add-timesheet-day="${day.date}">
            <span class="material-symbols-outlined">add</span>
          </button>
        `}
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
  
  // Generate date range for the current period
  let dateRange = [];
  const todayKey = getDateKeyInTimeZone();
  
  if (selectedPeriod === "day") {
    dateRange = [todayKey];
  } else if (selectedPeriod === "month") {
    const [year, monthText] = todayKey.split("-");
    const month = Number(monthText) - 1;
    const daysInMonth = new Date(Date.UTC(Number(year), month + 1, 0)).getUTCDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dateRange.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
    }
  }
  
  const sortedRows = [...state.historyData].sort((a, b) => new Date(a.date) - new Date(b.date));
  const historyRows = dateRange.map(date => {
    const dayData = sortedRows.find(d => d.date === date);
    if (dayData) {
      return `
      <tr>
        <td>${dayData.date}</td>
        <td>${dayData.checkInUtc ? formatTime(dayData.checkInUtc, zone) : "—"}</td>
        <td>${dayData.checkOutUtc ? formatTime(dayData.checkOutUtc, zone) : "—"}</td>
        <td>${formatDuration(dayData.breakSeconds)}</td>
        <td>${formatDuration(dayData.workedSeconds)}</td>
        <td class="history-actions">
          <button type="button" class="mini-action icon-action" title="Add timesheet" data-add-timesheet-day="${dayData.date}">
            <span class="material-symbols-outlined">add</span>
          </button>
          <button type="button" class="mini-action icon-action" title="Edit" data-edit-timesheet-day="${dayData.date}">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button type="button" class="mini-action danger icon-action" title="Delete" data-delete-timesheet-day="${dayData.events?.map(e => e.id).join(',') || ''}">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </td>
      </tr>
    `;
    } else {
      return `
      <tr>
        <td>${date}</td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
        <td class="history-actions">
          <button type="button" class="mini-action icon-action" title="Add timesheet" data-add-timesheet-day="${date}">
            <span class="material-symbols-outlined">add</span>
          </button>
          <button type="button" class="mini-action icon-action" title="Edit unavailable" aria-label="Edit unavailable" disabled>
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button type="button" class="mini-action danger icon-action" title="Delete unavailable" aria-label="Delete unavailable" disabled>
            <span class="material-symbols-outlined">delete</span>
          </button>
        </td>
      </tr>
    `;
    }
  }).join("");
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
        ${state.dashboardPeriod !== "week" ? `
        <div class="card history-card">
          <div class="card-heading"><h2>Daily timesheet history</h2></div>
          <table class="history">
            <thead><tr><th>Date</th><th>Check in (${zone})</th><th>Check out (${zone})</th><th>Break</th><th>Worked</th><th>Actions</th></tr></thead>
            <tbody id="history-body">${historyRows}</tbody>
          </table>
          <p class="empty-note" id="history-empty" style="display:${historyRows ? "none" : "block"};">No history yet.</p>
        </div>
        ` : ''}
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
    showSuccess("Timesheet deleted successfully.");
    renderTimesheets();
  } catch (error) {
    showErrorNotification(error.error || "Unable to delete the daily timesheet.");
  }
}

function getDateKeyInTimeZone(date = new Date(), timeZone = getUserTimeZone()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((values, part) => ({ ...values, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDaysToDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function userTimeToUtcIso(date, time, timeZone = getUserTimeZone()) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcGuess)).reduce((values, part) => ({ ...values, [part.type]: part.value }), {});
  const representedUtc = Date.UTC(
    Number(localParts.year),
    Number(localParts.month) - 1,
    Number(localParts.day),
    Number(localParts.hour),
    Number(localParts.minute)
  );
  return new Date(utcGuess - (representedUtc - utcGuess)).toISOString();
}