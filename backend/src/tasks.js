const express = require("express");
const db = require("./db");

const router = express.Router();

const DEFAULT_TASK_STATUSES = ["Backlog", "In Progress", "Review", "Done"];

function sanitizeTask(task) {
  return {
    id: task._id?.toString() || task.id,
    title: task.title,
    description: task.description,
    projectId: task.projectId || null,
    status: task.status || "Backlog",
    assigneeId: task.assigneeId || null,
    assigneeName: task.assigneeName || null,
    creatorId: task.creatorId || null,
    creatorName: task.creatorName || null,
    priority: task.priority || "Normal",
    dueDate: task.dueDate || null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    comments: task.comments || [],
    attachments: task.attachments || [],
  };
}

async function attachNames(tasks) {
  const users = await db.getUsers();
  const projects = await db.getProjects();
  const userById = new Map(users.map((u) => [u.id, u.fullName]));
  const projectById = new Map(projects.map((p) => [p.id, p.name]));
  return tasks.map((task) => ({
    ...task,
    assigneeName: task.assigneeId ? userById.get(task.assigneeId) || "Unknown" : "Unassigned",
    creatorName: task.creatorId ? userById.get(task.creatorId) || "Unknown" : "Unknown",
    projectName: task.projectId ? projectById.get(task.projectId) || "General" : "General",
  }));
}

router.get("/users", async (req, res) => {
  const users = await db.getUsers();
  res.json({ users: users.map((user) => ({ id: user.id, fullName: user.fullName, role: user.role, location: user.location, timezone: user.timezone })) });
});

router.get("/projects", async (req, res) => {
  const projects = await db.getProjects();
  res.json({ projects });
});

router.post("/projects", async (req, res) => {
  const user = await db.findUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: "Not signed in." });
  if (user.role !== "admin") return res.status(403).json({ error: "Only admins can create projects." });

  const { name, description, region } = req.body || {};
  if (!name) return res.status(400).json({ error: "Project name is required." });

  const project = await db.createProject({
    name,
    description: description || "",
    region: region || user.location || "Australia",
    ownerId: user.id,
  });

  res.json({ project });
});

router.get("/", async (req, res) => {
  const user = await db.findUserById(req.session.userId);
  const statusFilter = req.query.status ? String(req.query.status).trim() : null;
  const projectFilter = req.query.projectId ? String(req.query.projectId).trim() : null;
  const assigneeFilter = req.query.assigneeId ? String(req.query.assigneeId).trim() : null;

  let assigneeId = null;
  if (user.role !== "admin") {
    assigneeId = user.id;
  } else if (assigneeFilter) {
    assigneeId = assigneeFilter;
  }

  const tasks = await db.getTasks({ assigneeId, status: statusFilter, projectId: projectFilter });
  const tasksWithNames = await attachNames(tasks);
  res.json({ tasks: tasksWithNames, statuses: DEFAULT_TASK_STATUSES });
});

router.post("/", async (req, res) => {
  const user = await db.findUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const { title, description, projectId, assigneeId, dueDate, priority } = req.body || {};
  if (!title) return res.status(400).json({ error: "Task title is required." });

  const task = await db.createTask({
    title: title.trim(),
    description: description ? String(description).trim() : "",
    projectId: projectId || null,
    status: "Backlog",
    assigneeId: assigneeId || null,
    creatorId: user.id,
    priority: priority || "Normal",
    dueDate: dueDate || null,
    comments: [],
    attachments: [],
  });
  const taskWithNames = (await attachNames([task]))[0];
  res.json({ task: taskWithNames });
});

router.put("/:id", async (req, res) => {
  const user = await db.findUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const updates = {};
  const { title, description, status, assigneeId, dueDate, projectId, priority } = req.body || {};
  if (title !== undefined) updates.title = String(title).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (status !== undefined) updates.status = String(status).trim();
  if (assigneeId !== undefined) updates.assigneeId = assigneeId || null;
  if (dueDate !== undefined) updates.dueDate = dueDate || null;
  if (projectId !== undefined) updates.projectId = projectId || null;
  if (priority !== undefined) updates.priority = String(priority).trim();

  const task = await db.updateTask(req.params.id, updates);
  if (!task) return res.status(404).json({ error: "Task not found." });

  const taskWithNames = (await attachNames([task]))[0];
  res.json({ task: taskWithNames });
});

router.get("/:id", async (req, res) => {
  const task = await db.getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found." });
  const [taskWithNames] = await attachNames([task]);
  res.json({ task: taskWithNames });
});

router.post("/:id/comments", async (req, res) => {
  const user = await db.findUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const { message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Comment message is required." });
  }

  const comment = {
    id: new Date().getTime().toString(36),
    authorId: user.id,
    authorName: user.fullName,
    message: String(message).trim(),
    createdAt: new Date().toISOString(),
  };

  const task = await db.addTaskComment(req.params.id, comment);
  if (!task) return res.status(404).json({ error: "Task not found." });

  res.json({ comment });
});

router.post("/:id/attachments", async (req, res) => {
  const user = await db.findUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: "Not signed in." });

  const { name, url, fileName, contentType, contentBase64 } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Attachment name is required." });
  }

  const attachment = {
    id: new Date().getTime().toString(36),
    name: String(name).trim(),
    url: url ? String(url).trim() : null,
    fileName: fileName ? String(fileName).trim() : null,
    contentType: contentType ? String(contentType).trim() : null,
    contentBase64: contentBase64 ? String(contentBase64).trim() : null,
    authorId: user.id,
    authorName: user.fullName,
    createdAt: new Date().toISOString(),
  };

  const task = await db.addTaskAttachment(req.params.id, attachment);
  if (!task) return res.status(404).json({ error: "Task not found." });

  res.json({ attachment });
});

module.exports = router;
