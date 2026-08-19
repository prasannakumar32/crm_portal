function renderTimeOffForm() {
  const isAdmin = state.user?.role === "admin";
  const dbLocation = state.user?.location || "Australia";
  return `<div class="task-modal-overlay" id="leave-modal" style="display:none;">
    <div class="task-modal-card">
      <div class="task-modal-header"><h3 id="leave-modal-title">New Time Off Request</h3><button class="icon-button" id="close-leave-modal" type="button">&times;</button></div>
      <form id="leave-form">
        <input type="hidden" id="leave-id" />
        <div class="form-section"><h4 class="form-section-title">Leave Details</h4><div class="form-grid">
          <label class="field-block full-width"><span>Leave Name <span class="required-indicator">*</span></span><input id="leave-name" required placeholder="Enter leave name" /></label>
          <label class="field-block"><span>Type</span><select id="leave-type"><option value="Holiday">Holiday</option><option value="Annual Leave">Annual Leave</option><option value="Sick Leave">Sick Leave</option><option value="Personal Leave">Personal Leave</option></select></label>
          <label class="field-block"><span>Location</span><input id="leave-location" value="${dbLocation}" required /></label>
        </div></div>
        <div class="form-section"><h4 class="form-section-title">Date &amp; Status</h4><div class="form-grid">
          <label class="field-block"><span>Start Date <span class="required-indicator">*</span></span><input id="leave-date" type="date" required /></label>
          <label class="field-block"><span>End Date <span class="required-indicator">*</span></span><input id="leave-end-date" type="date" required /></label>
          <label class="field-block full-width"><span>Reason <span class="required-indicator">*</span></span><input id="leave-reason" required placeholder="Enter reason for leave" /></label>
          ${isAdmin ? '<label class="field-block"><span>Status</span><select id="leave-status"><option value="Approved">Approved</option><option value="Pending">Pending</option><option value="Requested">Requested</option><option value="Rejected">Rejected</option></select></label>' : '<input type="hidden" id="leave-status" value="Requested" />'}
        </div></div>
        <div class="form-section"><div class="form-grid form-actions-grid"><button class="btn btn-ghost" type="button" id="cancel-leave">Cancel</button><button class="btn btn-primary" type="submit" id="submit-leave">Submit Request</button></div></div>
      </form>
    </div>
  </div>`;
}

function createLeaveModalHtml() {
  return renderTimeOffForm();
}
