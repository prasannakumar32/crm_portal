function getTimesheetSequence() {
  const events = state.todayEvents || [];
  const breakStarts = events.filter((event) => event.type === "break_start");
  const breakEnds = events.filter((event) => event.type === "break_end");
  return [
    { label: "First in", action: "check-in", event: events.find((event) => event.type === "check_in") },
    { label: "Break 1", action: "break-start", event: breakStarts[0] },
    { label: "Second in", action: "break-end", event: breakEnds[0] },
    { label: "Break 2", action: "break-start", event: breakStarts[1] },
    { label: "Last in", action: "break-end", event: breakEnds[1] },
    { label: "Last out", action: "check-out", event: events.find((event) => event.type === "check_out") },
  ];
}

function getNextTimesheetAction() {
  const events = state.todayEvents || [];
  const breakStarts = events.filter((event) => event.type === "break_start").length;
  const breakEnds = events.filter((event) => event.type === "break_end").length;
  if (!events.some((event) => event.type === "check_in")) return "check-in";
  if (breakStarts === 0 || (breakStarts === breakEnds && breakStarts < 2)) return "break-start";
  if (breakStarts > breakEnds) return "break-end";
  if (breakStarts === 2 && breakEnds === 2) return "check-out";
  return null;
}

function createTimesheetEntryForm() {
  const zone = getUserTimeZone();
  const nextAction = getNextTimesheetAction();
  const sequence = getTimesheetSequence();
  const rows = sequence.map((step) => `
    <div class="timesheet-step ${step.event ? "complete" : ""}">
      <div class="timesheet-step-marker"><span class="material-symbols-outlined">${step.event ? "check_circle" : "radio_button_unchecked"}</span></div>
      <div class="timesheet-step-copy"><strong>${step.label}</strong><span>${step.event ? formatTime(step.event.timestampUtc, zone) : "Waiting for entry"}</span></div>
      ${step.event ? "" : `<button class="btn ${nextAction === step.action ? "btn-primary" : "btn-ghost"} timesheet-step-action" type="button" data-timesheet-action="${step.action}" ${nextAction === step.action ? "" : "disabled"}>${step.action === "break-start" ? "Start break" : step.action === "break-end" ? "End break" : step.label}</button>`}
    </div>
  `).join("");

  return `<section class="card timesheet-entry-card">
    <div class="card-title-row"><div><h2>Create today's timesheet</h2><p>Record your shift in order: in, break, in, break, in, out.</p></div></div>
    <div class="timesheet-step-list">${rows}</div>
    ${nextAction === "break-start" ? `<label class="timesheet-break-reason"><span>Break reason</span><select id="timesheet-break-reason"><option value="Lunch">Lunch</option><option value="Breakfast">Breakfast</option><option value="Other">Other</option></select></label>` : ""}
    <p class="form-error" id="timesheet-form-error" role="alert"></p>
  </section>`;
}

function attachTimesheetFormListeners() {
  for (const button of document.querySelectorAll("[data-timesheet-action]")) {
    button.addEventListener("click", async () => {
      const action = button.dataset.timesheetAction;
      if (!action) return;
      button.disabled = true;
      const errorBox = document.getElementById("timesheet-form-error");
      if (errorBox) errorBox.textContent = "";
      try {
        const payload = {};
        if (action === "break-start") payload.reason = document.getElementById("timesheet-break-reason")?.value || "Other";
        await apiJson(`/api/attendance/${action}`, { method: "POST", body: JSON.stringify(payload) });
        await loadToday();
        renderTimesheets();
      } catch (error) {
        console.error("[Timesheet] Action failed", { action, error });
        if (errorBox) errorBox.textContent = error.error || "Unable to update the timesheet.";
        button.disabled = false;
      }
    });
  }
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

    return `${createTimesheetEntryForm()}
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
            <thead><tr><th>Date</th><th>Check in (${zone})</th><th>Check out (${zone})</th><th>Break</th><th>Worked</th></tr></thead>
            <tbody id="history-body">${historyRows}</tbody>
          </table>
          <p class="empty-note" id="history-empty" style="display:${state.historyData.length ? "none" : "block"};">No history yet.</p>
        </div>
      `;
}