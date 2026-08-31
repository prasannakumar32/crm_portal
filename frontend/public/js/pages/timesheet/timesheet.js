function renderTimesheets() {
  root.innerHTML = createPageShell("Timesheets", createTimesheetsTemplate());
  attachDashboardListeners();
  attachTimesheetFormListeners();
  for (const tab of document.querySelectorAll(".timesheet-period-tabs .tab")) {
    tab.addEventListener("click", async () => {
      state.dashboardPeriod = normalizeDashboardPeriod(tab.dataset.period);
      await loadHistory(state.dashboardPeriod);
      renderTimesheets();
    });
  }
  updateDashboardValues();
}
