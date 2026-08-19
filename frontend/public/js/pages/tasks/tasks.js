const TASK_STATUS_OPTIONS = ["Backlog", "In Progress", "Review", "Done"];
const TASK_PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"];

async function loadTasks(filter = {}) {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.projectId) params.set("projectId", filter.projectId);
  if (filter.assigneeId) params.set("assigneeId", filter.assigneeId);
  const path = `/api/tasks${params.toString() ? `?${params.toString()}` : ""}`;
  const data = await apiJson(path);
  state.tasks = data.tasks || [];
  state.taskStatuses = data.statuses || TASK_STATUS_OPTIONS;
  return data;
}

async function loadProjects() {
  const data = await apiJson("/api/tasks/projects");
  state.projects = data.projects || [];
  return data;
}

async function loadTeamEmployees() {
  const data = await apiJson("/api/tasks/employees");
  state.teamEmployees = data.employees || [];
  state.teamUsers = state.teamEmployees;
  return data;
}

function createTasksTemplate() {
  const statuses = state.taskStatuses || TASK_STATUS_OPTIONS;
  const projects = state.projects || [];
  const users = state.teamUsers || [];
  const projectOptions = [`<option value="">All projects</option>`, ...projects.map((project) => `<option value="${project.id}">${project.name} (${project.clientName || 'No Client'})</option>`)];
  const assigneeOptions = [`<option value="">Unassigned</option>`, ...users.map((user) => `<option value="${user.id}">${user.fullName}</option>`)].join("");

  return createPageShell("Tasks & Tickets", `
    <section class="card task-board-card">
      <div class="card-title-row">
        <h2>Task management</h2>
        <div class="task-board-actions">
          ${state.user?.role === "admin" ? `<button class="btn btn-secondary" type="button" id="new-project">New project</button>` : ""}
          <button class="btn btn-primary" type="button" id="new-task">New task</button>
        </div>
      </div>
      <div class="task-board-tabs">
        <button class="tab ${state.taskView === "board" ? "active" : ""}" type="button" data-view="board">Board</button>
        <button class="tab ${state.taskView === "list" ? "active" : ""}" type="button" data-view="list">List</button>
      </div>
      <div class="task-filter-row">
        <div class="task-filter-group">
          <label>Project</label>
          <select id="filter-project">
            ${projectOptions.join("")}
          </select>
        </div>
        <div class="task-filter-group">
          <label>Status</label>
          <select id="filter-status">
            <option value="">All statuses</option>
            ${statuses.map((status) => `<option value="${status}" ${state.taskFilter.status === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </div>
        <div class="task-filter-group">
          <label>Assignee</label>
          <select id="filter-assignee">
            ${assigneeOptions}
          </select>
        </div>
      </div>
      ${state.taskView === "board" ? createTaskBoardGrid(state.tasks, TASK_STATUS_OPTIONS) : createTaskListTable()}
    </section>
    ${createTaskModalHtml(projects, users)}
    ${createTaskDetailModalHtml()}
    ${createProjectModalHtml()}
  `);
}

function createTaskListTable() {
  const rows = (state.tasks || []).map((task) => `
    <tr data-task-id="${task.id}">
      <td>${task.title}</td>
      <td>${task.projectName || "General"}</td>
      <td>${task.assigneeName || "Unassigned"}</td>
      <td>${task.status}</td>
      <td>${task.priority}</td>
      <td>${task.dueDate ? formatDate(task.dueDate, getUserTimeZone()) : "—"}</td>
      <td><button type="button" class="mini-action" data-action="view-task" data-id="${task.id}">Details</button></td>
    </tr>
  `).join("");

  return `
      <div class="task-table-wrapper task-compact-table">
        <table class="task-table">
          <thead>
            <tr><th>Title</th><th>Project</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due</th><th></th></tr>
          </thead>
          <tbody id="task-table-body">${rows}</tbody>
        </table>
        <p class="empty-note" id="tasks-empty" style="display:${state.tasks.length ? "none" : "block"};">No tasks available. Create a new ticket to get started.</p>
      </div>
  `;
}

function createTaskBoardGrid(tasks, statuses) {
  return `
      <div class="task-board-columns" id="task-board-columns">
        ${statuses.map((status) => `
          <div class="task-status-column" data-status="${status}">
            <h3>${status}</h3>
            <div class="task-status-list">
              ${(tasks || []).filter((task) => task.status === status).map((task) => createTaskCard(task)).join("")}
            </div>
          </div>
        `).join("")}
      </div>
      ${state.tasks.length === 0 ? `<p class="empty-note">No tasks available. Create a new ticket to get started.</p>` : ""}
  `;
}

function createTaskCard(task) {
  return `
      <div class="task-card" draggable="true" data-task-id="${task.id}">
        <strong>${task.title}</strong>
        <div class="task-card-meta">
          <span>${task.projectName || "General"}</span>
          <span>${task.assigneeName || "Unassigned"}</span>
        </div>
        <div class="task-card-meta">
          <span>${task.priority}</span>
          <span>${task.dueDate ? formatDate(task.dueDate, getUserTimeZone()) : "No due date"}</span>
        </div>
        <div class="task-card-actions">
          <button type="button" data-action="view-task" data-id="${task.id}">Details</button>
        </div>
      </div>
  `;
}

function createTaskDetailModalHtml() {
  return `
    <div class="task-modal-overlay" id="task-detail-modal" style="display:none;">
      <div class="task-modal-card task-detail-card">
        <div class="task-modal-header">
          <h3 id="task-detail-title">Task details</h3>
          <button class="icon-button" id="close-task-detail" type="button">×</button>
        </div>
        <div class="task-detail-body" id="task-detail-body"></div>
      </div>
    </div>
  `;
}

function attachTaskListeners() {
  const newTaskBtn = document.getElementById("new-task");
  if (newTaskBtn) newTaskBtn.addEventListener("click", () => openTaskModal());

  const newProjectBtn = document.getElementById("new-project");
  if (newProjectBtn) newProjectBtn.addEventListener("click", () => openProjectModal());

  const closeModal = document.getElementById("close-task-modal");
  if (closeModal) closeModal.addEventListener("click", closeTaskModal);
  const cancelModal = document.getElementById("cancel-task");
  if (cancelModal) cancelModal.addEventListener("click", closeTaskModal);

  const closeDetail = document.getElementById("close-task-detail");
  if (closeDetail) closeDetail.addEventListener("click", closeTaskDetailModal);

  const closeProjectModal = document.getElementById("close-project-modal");
  if (closeProjectModal) closeProjectModal.addEventListener("click", closeProjectModal);
  const cancelProjectModal = document.getElementById("cancel-project");
  if (cancelProjectModal) cancelProjectModal.addEventListener("click", closeProjectModal);

  const projectForm = document.getElementById("project-form");
  if (projectForm) {
    projectForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveProject();
    });
  }

  const taskForm = document.getElementById("task-form");
  if (taskForm) {
    taskForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveTask();
    });
  }

  const viewButtons = Array.from(document.querySelectorAll("[data-action='view-task']"));
  viewButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await openTaskDetails(id);
    });
  });

  const filterProject = document.getElementById("filter-project");
  const filterStatus = document.getElementById("filter-status");
  const filterAssignee = document.getElementById("filter-assignee");
  if (filterProject) {
    filterProject.value = state.taskFilter.projectId || "";
    filterProject.addEventListener("change", async () => {
      state.taskFilter.projectId = filterProject.value || null;
      await refreshTasks();
    });
  }
  if (filterStatus) {
    filterStatus.value = state.taskFilter.status || "";
    filterStatus.addEventListener("change", async () => {
      state.taskFilter.status = filterStatus.value || null;
      await refreshTasks();
    });
  }
  if (filterAssignee) {
    filterAssignee.value = state.taskFilter.assigneeId || "";
    filterAssignee.addEventListener("change", async () => {
      state.taskFilter.assigneeId = filterAssignee.value || null;
      await refreshTasks();
    });
  }

  const tabs = Array.from(document.querySelectorAll(".task-board-tabs .tab"));
  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      const view = tab.dataset.view;
      if (view) {
        state.taskView = view;
        renderTasks();
      }
    });
  });

  setupBoardDragEvents();
}

function setupBoardDragEvents() {
  const cards = Array.from(document.querySelectorAll(".task-card[draggable='true']"));
  cards.forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", card.dataset.taskId);
      event.dataTransfer.effectAllowed = "move";
    });
  });

  const columns = Array.from(document.querySelectorAll(".task-status-column"));
  columns.forEach((column) => {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("drag-over");
    });
    column.addEventListener("dragleave", () => {
      column.classList.remove("drag-over");
    });
    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      column.classList.remove("drag-over");
      const taskId = event.dataTransfer.getData("text/plain");
      const newStatus = column.dataset.status;
      if (!taskId || !newStatus) return;
      await updateTaskStatus(taskId, newStatus);
      await refreshTasks();
    });
  });
}

async function openTaskModal(task = null) {
  await loadProjects();
  
  const modal = document.getElementById("task-modal");
  const titleEl = document.getElementById("task-modal-title");
  const formId = document.getElementById("task-id");
  const titleInput = document.getElementById("task-title");
  const descInput = document.getElementById("task-description");
  const projectInput = document.getElementById("task-project");
  const assigneeInput = document.getElementById("task-assignee");
  const statusInput = document.getElementById("task-status");
  const priorityInput = document.getElementById("task-priority");
  const dueInput = document.getElementById("task-due-date");

  if (!modal || !titleEl || !formId || !titleInput || !descInput || !projectInput || !assigneeInput || !statusInput || !priorityInput || !dueInput) return;

  // Update project dropdown with latest projects
  const projects = state.projects || [];
  projectInput.innerHTML = `<option value="">General</option>${projects.map((project) => `<option value="${project.id}">${project.name} (${project.clientName || 'No Client'})</option>`).join("")}`;

  titleEl.textContent = task ? "Edit Task" : "New Task";
  formId.value = task?.id || "";
  titleInput.value = task?.title || "";
  descInput.value = task?.description || "";
  projectInput.value = task?.projectId || "";
  assigneeInput.value = task?.assigneeId || "";
  statusInput.value = task?.status || TASK_STATUS_OPTIONS[0];
  priorityInput.value = task?.priority || "Normal";
  dueInput.value = task?.dueDate || "";

  modal.style.display = "flex";
  
  // Focus on title input for better UX
  if (!task) {
    setTimeout(() => titleInput.focus(), 100);
  }
}

function closeTaskModal() {
  const modal = document.getElementById("task-modal");
  if (modal) modal.style.display = "none";
}

function openTaskDetailModal() {
  const modal = document.getElementById("task-detail-modal");
  if (modal) modal.style.display = "flex";
}

function closeTaskDetailModal() {
  const modal = document.getElementById("task-detail-modal");
  if (modal) modal.style.display = "none";
}

function openProjectModal() {
  const modal = document.getElementById("project-modal");
  const titleEl = document.getElementById("project-modal-title");
  const nameInput = document.getElementById("project-name");
  const clientNameInput = document.getElementById("project-client-name");
  const managerNameInput = document.getElementById("project-manager-name");
  const descInput = document.getElementById("project-description");
  const stackInput = document.getElementById("project-stack");
  const locationInput = document.getElementById("project-location");

  if (!modal || !titleEl || !nameInput || !clientNameInput || !managerNameInput || !descInput || !stackInput || !locationInput) return;

  titleEl.textContent = "New Project";
  nameInput.value = "";
  clientNameInput.value = "";
  managerNameInput.value = "";
  descInput.value = "";
  stackInput.value = "";
  locationInput.value = "India";

  modal.style.display = "flex";
  
  // Focus on project name input for better UX
  setTimeout(() => nameInput.focus(), 100);
}

function closeProjectModal() {
  const modal = document.getElementById("project-modal");
  if (modal) modal.style.display = "none";
}

async function saveTask() {
  const formId = document.getElementById("task-id");
  const titleInput = document.getElementById("task-title");
  const descInput = document.getElementById("task-description");
  const projectInput = document.getElementById("task-project");
  const assigneeInput = document.getElementById("task-assignee");
  const statusInput = document.getElementById("task-status");
  const priorityInput = document.getElementById("task-priority");
  const dueInput = document.getElementById("task-due-date");

  if (!titleInput || !projectInput || !statusInput || !priorityInput || !descInput || !assigneeInput || !dueInput) return;

  const payload = {
    title: titleInput.value.trim(),
    description: descInput.value.trim(),
    projectId: projectInput.value || null,
    assigneeId: assigneeInput.value || null,
    status: statusInput.value,
    priority: priorityInput.value,
    dueDate: dueInput.value || null,
  };

  if (!payload.title) {
    alert("Task title is required.");
    titleInput.focus();
    return;
  }

  if (payload.title.length < 3) {
    alert("Task title must be at least 3 characters long.");
    titleInput.focus();
    return;
  }

  try {
    if (formId.value) {
      await apiJson(`/api/tasks/${formId.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await apiJson("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await refreshTasks();
    closeTaskModal();
  } catch (error) {
    alert("Failed to save task. Please try again.");
    console.error("Save task error:", error);
  }
}

async function updateTaskStatus(taskId, status) {
  if (!taskId) return;
  await apiJson(`/api/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

async function saveProject() {
  const nameInput = document.getElementById("project-name");
  const clientNameInput = document.getElementById("project-client-name");
  const managerNameInput = document.getElementById("project-manager-name");
  const descInput = document.getElementById("project-description");
  const stackInput = document.getElementById("project-stack");
  const locationInput = document.getElementById("project-location");

  if (!nameInput || !clientNameInput || !managerNameInput || !descInput || !stackInput || !locationInput) return;

  const payload = {
    name: nameInput.value.trim(),
    clientName: clientNameInput.value.trim(),
    managerName: managerNameInput.value.trim(),
    description: descInput.value.trim(),
    stack: stackInput.value.trim(),
    location: locationInput.value,
  };

  if (!payload.name) {
    alert("Project name is required.");
    nameInput.focus();
    return;
  }

  if (payload.name.length < 3) {
    alert("Project name must be at least 3 characters long.");
    nameInput.focus();
    return;
  }

  if (!payload.clientName) {
    alert("Client name is required.");
    clientNameInput.focus();
    return;
  }

  if (!payload.managerName) {
    alert("Manager name is required.");
    managerNameInput.focus();
    return;
  }

  if (!payload.stack) {
    alert("Stack used is required.");
    stackInput.focus();
    return;
  }

  try {
    await createProject(payload);
    await loadProjects();
    refreshTasks();
    closeProjectModal();
    
    // Update task modal project dropdown
    const taskProjectInput = document.getElementById("task-project");
    if (taskProjectInput) {
      const projects = state.projects || [];
      taskProjectInput.innerHTML = `<option value="">General</option>${projects.map((project) => `<option value="${project.id}">${project.name} (${project.clientName || 'No Client'})</option>`).join("")}`;
    }
  } catch (error) {
    alert("Failed to create project. Please try again.");
    console.error("Create project error:", error);
  }
}

async function refreshTasks() {
  await loadTasks({ status: state.taskFilter.status, projectId: state.taskFilter.projectId, assigneeId: state.taskFilter.assigneeId });
  renderTasks();
}

function renderTasks() {
  const taskBoardColumns = document.getElementById("task-board-columns");
  const taskTableBody = document.getElementById("task-table-body");
  const tasksEmpty = document.getElementById("tasks-empty");
  
  if (state.taskView === "board" && taskBoardColumns) {
    taskBoardColumns.innerHTML = "";
    const statuses = state.taskStatuses || TASK_STATUS_OPTIONS;
    statuses.forEach((status) => {
      const column = document.createElement("div");
      column.className = "task-status-column";
      column.dataset.status = status;
      column.innerHTML = `
        <h3>${status}</h3>
        <div class="task-status-list">
          ${(state.tasks || []).filter((task) => task.status === status).map((task) => createTaskCard(task)).join("")}
        </div>
      `;
      taskBoardColumns.appendChild(column);
    });
    
    if (state.tasks.length === 0) {
      const emptyNote = document.createElement("p");
      emptyNote.className = "empty-note";
      emptyNote.textContent = "No tasks available. Create a new ticket to get started.";
      taskBoardColumns.parentNode.appendChild(emptyNote);
    }
    
    setupBoardDragEvents();
  } else if (state.taskView === "list" && taskTableBody) {
    const rows = (state.tasks || []).map((task) => `
      <tr data-task-id="${task.id}">
        <td>${task.title}</td>
        <td>${task.projectName || "General"}</td>
        <td>${task.assigneeName || "Unassigned"}</td>
        <td>${task.status}</td>
        <td>${task.priority}</td>
        <td>${task.dueDate ? formatDate(task.dueDate, getUserTimeZone()) : "—"}</td>
        <td><button type="button" class="mini-action" data-action="view-task" data-id="${task.id}">Details</button></td>
      </tr>
    `).join("");
    taskTableBody.innerHTML = rows;
    
    if (tasksEmpty) {
      tasksEmpty.style.display = state.tasks.length ? "none" : "block";
    }
    
    // Re-attach view task listeners
    const viewButtons = Array.from(document.querySelectorAll("[data-action='view-task']"));
    viewButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        await openTaskDetails(id);
      });
    });
  }
}

async function openTaskDetails(id) {
  const response = await apiJson(`/api/tasks/${id}`);
  if (!response || !response.task) return;
  state.currentTask = response.task;
  renderTaskDetail();
  openTaskDetailModal();
}

function renderTaskDetail() {
  const task = state.currentTask;
  const root = document.getElementById("task-detail-body");
  if (!root || !task) return;

  const attachments = (task.attachments || []).map((attachment) => `
    <div class="attachment-row">
      <strong>${attachment.name}</strong>
      <p>${attachment.fileName ? `File: ${attachment.fileName}` : `Link: <a href="${attachment.url}" target="_blank" rel="noreferrer">${attachment.url}</a>`}</p>
      <p class="small-text">Added by ${attachment.authorName} on ${formatDate(attachment.createdAt, getUserTimeZone())}</p>
    </div>
  `).join("");

  const comments = (task.comments || []).map((comment) => `
    <div class="comment-row">
      <strong>${comment.authorName} · ${formatDate(comment.createdAt, getUserTimeZone())}</strong>
      <p>${comment.message}</p>
    </div>
  `).join("");

  root.innerHTML = `
    <div class="task-detail-content">
      <h2 style="margin: 0 0 16px; font-size: 20px; color: var(--text-primary);">${task.title}</h2>
      <div class="task-detail-grid">
        <div class="detail-attribute"><strong>Project</strong><span>${task.projectName || "General"}</span></div>
        <div class="detail-attribute"><strong>Status</strong><span>${task.status}</span></div>
        <div class="detail-attribute"><strong>Assignee</strong><span>${task.assigneeName || "Unassigned"}</span></div>
        <div class="detail-attribute"><strong>Priority</strong><span>${task.priority}</span></div>
        <div class="detail-attribute"><strong>Due</strong><span>${task.dueDate ? formatDate(task.dueDate, getUserTimeZone()) : "No due date"}</span></div>
        <div class="detail-attribute"><strong>Created by</strong><span>${task.creatorName || "Unknown"}</span></div>
      </div>
      <div class="detail-section">
        <h4>Description</h4>
        <p>${task.description || "No description provided."}</p>
      </div>
      <div class="detail-section">
        <h4>Comments</h4>
        ${comments || `<p class="empty-note">No comments yet.</p>`}
        <form id="comment-form" class="task-detail-form">
          <div class="field-block full-width">
            <textarea id="task-comment-text" rows="3" placeholder="Write a comment..." required></textarea>
          </div>
          <button class="btn btn-primary" type="submit">Add Comment</button>
        </form>
      </div>
      <div class="detail-section">
        <h4>Attachments</h4>
        ${attachments || `<p class="empty-note">No attachments yet.</p>`}
        <form id="attachment-form" class="task-detail-form">
          <div class="form-grid">
            <label class="field-block"><span>Attachment Name</span><input id="attachment-name" placeholder="Attachment name" required /></label>
            <label class="field-block"><span>Attachment URL</span><input id="attachment-url" placeholder="https://..." required /></label>
          </div>
          <button class="btn btn-primary" type="submit">Add Attachment</button>
        </form>
      </div>
    </div>
  `;

  const commentForm = document.getElementById("comment-form");
  if (commentForm) {
    commentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitTaskComment();
    });
  }

  const attachmentForm = document.getElementById("attachment-form");
  if (attachmentForm) {
    attachmentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitTaskAttachment();
    });
  }
}

async function submitTaskComment() {
  const text = document.getElementById("task-comment-text");
  if (!text) return;
  const message = text.value.trim();
  if (!message) {
    alert("Enter a comment before posting.");
    return;
  }
  await postTaskComment(state.currentTask.id, message);
  text.value = "";
  const response = await loadTask(state.currentTask.id);
  state.currentTask = response.task;
  renderTaskDetail();
  await refreshTasks();
}

async function submitTaskAttachment() {
  const nameInput = document.getElementById("attachment-name");
  const urlInput = document.getElementById("attachment-url");
  if (!nameInput || !urlInput) return;

  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  if (!name || !url) {
    alert("Both attachment name and link are required.");
    return;
  }

  await postTaskAttachment(state.currentTask.id, { name, url });
  nameInput.value = "";
  urlInput.value = "";
  const response = await loadTask(state.currentTask.id);
  state.currentTask = response.task;
  renderTaskDetail();
  await refreshTasks();
}

async function initTasksPage() {
  state.taskFilter = state.taskFilter || { status: null, projectId: null, assigneeId: null };
  state.taskView = state.taskView || "board";
  await Promise.all([loadProjects(), loadTeamEmployees(), loadToday()]);
  await loadTasks(state.taskFilter);
  root.innerHTML = createTasksTemplate();
  attachDashboardListeners();
  attachTaskListeners();
  updateButtons();
}

async function renderTasksPage() {
  await initTasksPage();
}
