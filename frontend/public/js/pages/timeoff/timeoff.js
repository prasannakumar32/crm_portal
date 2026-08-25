function createTimeOffTemplate() {
  const isAdmin = state.user?.role === "admin";
  const dbLocation = state.user?.location || "Australia";
  const leaveRows = (state.leaveData || [])
    .filter((item) => String(item.type || "").toLowerCase() !== "holiday")
    .map((item) => {
    const start = new Date(item.startDate);
    const month = start.toLocaleString("en", { month: "short" }).toUpperCase();
    const day = String(start.getDate()).padStart(2, "0");
    const range = item.endDate ? `${formatDate(item.startDate, getUserTimeZone())} – ${formatDate(item.endDate, getUserTimeZone())}` : formatDate(item.startDate, getUserTimeZone());
    const adminActions = isAdmin ? `
      <div class="row-admin-actions">
        ${item.status === "Pending" || item.status === "Requested" ? `
          <button type="button" class="mini-action" data-action="approve-leave" data-id="${item.id}">Approve</button>
          <button type="button" class="mini-action danger" data-action="reject-leave" data-id="${item.id}">Reject</button>
        ` : ""}
      </div>
    ` : `
      <div class="row-admin-actions">
        <button type="button" class="mini-action" data-action="edit-leave" data-id="${item.id}">Edit</button>
        <button type="button" class="mini-action danger" data-action="delete-leave" data-id="${item.id}">Delete</button>
      </div>
    `;
    return `<div class="holiday-row">
      <span class="holiday-date">${month}<br/>${day}</span>
      <div>
        <div class="holiday-name">${item.name || "Leave request"}</div>
        <div class="holiday-place">${item.type || "Leave"} · ${item.location || dbLocation}</div>
        <div class="holiday-meta">${range}${item.reason ? ` · ${item.reason}` : ""}</div>
        <div class="holiday-status status-${item.status?.toLowerCase() || "approved"}">${item.status || "Approved"}</div>
        ${adminActions}
      </div>
    </div>`;
    }).join("");

  return `<section class="card holidays-card">
    <div class="card-title-row">
      <h2>Leave requests</h2>
      <div class="admin-inline-actions">
        <button class="btn btn-primary" type="button" id="add-leave">New Leave Request</button>
        <button class="btn btn-ghost" type="button" id="refresh-leaves">↻ Refresh</button>
      </div>
    </div>
    <div class="holiday-list">${leaveRows || '<p class="empty-note">No leave requests yet.</p>'}</div>
  </section>
  ${createLeaveModalHtml()}`;
}

function renderTimeOff() {
  loadLeaves().then(() => {
    root.innerHTML = createPageShell("Leave Requests", createTimeOffTemplate());
    attachDashboardListeners();
    attachLeaveModalListeners();
    updateDashboardValues();
  }).catch(() => {
    state.leaveData = [];
    root.innerHTML = createPageShell("Leave Requests", createTimeOffTemplate());
    attachDashboardListeners();
    attachLeaveModalListeners();
    updateDashboardValues();
  });
}
