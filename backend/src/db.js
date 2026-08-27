

const { getDb } = require("./mongo");
const { ObjectId } = require("mongodb");

function getEmployeeCollections(db) {
  return [db.collection("employees"), db.collection("users")];
}

function normalizeEmployee(employee) {
  if (!employee) return null;
  return { ...employee, role: employee.role === "user" ? "employee" : employee.role, id: employee._id.toString() };
}

async function getEmployees() {
  const db = await getDb();
  const collections = getEmployeeCollections(db);
  const records = (await Promise.all(collections.map((collection) => collection.find({}).toArray()))).flat();
  const unique = new Map();
  for (const employee of records) {
    const id = employee._id.toString();
    if (!unique.has(id)) unique.set(id, employee);
  }
  return [...unique.values()].map(normalizeEmployee);
}

async function findEmployeeByUsername(username) {
  const db = await getDb();
  const needle = username.trim().toLowerCase();
  for (const employees of getEmployeeCollections(db)) {
    const employee = await employees.findOne({ normalizedUsername: needle });
    if (employee) return normalizeEmployee(employee);
  }
  return null;
}

async function findEmployeeById(id) {
  if (!id) return null;
  const db = await getDb();
  try {
    for (const employees of getEmployeeCollections(db)) {
      const employee = await employees.findOne({ _id: new ObjectId(id) });
      if (employee) return normalizeEmployee(employee);
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function createEmployee({ username, passwordHash, fullName, role = "employee", location = null, timezone = null, dailyBreakAllowanceMinutes = 60 }) {
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
  const employees = db.collection("employees");
  const r = await employees.insertOne(doc);
  return normalizeEmployee(await employees.findOne({ _id: r.insertedId }));
}

async function updateEmployee(id, { username, passwordHash, fullName, role, location, timezone }) {
  const db = await getDb();
  try {
    const updates = {
      username: username.trim(),
      normalizedUsername: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      role,
      location: location || null,
      timezone: timezone || null,
      updatedAt: new Date().toISOString(),
    };
    if (passwordHash) updates.passwordHash = passwordHash;
    for (const employees of getEmployeeCollections(db)) {
      const result = await employees.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updates },
        { returnDocument: "after" }
      );
      if (result.value) return normalizeEmployee(result.value);
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function deleteEmployee(id) {
  const db = await getDb();
  try {
    for (const employees of getEmployeeCollections(db)) {
      const result = await employees.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount > 0) return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

async function getAllEvents() {
  const db = await getDb();
  const events = await db.collection("attendance").find({}).sort({ timestampUtc: 1 }).toArray();
  return events.map((e) => ({ ...e, id: e._id.toString() }));
}

async function getEventsForEmployee(employeeId) {
  const db = await getDb();
  const uid = String(employeeId);
  const events = await db.collection("attendance").find({ $or: [{ employeeId: uid }, { userId: uid }] }).sort({ timestampUtc: 1 }).toArray();
  return events.map((e) => ({ ...e, id: e._id.toString() }));
}

async function addEvent({ employeeId, type, timestampUtc, latitude, longitude, address, reason }) {
  const db = await getDb();
  const event = {
    employeeId: String(employeeId),
    type,
    timestampUtc,
    latitude: typeof latitude === "number" ? latitude : null,
    longitude: typeof longitude === "number" ? longitude : null,
    address: address || null,
    reason: typeof reason === "string" ? reason.trim().slice(0, 200) || null : null,
  };
  const r = await db.collection("attendance").insertOne(event);
  const e = await db.collection("attendance").findOne({ _id: r.insertedId });
  return { ...e, id: e._id.toString() };
}

async function updateAttendanceEvent(employeeId, eventId, { timestampUtc, reason }) {
  const db = await getDb();
  let objectId;
  try {
    objectId = new ObjectId(eventId);
  } catch {
    return null;
  }

  const result = await db.collection("attendance").updateOne(
    { _id: objectId, $or: [{ employeeId: String(employeeId) }, { userId: String(employeeId) }] },
    { $set: { timestampUtc, reason: typeof reason === "string" ? reason.trim().slice(0, 200) || null : null, updatedAt: new Date().toISOString() } }
  );
  if (!result.matchedCount) return null;
  const event = await db.collection("attendance").findOne({ _id: objectId });
  return { ...event, id: event._id.toString() };
}

async function deleteAttendanceEvent(employeeId, eventId) {
  const db = await getDb();
  let objectId;
  try {
    objectId = new ObjectId(eventId);
  } catch {
    return false;
  }

  const result = await db.collection("attendance").deleteOne({
    _id: objectId,
    $or: [{ employeeId: String(employeeId) }, { userId: String(employeeId) }],
  });
  return result.deletedCount > 0;
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

async function getLeaveById(id) {
  const db = await getDb();
  try {
    const leave = await db.collection("leaves").findOne({ _id: new ObjectId(id) });
    return leave ? { ...leave, id: leave._id.toString() } : null;
  } catch (err) {
    return null;
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

async function updateEmployeeBreakAllowance(employeeId, dailyBreakAllowanceMinutes) {
  const db = await getDb();
  try {
    for (const employees of getEmployeeCollections(db)) {
      const result = await employees.findOneAndUpdate(
        { _id: new ObjectId(employeeId) },
        { $set: { dailyBreakAllowanceMinutes, updatedAt: new Date().toISOString() } },
        { returnDocument: "after" }
      );
      if (result.value) return normalizeEmployee(result.value);
    }
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  getEmployees,
  findEmployeeByUsername,
  findEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAllEvents,
  getEventsForEmployee,
  addEvent,
  updateAttendanceEvent,
  deleteAttendanceEvent,
  getProjects,
  createProject,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  addTaskComment,
  addTaskAttachment,
  getLeaves,
  getLeaveById,
  createLeave,
  updateLeave,
  deleteLeave,
  updateEmployeeBreakAllowance,
};
