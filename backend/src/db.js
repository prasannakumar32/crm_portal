

const { getDb } = require("./mongo");
const { ObjectId } = require("mongodb");

async function getUsers() {
  const db = await getDb();
  const users = await db.collection("users").find({}).toArray();
  return users.map((u) => ({ ...u, role: u.role === "user" ? "employee" : u.role, id: u._id.toString() }));
}

async function findUserByUsername(username) {
  const db = await getDb();
  const needle = username.trim().toLowerCase();
  const user = await db.collection("users").findOne({ normalizedUsername: needle });
  if (!user) return null;
  return { ...user, role: user.role === "user" ? "employee" : user.role, id: user._id.toString() };
}

async function findUserById(id) {
  if (!id) return null;
  const db = await getDb();
  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!user) return null;
    return { ...user, role: user.role === "user" ? "employee" : user.role, id: user._id.toString() };
  } catch (err) {
    return null;
  }
}

async function createUser({ username, passwordHash, fullName, role = "employee", location = null, timezone = null, dailyBreakAllowanceMinutes = 60 }) {
  const db = await getDb();
  const normalizedUsername = username.trim().toLowerCase();
  const doc = {
    username: username.trim(),
    normalizedUsername,
    passwordHash,
    fullName: fullName.trim(),
    role,
    location: location || null,
    timezone: timezone || null,
    dailyBreakAllowanceMinutes: dailyBreakAllowanceMinutes || 60,
    createdAt: new Date().toISOString(),
  };
  const r = await db.collection("users").insertOne(doc);
  const user = await db.collection("users").findOne({ _id: r.insertedId });
  return { ...user, id: user._id.toString() };
}

async function getAllEvents() {
  const db = await getDb();
  const events = await db.collection("attendance").find({}).sort({ timestampUtc: 1 }).toArray();
  return events.map((e) => ({ ...e, id: e._id.toString() }));
}

async function getEventsForUser(userId) {
  const db = await getDb();
  const uid = String(userId);
  const events = await db.collection("attendance").find({ userId: uid }).sort({ timestampUtc: 1 }).toArray();
  return events.map((e) => ({ ...e, id: e._id.toString() }));
}

async function addEvent({ userId, type, latitude, longitude, address, reason }) {
  const db = await getDb();
  const event = {
    userId: String(userId),
    type,
    timestampUtc: new Date().toISOString(),
    latitude: typeof latitude === "number" ? latitude : null,
    longitude: typeof longitude === "number" ? longitude : null,
    address: address || null,
    reason: typeof reason === "string" ? reason.trim().slice(0, 200) || null : null,
  };
  const r = await db.collection("attendance").insertOne(event);
  const e = await db.collection("attendance").findOne({ _id: r.insertedId });
  return { ...e, id: e._id.toString() };
}

async function getProjects() {
  const db = await getDb();
  const projects = await db.collection("projects").find({}).sort({ createdAt: -1 }).toArray();
  return projects.map((project) => ({ ...project, id: project._id.toString() }));
}

async function createProject({ name, clientName, managerName, description, stack, location, ownerId }) {
  const db = await getDb();
  const doc = {
    name: String(name).trim(),
    clientName: String(clientName).trim(),
    managerName: String(managerName).trim(),
    description: String(description || "").trim(),
    stack: String(stack).trim(),
    location: location || "India",
    ownerId: ownerId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const r = await db.collection("projects").insertOne(doc);
  const project = await db.collection("projects").findOne({ _id: r.insertedId });
  return { ...project, id: project._id.toString() };
}

async function getTasks({ assigneeId = null, status = null, projectId = null } = {}) {
  const db = await getDb();
  const query = {};
  if (assigneeId) {
    query.$or = [{ assigneeId: String(assigneeId) }, { creatorId: String(assigneeId) }];
  }
  if (status) {
    query.status = status;
  }
  if (projectId) {
    query.projectId = projectId;
  }
  const tasks = await db.collection("tasks").find(query).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  return tasks.map((task) => ({ ...task, id: task._id.toString() }));
}

async function getTaskById(id) {
  if (!id) return null;
  const db = await getDb();
  try {
    const task = await db.collection("tasks").findOne({ _id: new ObjectId(id) });
    if (!task) return null;
    return { ...task, id: task._id.toString() };
  } catch (err) {
    return null;
  }
}

async function createTask({ title, description, projectId, status, assigneeId, creatorId, priority, dueDate, comments, attachments }) {
  const db = await getDb();
  const doc = {
    title: String(title).trim(),
    description: String(description || "").trim(),
    projectId: projectId || null,
    status: status || "Backlog",
    assigneeId: assigneeId || null,
    creatorId: creatorId || null,
    priority: priority || "Normal",
    dueDate: dueDate || null,
    comments: comments || [],
    attachments: attachments || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const r = await db.collection("tasks").insertOne(doc);
  const task = await db.collection("tasks").findOne({ _id: r.insertedId });
  return { ...task, id: task._id.toString() };
}

async function updateTask(id, updates = {}) {
  if (!id) return null;
  const db = await getDb();
  const allowedUpdates = ["title", "description", "status", "assigneeId", "dueDate", "projectId", "priority"];
  const updateFields = { updatedAt: new Date().toISOString() };
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      updateFields[key] = updates[key] === "" ? null : updates[key];
    }
  }
  try {
    const result = await db.collection("tasks").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after" }
    );
    if (!result.value) return null;
    return { ...result.value, id: result.value._id.toString() };
  } catch (err) {
    return null;
  }
}

async function addTaskComment(id, comment) {
  if (!id) return null;
  const db = await getDb();
  try {
    const result = await db.collection("tasks").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $push: { comments: comment }, $set: { updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    if (!result.value) return null;
    return { ...result.value, id: result.value._id.toString() };
  } catch (err) {
    return null;
  }
}

async function addTaskAttachment(id, attachment) {
  if (!id) return null;
  const db = await getDb();
  try {
    const result = await db.collection("tasks").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $push: { attachments: attachment }, $set: { updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    if (!result.value) return null;
    return { ...result.value, id: result.value._id.toString() };
  } catch (err) {
    return null;
  }
}

async function getLeaves() {
  const db = await getDb();
  try {
    const leaves = await db.collection("leaves").find({}).toArray();
    return leaves.map((l) => ({ ...l, id: l._id.toString() }));
  } catch (err) {
    // If collection doesn't exist, return empty array
    return [];
  }
}

async function createLeave(leaveData) {
  const db = await getDb();
  const doc = {
    ...leaveData,
    createdAt: new Date().toISOString(),
  };
  const result = await db.collection("leaves").insertOne(doc);
  const leave = await db.collection("leaves").findOne({ _id: result.insertedId });
  return { ...leave, id: leave._id.toString() };
}

async function updateLeave(id, updateData) {
  const db = await getDb();
  try {
    const result = await db.collection("leaves").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    if (!result.value) return null;
    return { ...result.value, id: result.value._id.toString() };
  } catch (err) {
    return null;
  }
}

async function deleteLeave(id) {
  const db = await getDb();
  try {
    const result = await db.collection("leaves").deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  } catch (err) {
    return false;
  }
}

async function updateUserBreakAllowance(userId, dailyBreakAllowanceMinutes) {
  const db = await getDb();
  try {
    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { dailyBreakAllowanceMinutes, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );
    if (!result.value) return null;
    return { ...result.value, id: result.value._id.toString() };
  } catch (err) {
    return null;
  }
}

module.exports = {
  getUsers,
  findUserByUsername,
  findUserById,
  createUser,
  getAllEvents,
  getEventsForUser,
  addEvent,
  getProjects,
  createProject,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  addTaskComment,
  addTaskAttachment,
  getLeaves,
  createLeave,
  updateLeave,
  deleteLeave,
  updateUserBreakAllowance,
};
