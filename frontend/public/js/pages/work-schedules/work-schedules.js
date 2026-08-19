function renderWorkSchedules() {
  root.innerHTML = createPageShell("Work Schedules", createWorkSchedulesTemplate());
  attachDashboardListeners();
  updateDashboardValues();
}

function createWorkSchedulesTemplate() {
  const rows = (state.scheduleData || []).map((item) => `
    <div class="schedule-row">
      <div class="schedule-item schedule-date">
        <strong>${item.name || "Unnamed schedule"}</strong>
        <span>${item.date} · ${item.shift}</span>
      </div>
      <div class="schedule-item schedule-time">
        <strong>${item.start} - ${item.end}</strong>
        <span>${item.location}</span>
      </div>
      <div class="schedule-item schedule-owner">
        <strong>${item.assigned}</strong>
        <span>${item.status}</span>
      </div>
      <div class="schedule-item schedule-actions">
        <button class="mini-action" type="button" data-action="edit-schedule" data-id="${item.id}">Edit</button>
        <button class="mini-action danger" type="button" data-action="delete-schedule" data-id="${item.id}">Delete</button>
      </div>
    </div>
  `).join("");

  return `
    <section class="card profile-card">
      <div class="card-title-row">
        <div>
          <h2>Work schedules</h2>
          <p>Manage employee shifts, regional schedules, and daily attendance plans.</p>
        </div>
        <button class="btn btn-primary" type="button" id="new-schedule">New schedule</button>
      </div>
      <div class="schedule-header-row">
        <span>Name & date</span>
        <span>Time & location</span>
        <span>Assigned & status</span>
        <span>Actions</span>
      </div>
      <div class="schedule-list">
        ${rows}
      </div>
      ${rows.length === 0 ? `<p class="empty-note">No work schedules created yet.</p>` : ""}
    </section>
    ${createScheduleModalHtml()}
  `;
}

function openScheduleModal(schedule = null) {
  const modal = document.getElementById("schedule-modal");
  const titleEl = document.getElementById("schedule-modal-title");
  const formId = document.getElementById("schedule-id");
  const dateInput = document.getElementById("schedule-date");
  const shiftInput = document.getElementById("schedule-shift");
  const startInput = document.getElementById("schedule-start");
  const endInput = document.getElementById("schedule-end");
  const nameInput = document.getElementById("schedule-name");
  const locationInput = document.getElementById("schedule-location");
  const assignedInput = document.getElementById("schedule-assigned");
  const statusInput = document.getElementById("schedule-status");

  if (!modal || !titleEl || !formId || !dateInput || !shiftInput || !startInput || !endInput || !nameInput || !locationInput || !assignedInput || !statusInput) return;

  titleEl.textContent = schedule ? "Edit Work Schedule" : "New Work Schedule";
  formId.value = schedule?.id || "";
  const now = new Date();
  const localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const localTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const endTimeDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const defaultEndTime = `${String(endTimeDate.getHours()).padStart(2, "0")}:${String(endTimeDate.getMinutes()).padStart(2, "0")}`;

  dateInput.value = schedule?.date || localDate;
  shiftInput.value = schedule?.shift || "Morning";
  startInput.value = schedule?.start || localTime;
  endInput.value = schedule?.end || defaultEndTime;
  nameInput.value = schedule?.name || "";
  locationInput.value = schedule?.location || "";
  assignedInput.value = schedule?.assigned || schedule?.owner || "";
  statusInput.value = schedule?.status || "Confirmed";

  modal.style.display = "flex";
  setTimeout(() => dateInput.focus(), 100);
}

function closeScheduleModal() {
  const modal = document.getElementById("schedule-modal");
  if (modal) modal.style.display = "none";
}
