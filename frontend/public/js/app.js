async function init() {
  window.addEventListener("hashchange", () => {
    const page = location.hash.slice(1) || "login";
    setPage(page, false);
    if (!state.user) return;
    if (page === "dashboard") {
      loadToday().catch(() => {});
      loadHistory().catch(() => {});
    }
    if (page === "tasks") {
      initTasksPage().catch(() => {});
    }
  });

  setInterval(tickClock, 1000);
  await loadMe();
  if (state.user) {
    if (state.page === "dashboard") {
      await loadToday();
      await loadHistory(state.dashboardPeriod);
    } else if (state.page === "tasks") {
      await initTasksPage();
    }
  }
  render();
}

init();
