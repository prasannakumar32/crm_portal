function renderTimesheets() {
  root.innerHTML = createPageShell("Timesheets", createTimesheetsTemplate());
  attachDashboardListeners();
  attachTimesheetFormListeners();
  updateDashboardValues();
  renderHistory();
}
