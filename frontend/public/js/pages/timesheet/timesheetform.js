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