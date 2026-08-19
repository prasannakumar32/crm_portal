function renderWorkScheduleForm() {
  return `<div class="task-modal-overlay" id="schedule-modal" style="display:none;"><div class="task-modal-card">
    <div class="task-modal-header"><h3 id="schedule-modal-title">New Work Schedule</h3><button class="icon-button" id="close-schedule-modal" type="button">&times;</button></div>
    <form id="schedule-form"><input type="hidden" id="schedule-id" />
      <div class="form-section"><h4 class="form-section-title">Schedule Details</h4><div class="form-grid">
        <label class="field-block full-width"><span>Name <span class="required-indicator">*</span></span><input id="schedule-name" required placeholder="Enter schedule name" /></label>
        <label class="field-block"><span>Date <span class="required-indicator">*</span></span><input type="date" id="schedule-date" required /></label>
        <label class="field-block"><span>Shift</span><select id="schedule-shift"><option value="Morning">Morning</option><option value="Afternoon">Afternoon</option><option value="Night">Night</option></select></label>
        <label class="field-block"><span>Start Time <span class="required-indicator">*</span></span><input type="time" id="schedule-start" required /></label>
        <label class="field-block"><span>End Time <span class="required-indicator">*</span></span><input type="time" id="schedule-end" required /></label>
      </div></div>
      <div class="form-section"><h4 class="form-section-title">Assignment &amp; Status</h4><div class="form-grid">
        <label class="field-block"><span>Location <span class="required-indicator">*</span></span><input id="schedule-location" required placeholder="Enter location" /></label>
        <label class="field-block"><span>Assigned <span class="required-indicator">*</span></span><input id="schedule-assigned" required placeholder="Enter assignee name" /></label>
        <label class="field-block"><span>Status</span><select id="schedule-status"><option value="Confirmed">Confirmed</option><option value="Planned">Planned</option><option value="Pending">Pending</option><option value="Blocked">Blocked</option></select></label>
      </div></div>
      <div class="modal-actions"><button class="btn btn-ghost" type="button" id="cancel-schedule">Cancel</button><button class="btn btn-primary" type="submit">Save Schedule</button></div>
    </form>
  </div></div>`;
}

function createScheduleModalHtml() {
  return renderWorkScheduleForm();
}
