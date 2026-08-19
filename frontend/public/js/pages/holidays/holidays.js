function holidayDisplayDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function createHolidaysTemplate() {
  const countryName = state.holidayCountry === "AU" ? "Australian" : "Indian";
  const holidays = [...(state.holidayData || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const holidayRows = holidays.map((holiday) => `
    <article class="calendar-holiday-row">
      <div class="calendar-holiday-date">${holidayDisplayDate(holiday.date)}</div>
      <div class="calendar-holiday-content">
        <strong>${holiday.localName || holiday.name}</strong>
        <span>${holiday.name && holiday.name !== holiday.localName ? holiday.name : `${countryName} public holiday`}</span>
      </div>
      <span class="calendar-holiday-type">Public holiday</span>
    </article>
  `).join("");

  return `<section class="card holidays-page-card">
    <div class="holidays-page-header">
      <div>
        <span class="eyebrow">Public calendar</span>
        <h2>${countryName} Holidays ${state.holidayYear}</h2>
        <p>Official public holidays for your selected country.</p>
      </div>
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
    ${state.holidayLoading ? '<div class="calendar-loading">Loading public holidays…</div>' : `<div class="calendar-holiday-list">${holidayRows || '<p class="empty-note">No holidays found for this year.</p>'}</div>`}
    <div class="calendar-source">${state.holidaySource === "fallback" ? "Showing local calendar data" : "Loaded from public holiday calendar"}</div>
  </section>`;
}

function renderHolidays() {
  root.innerHTML = createPageShell("Upcoming Holidays", createHolidaysTemplate());
  attachDashboardListeners();

  for (const button of document.querySelectorAll("[data-holiday-country]")) {
    button.addEventListener("click", async () => {
      const country = button.dataset.holidayCountry;
      if (!country || country === state.holidayCountry) return;
      state.holidayCountry = country;
      state.holidayData = [];
      state.holidayLoading = true;
      renderHolidays();
      try {
        await loadPublicHolidays(country, state.holidayYear);
      } catch {
        state.holidaySource = "fallback";
      }
      renderHolidays();
    });
  }

  for (const button of document.querySelectorAll("[data-holiday-year]")) {
    button.addEventListener("click", async () => {
      const direction = button.dataset.holidayYear === "next" ? 1 : -1;
      state.holidayYear += direction;
      state.holidayData = [];
      state.holidayLoading = true;
      renderHolidays();
      try {
        await loadPublicHolidays(state.holidayCountry, state.holidayYear);
      } catch {
        state.holidaySource = "fallback";
      }
      renderHolidays();
    });
  }
}
