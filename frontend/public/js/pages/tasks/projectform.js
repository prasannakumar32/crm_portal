function renderProjectForm() {
  return `<div class="task-modal-overlay" id="project-modal" style="display:none;"><div class="task-modal-card">
    <div class="task-modal-header"><h3 id="project-modal-title">New Project</h3><button class="icon-button" id="close-project-modal" type="button">&times;</button></div>
    <form id="project-form"><div class="form-section"><h4 class="form-section-title">Project Details</h4><div class="form-grid">
      <label class="field-block full-width"><span>Project Name <span class="required-indicator">*</span></span><input id="project-name" required placeholder="Enter project name" /></label>
      <label class="field-block"><span>Client Name <span class="required-indicator">*</span></span><input id="project-client-name" required placeholder="Enter client name" /></label>
      <label class="field-block"><span>Manager Name <span class="required-indicator">*</span></span><input id="project-manager-name" required placeholder="Enter manager name" /></label>
      <label class="field-block full-width"><span>Description</span><textarea id="project-description" rows="3" placeholder="Add project description..."></textarea></label>
      <label class="field-block"><span>Stack Used <span class="required-indicator">*</span></span><input id="project-stack" required placeholder="e.g., React, Node.js, MongoDB" /></label>
      <label class="field-block"><span>Location <span class="required-indicator">*</span></span><select id="project-location"><option value="India">India</option><option value="Australia">Australia</option><option value="Other">Other</option></select></label>
    </div></div><div class="modal-actions"><button class="btn btn-ghost" type="button" id="cancel-project">Cancel</button><button class="btn btn-primary" type="submit">Create Project</button></div></form>
  </div></div>`;
}

function createProjectModalHtml() {
  return renderProjectForm();
}
