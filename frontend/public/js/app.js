async function init() {
  window.addEventListener("hashchange", () => {
    const page = location.hash.slice(1) || "login";
    setPage(page, false);
    if (!state.user) return;
    if (page === "dashboard") {
      loadToday().catch(() => {});
      loadHistory().catch(() => {});
      loadLeaves().catch(() => {});
    }
    if (page === "tasks") {
      initTasksPage().catch(() => {});
    }
    if (page === "timesheets" || page === "timeoff" || page === "work-schedules" || page === "user-management") {
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
    } else if (state.page === "tasks") {
      await initTasksPage();
    } else if (state.page === "user-management") {
      await loadToday();
      await loadUsers();
    } else if (state.page === "timesheets" || state.page === "timeoff" || state.page === "work-schedules") {
      await loadToday();
    }
  }
  render();
}

init();
