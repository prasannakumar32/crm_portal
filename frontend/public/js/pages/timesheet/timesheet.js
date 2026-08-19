function renderTimesheets() {
  root.innerHTML = createPageShell("Timesheets", createTimesheetsTemplate());
  attachDashboardListeners();
  updateDashboardValues();
  renderHistory();
}
