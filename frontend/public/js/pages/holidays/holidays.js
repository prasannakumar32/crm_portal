function holidayDateParts(date) {
  const dateText = String(date || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;

  const parsedDate = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    month: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(parsedDate).toUpperCase(),
    day: new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: "UTC" }).format(parsedDate),
    full: formatter.format(parsedDate),
  };
}

function holidayDisplayDate(date) {
  return holidayDateParts(date)?.full || "Date unavailable";
}

function createHolidaysTemplate() {
  const countryName = state.holidayCountry === "AU" ? "Australian" : "Indian";
  const createdHolidays = (state.leaveData || [])
    .filter((item) => String(item.type || "").toLowerCase() === "holiday")
    .map((item) => ({ ...item, date: item.startDate, localName: item.name, created: true }));
  const createdDates = new Set(createdHolidays.map((holiday) => holiday.date));
  const publicHolidays = (state.holidayData || []).filter((holiday) => !createdDates.has(holiday.date));
  const holidays = [...publicHolidays, ...createdHolidays]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const holidayRows = holidays.map((holiday, index) => {
    const dateParts = holidayDateParts(holiday.date);
    if (!dateParts) return "";
    const actions = state.user?.role === "admin" && holiday.created ? `
          <div class="holiday-actions">
            <button class="mini-action icon-action" type="button" title="Edit holiday" aria-label="Edit holiday" data-action="edit-holiday" data-id="${holiday.id}"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>
            <button class="mini-action danger icon-action" type="button" title="Delete holiday" aria-label="Delete holiday" data-action="delete-holiday" data-id="${holiday.id}"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>
          </div>` : "";
    const publicActions = state.user?.role === "admin" && !holiday.created ? `
          <div class="holiday-actions">
            <button class="mini-action icon-action" type="button" title="Edit public holiday" aria-label="Edit public holiday" data-action="edit-public-holiday" data-date="${holiday.date}"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>
          </div>` : "";
    return `
      <div class="holiday-row">
        <span class="holiday-date">${dateParts.month}<br/>${dateParts.day}</span>
        <div>
          <div class="holiday-name">${holiday.localName || holiday.name || "Public holiday"}</div>
          <div class="holiday-place">${holiday.created ? (holiday.reason || "Added holiday") : `${holiday.name && holiday.name !== holiday.localName ? holiday.name : `${countryName} public holiday`}`}</div>
          <div class="holiday-meta">${dateParts.full}</div>
          <div class="holiday-status status-approved">${holiday.created ? "Added holiday" : "Public holiday"}</div>
          ${actions || publicActions}
        </div>
      </div>`;
  }).join("");

  return `<section class="card holidays-card holidays-page-card">
    <div class="card-title-row holidays-page-header">
      <div>
        <span class="eyebrow">Public calendar</span>
        <h2>${countryName} Holidays ${state.holidayYear}</h2>
      </div>
      ${state.user?.role === "admin" ? '<button class="btn btn-primary" type="button" id="add-holiday">Add Holiday</button>' : ""}
      <div class="holiday-year-controls">
        <button class="icon-button holiday-year-button" type="button" data-holiday-year="previous" aria-label="Previous year">‹</button>
        <span>${state.holidayYear}</span>
        <button class="icon-button holiday-year-button" type="button" data-holiday-year="next" aria-label="Next year">›</button>
      </div>
    </div>
    <div class="holiday-switch" role="tablist" aria-label="Holiday country">
      <button class="holiday-switch-button${state.holidayCountry === "IN" ? " active" : ""}" type="button" data-holiday-country="IN" role="tab" aria-selected="${state.holidayCountry === "IN"}">India</button>
      <button class="holiday-switch-button${state.holidayCountry === "AU" ? " active" : ""}" type="button" data-holiday-country="AU" role="tab" aria-selected="${state.holidayCountry === "AU"}">Australia</button>
    </div>
    ${state.holidayLoading ? '<div class="calendar-loading">Loading public holidays…</div>' : `<div class="holiday-list">${holidayRows || '<p class="empty-note">No holidays found for this year.</p>'}</div>`}
  </section>`;
}

function renderHolidays() {
  Promise.all([loadLeaves(), loadPublicHolidays(state.holidayCountry, state.holidayYear)]).finally(() => {
    root.innerHTML = createPageShell("Upcoming Holidays", `${createHolidaysTemplate()}${createLeaveModalHtml()}`);
    const addHoliday = document.getElementById("add-holiday");
    if (addHoliday) addHoliday.addEventListener("click", () => {
      state.holidayEditTarget = null;
      openLeaveModal(null, true);
    });
    attachDashboardListeners();
    for (const button of document.querySelectorAll("[data-action='edit-holiday']")) {
      button.addEventListener("click", () => openLeaveModal(button.dataset.id, true));
    }
    for (const button of document.querySelectorAll("[data-action='edit-public-holiday']")) {
      button.addEventListener("click", () => {
        const publicHoliday = (state.holidayData || []).find((item) => item.date === button.dataset.date);
        if (!publicHoliday) return;
        state.holidayEditTarget = {
          name: publicHoliday.localName || publicHoliday.name || "Public holiday",
          type: "Holiday",
          location: publicHoliday.country || state.holidayCountry,
          startDate: publicHoliday.date,
          endDate: publicHoliday.date,
          reason: publicHoliday.name || "Public holiday",
          status: "Approved",
        };
        openLeaveModal(null, true);
      });
    }
    for (const button of document.querySelectorAll("[data-action='delete-holiday']")) {
      button.addEventListener("click", async () => {
        if (!confirm("Delete this holiday?")) return;
        try {
          await deleteLeave(button.dataset.id);
          await loadLeaves();
          state.holidayEditTarget = null;
          renderHolidays();
        } catch (error) {
          console.error("Failed to delete holiday:", error);
          alert("Failed to delete holiday. Please try again.");
        }
      });
    }
    for (const button of document.querySelectorAll("[data-holiday-country]")) {
      button.addEventListener("click", async () => {
        const country = button.dataset.holidayCountry;
        if (!country || country === state.holidayCountry) return;
        state.holidayCountry = country;
        state.holidayData = [];
        state.holidayLoading = true;
        renderHolidays();
      });
    }

    for (const button of document.querySelectorAll("[data-holiday-year]")) {
      button.addEventListener("click", async () => {
        state.holidayYear += button.dataset.holidayYear === "next" ? 1 : -1;
        state.holidayData = [];
        state.holidayLoading = true;
        renderHolidays();
      });
    }
  });
}
