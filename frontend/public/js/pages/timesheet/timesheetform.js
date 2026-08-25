function createTimesheetEntryForm() {
  const today = new Date().toISOString().slice(0, 10);
  return `<div class="task-modal-overlay timesheet-modal" id="timesheet-entry-card" hidden>
    <div class="task-modal-card timesheet-modal-card">
      <div class="task-modal-header"><h3 id="timesheet-entry-title">New timesheet</h3><button class="icon-button" type="button" id="close-timesheet" aria-label="Close timesheet dialog">&times;</button></div>
      <form id="timesheet-entry-form" class="timesheet-manual-form">
        <p class="timesheet-form-intro">Record your day in order: check in, start a break, end the break to continue working, then check out.</p>
        <label class="field-block"><span>Date</span><input id="timesheet-date" type="date" value="${today}" required /></label>
      <div class="timesheet-time-grid">
        <label class="field-block"><span>1. Check in</span><input name="check_in" type="time" /></label>
        <label class="field-block"><span>2. Break start</span><input name="break_start_1" type="time" /></label>
        <label class="field-block"><span>3. Break end / continue work</span><input name="break_end_1" type="time" /></label>
        <label class="field-block"><span>4. Break start again</span><input name="break_start_2" type="time" /></label>
        <label class="field-block"><span>5. Break end / continue work</span><input name="break_end_2" type="time" /></label>
        <label class="field-block"><span>6. Check out</span><input name="check_out" type="time" /></label>
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

  const eventFields = {
    check_in: "check_in",
    break_start: "break_start_1",
    break_end: "break_end_1",
    check_out: "check_out",
  };
  const typeCounters = {};
  entryForm.reset();
  entryForm.dataset.mode = "edit-day";
  entryForm._editEvents = events;
  document.getElementById("timesheet-entry-title").textContent = "Edit timesheet";
  document.getElementById("timesheet-date").value = dateKey;
  for (const event of events) {
    const occurrence = typeCounters[event.type] || 0;
    typeCounters[event.type] = occurrence + 1;
    let fieldName = eventFields[event.type];
    if (event.type === "break_start") fieldName = occurrence === 0 ? "break_start_1" : "break_start_2";
    if (event.type === "break_end") fieldName = occurrence === 0 ? "break_end_1" : "break_end_2";
    const input = entryForm.querySelector(`[name="${fieldName}"]`);
    if (input) input.value = timesheetInputParts(event.timestampUtc).time;
    if (event.type === "break_start" && event.reason) document.getElementById("timesheet-break-reason").value = event.reason;
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
    const entries = [
      ["check_in", "check-in"],
      ["break_start_1", "break-start"],
      ["break_end_1", "break-end"],
      ["break_start_2", "break-start"],
      ["break_end_2", "break-end"],
      ["check_out", "check-out"],
    ];
    const values = entries.filter(([field]) => formData.get(field)).map(([field, action]) => ({
      action,
      value: formData.get(field),
    }));
    const timeValues = Object.fromEntries(entries.map(([field]) => [field, formData.get(field) || ""]));
    const orderedFields = ["check_in", "break_start_1", "break_end_1", "break_start_2", "break_end_2", "check_out"];
    const orderedTimes = orderedFields.filter((field) => timeValues[field]).map((field) => timeValues[field]);
    const isChronological = orderedTimes.every((time, index) => index === 0 || time > orderedTimes[index - 1]);
    if (!values.length) {
      if (errorBox) errorBox.textContent = "Enter at least one time before saving.";
      return;
    }
    if (!isChronological) {
      if (errorBox) errorBox.textContent = "Times must be in chronological order.";
      return;
    }

    const submitButton = entryForm.querySelector("button[type=submit]");
    if (submitButton) submitButton.disabled = true;
    try {
      const reason = document.getElementById("timesheet-break-reason").value.trim();
      const editEvents = entryForm._editEvents || [];
      const existingByType = {};
      for (const existing of editEvents) {
        if (!existingByType[existing.type]) existingByType[existing.type] = [];
        existingByType[existing.type].push(existing);
      }
      const typeCounters = {};
      for (const [field, action] of entries) {
        const value = timeValues[field];
        const type = action.replace("-", "_");
        const existing = (existingByType[type] || [])[typeCounters[type] || 0];
        typeCounters[type] = (typeCounters[type] || 0) + 1;
        if (value) {
          const payload = {
            timestampUtc: new Date(`${date}T${value}`).toISOString(),
            ...(action === "break-start" ? { reason: reason || "Break" } : {}),
          };
          await apiJson(existing ? `/api/attendance/events/${existing.id}` : `/api/attendance/${action}`, {
            method: existing ? "PUT" : "POST",
            body: JSON.stringify(payload),
          });
        } else if (existing) {
          await apiJson(`/api/attendance/events/${existing.id}`, { method: "DELETE" });
        }
      }
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

function createTimesheetsTemplate() {
  const zone = getUserTimeZone();
  const sortedRows = [...state.historyData].sort((a, b) => new Date(a.date) - new Date(b.date));
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
        <div class="card history-card">
          <h2>Daily timesheet history</h2>
          <table class="history">
            <thead><tr><th>Date</th><th>Check in (${zone})</th><th>Check out (${zone})</th><th>Break</th><th>Worked</th><th>Actions</th></tr></thead>
            <tbody id="history-body">${historyRows}</tbody>
          </table>
          <p class="empty-note" id="history-empty" style="display:${state.historyData.length ? "none" : "block"};">No history yet.</p>
        </div>
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