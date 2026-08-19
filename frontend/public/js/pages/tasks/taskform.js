function renderTaskForm(projects, users) {
  return `<div class="task-modal-overlay" id="task-modal" style="display:none;"><div class="task-modal-card">
    <div class="task-modal-header"><h3 id="task-modal-title">New Task</h3><button class="icon-button" id="close-task-modal" type="button">&times;</button></div>
    <form id="task-form"><input type="hidden" id="task-id" />
      <div class="form-section"><h4 class="form-section-title">Basic Information</h4><div class="form-grid">
        <label class="field-block full-width"><span>Task Title <span class="required-indicator">*</span></span><input id="task-title" required placeholder="Enter task title" /></label>
        <label class="field-block full-width"><span>Description</span><textarea id="task-description" rows="3" placeholder="Add task description..."></textarea></label>
      </div></div>
      <div class="form-section"><h4 class="form-section-title">Assignment &amp; Status</h4><div class="form-grid">
        <label class="field-block"><span>Project</span><select id="task-project"><option value="">General</option>${projects.map((project) => `<option value="${project.id}">${project.name} (${project.clientName || "No Client"})</option>`).join("")}</select></label>
        <label class="field-block"><span>Assignee</span><select id="task-assignee">${[`<option value="">Unassigned</option>`, ...users.map((user) => `<option value="${user.id}">${user.fullName}</option>`)].join("")}</select></label>
        <label class="field-block"><span>Status</span><select id="task-status">${TASK_STATUS_OPTIONS.map((status) => `<option value="${status}">${status}</option>`).join("")}</select></label>
        <label class="field-block"><span>Priority</span><select id="task-priority">${TASK_PRIORITY_OPTIONS.map((priority) => `<option value="${priority}">${priority}</option>`).join("")}</select></label>
        <label class="field-block"><span>Due Date</span><input type="date" id="task-due-date" /></label>
      </div></div>
      <div class="modal-actions"><button class="btn btn-ghost" type="button" id="cancel-task">Cancel</button><button class="btn btn-primary" type="submit">Save Task</button></div>
    </form>
  </div></div>`;
}

function createTaskModalHtml(projects, users) {
  return renderTaskForm(projects, users);
}
