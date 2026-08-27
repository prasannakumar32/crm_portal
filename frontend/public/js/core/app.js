const SCRIPT_REGISTRY = Object.freeze([
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
  "js/core/state.js",
  "js/core/api.js",
  "js/pages/dashboard/dashboard.js",
  "js/pages/holidays/holidays.js",
  "js/pages/timesheet/timesheetform.js",
  "js/pages/timesheet/timesheet.js",
  "js/pages/timeoff/timeoff.js",
  "js/pages/work-schedules/work-schedules.js",
  "js/pages/tasks/tasks.js",
  "js/pages/dashboard/loginform.js",
  "js/pages/dashboard/breakreasonform.js",
  "js/pages/timeoff/timeoffform.js",
  "js/pages/tasks/taskform.js",
  "js/pages/tasks/projectform.js",
  "js/pages/work-schedules/workscheduleform.js",
]);

const LOCAL_ASSET_VERSION = "20260826-2";

const PAGE_DEFINITIONS = Object.freeze({
  dashboard: { render: () => renderDashboard() },
  timesheets: { render: () => renderTimesheets() },
  timeoff: { render: () => renderTimeOff() },
  holidays: { render: () => renderHolidays() },
  "work-schedules": { render: () => renderWorkSchedules() },
  tasks: { render: () => renderTasksPage() },
  "user-management": { render: () => renderEmployeeManagement() },
});

function getPageDefinition(page) {
  return PAGE_DEFINITIONS[page] || null;
}

function loadScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source.startsWith("js/") ? `${source}?v=${LOCAL_ASSET_VERSION}` : source;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${source}`));
    document.head.appendChild(script);
  });
}

async function init() {
  window.addEventListener("hashchange", () => {
    const page = location.hash.slice(1) || "login";
    setPage(page, false);
    if (!state.user) return;
    if (page === "dashboard") {
      loadToday().catch(() => {});
      loadHistory().catch(() => {});
      loadLeaves().catch(() => {});
      loadPublicHolidays().then(() => {
        if (state.page === "dashboard") renderDashboard();
      }).catch(() => {});
    }
    if (page === "holidays") {
      loadPublicHolidays().then(() => render()).catch(() => render());
    }
    if (page === "tasks") {
      initTasksPage().catch(() => {});
    }
    if (page === "timesheets") {
      loadToday().catch(() => {});
      loadHistory().catch(() => {});
    }
    if (page === "timeoff" || page === "holidays" || page === "work-schedules" || page === "user-management") {
      loadToday().catch(() => {});
    }
  });

  // Start clock after a short delay to ensure functions are loaded
  setTimeout(() => {
    if (typeof tickClock === 'function') {
      setInterval(tickClock, 1000);
      tickClock();
    }
  }, 100);

  await loadMe();
  if (state.user) {
    if (state.page === "dashboard") {
      await loadToday();
      await loadHistory(state.dashboardPeriod);
      await loadLeaves();
      await loadPublicHolidays();
    } else if (state.page === "holidays") {
      await loadPublicHolidays();
    } else if (state.page === "tasks") {
      await initTasksPage();
    } else if (state.page === "user-management") {
      await loadToday();
      await loadEmployees();
    } else if (state.page === "timesheets") {
      await loadToday();
      await loadHistory();
    } else if (state.page === "timeoff" || state.page === "work-schedules") {
      await loadToday();
    }
  }
  render();
}

async function bootstrap() {
  for (const source of SCRIPT_REGISTRY) {
    await loadScript(source);
  }
  await init();
}

bootstrap().catch((error) => {
  console.error(error);
  const root = document.getElementById("root");
  if (root) root.textContent = "Unable to load the application.";
});
