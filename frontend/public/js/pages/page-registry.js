// Page metadata is kept separate from page rendering so navigation stays predictable.
const PAGE_DEFINITIONS = Object.freeze({
  dashboard: { title: "Dashboard", render: () => renderDashboard() },
  timesheets: { title: "Timesheets", render: () => renderTimesheets() },
  timeoff: { title: "Time Off", render: () => renderTimeOff() },
  holidays: { title: "Upcoming Holidays", render: () => renderHolidays() },
  "work-schedules": { title: "Work Schedules", render: () => renderWorkSchedules() },
  tasks: { title: "Tasks & Tickets", render: () => renderTasksPage() },
  "user-management": { title: "Employee Management", render: () => renderEmployeeManagement() },
});

function getPageDefinition(page) {
  return PAGE_DEFINITIONS[page] || null;
}
