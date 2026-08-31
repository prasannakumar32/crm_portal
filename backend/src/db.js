

const { supabase } = require("./supabase");

// Convert snake_case to camelCase
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = typeof obj[key] === 'object' && obj[key] !== null ? toCamelCase(obj[key]) : obj[key];
    return acc;
  }, {});
}

function normalizeEmployee(employee) {
  if (!employee) return null;
  const camel = toCamelCase(employee);
  return { ...camel, role: camel.role === "user" ? "employee" : camel.role };
}

function normalizeEvent(event) {
  if (!event) return null;
  return toCamelCase(event);
}

function normalizeTask(task) {
  if (!task) return null;
  return toCamelCase(task);
}

function normalizeProject(project) {
  if (!project) return null;
  return toCamelCase(project);
}

function normalizeLeave(leave) {
  if (!leave) return null;
  return toCamelCase(leave);
}

async function getEmployees() {
  const { data: employeesData, error: employeesError } = await supabase
    .from('employees')
    .select('*');
  
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*');
  
  if (employeesError || usersError) {
    console.error('Error fetching employees:', employeesError || usersError);
    return [];
  }
  
  const allRecords = [...(employeesData || []), ...(usersData || [])];
  const unique = new Map();
  for (const employee of allRecords) {
    if (!unique.has(employee.id)) unique.set(employee.id, employee);
  }
  return [...unique.values()].map(normalizeEmployee);
}

async function findEmployeeByUsername(username) {
  const needle = username.trim().toLowerCase();
  
  // Check employees table first
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('normalized_username', needle)
    .single();
  
  if (employee && !empError) return normalizeEmployee(employee);
  
  // Check users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('normalized_username', needle)
    .single();
  
  if (user && !userError) return normalizeEmployee(user);
  
  return null;
}

async function findEmployeeById(id) {
  if (!id) return null;
  
  // Check employees table first
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();
  
  if (employee && !empError) return normalizeEmployee(employee);
  
  // Check users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (user && !userError) return normalizeEmployee(user);
  
  return null;
}

async function createEmployee({ username, passwordHash, fullName, role = "employee", location = null, timezone = null, dailyBreakAllowanceMinutes = 60 }) {
  const normalizedUsername = username.trim().toLowerCase();
  const doc = {
    username: username.trim(),
    normalized_username: normalizedUsername,
    password_hash: passwordHash,
    full_name: fullName.trim(),
    role,
    location: location || null,
    timezone: timezone || null,
    daily_break_allowance_minutes: dailyBreakAllowanceMinutes || 60,
  };
  
  const { data, error } = await supabase
    .from('employees')
    .insert(doc)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating employee:', error);
    return null;
  }
  
  return normalizeEmployee(data);
}

async function updateEmployee(id, { username, passwordHash, fullName, role, location, timezone }) {
  const updates = {
    username: username.trim(),
    normalized_username: username.trim().toLowerCase(),
    full_name: fullName.trim(),
    role,
    location: location || null,
    timezone: timezone || null,
  };
  if (passwordHash) updates.password_hash = passwordHash;
  
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating employee:', error);
    return null;
  }
  
  return normalizeEmployee(data);
}

async function deleteEmployee(id) {
  // Try employees table first
  const { error: empError } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);
  
  if (!empError) return true;
  
  // Try users table
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  
  return !userError;
}

async function getAllEvents() {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('timestamp_utc', { ascending: true });
  
  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }
  
  return (data || []).map(normalizeEvent);
}

async function getEventsForEmployee(employeeId) {
  const uid = String(employeeId);
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .or(`employee_id.eq.${uid},user_id.eq.${uid}`)
    .order('timestamp_utc', { ascending: true });
  
  if (error) {
    console.error('Error fetching employee events:', error);
    return [];
  }
  
  return (data || []).map(normalizeEvent);
}

async function addEvent({ employeeId, type, timestampUtc, latitude, longitude, address, reason }) {
  const event = {
    employee_id: String(employeeId),
    type,
    timestamp_utc: timestampUtc,
    latitude: typeof latitude === "number" ? latitude : null,
    longitude: typeof longitude === "number" ? longitude : null,
    address: address || null,
    reason: typeof reason === "string" ? reason.trim().slice(0, 200) || null : null,
  };
  
  const { data, error } = await supabase
    .from('attendance')
    .insert(event)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding event:', error);
    return null;
  }
  
  return normalizeEvent(data);
}

async function updateAttendanceEvent(employeeId, eventId, { timestampUtc, reason }) {
  const updates = {
    timestamp_utc: timestampUtc,
    reason: typeof reason === "string" ? reason.trim().slice(0, 200) || null : null,
  };
  
  const { data, error } = await supabase
    .from('attendance')
    .update(updates)
    .eq('id', eventId)
    .or(`employee_id.eq.${String(employeeId)},user_id.eq.${String(employeeId)}`)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating event:', error);
    return null;
  }
  
  return normalizeEvent(data);
}

async function deleteAttendanceEvent(employeeId, eventId) {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', eventId)
    .or(`employee_id.eq.${String(employeeId)},user_id.eq.${String(employeeId)}`);
  
  return !error;
}

async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  
  return (data || []).map(normalizeProject);
}

async function createProject({ name, clientName, managerName, description, stack, location, ownerId }) {
  const doc = {
    name: String(name).trim(),
    client_name: String(clientName).trim(),
    manager_name: String(managerName).trim(),
    description: String(description || "").trim(),
    stack: String(stack).trim(),
    location: location || "India",
    owner_id: ownerId || null,
  };
  
  const { data, error } = await supabase
    .from('projects')
    .insert(doc)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating project:', error);
    return null;
  }
  
  return normalizeProject(data);
}

async function getTasks({ assigneeId = null, status = null, projectId = null } = {}) {
  let query = supabase.from('tasks').select('*');
  
  if (assigneeId) {
    const uid = String(assigneeId);
    query = query.or(`assignee_id.eq.${uid},creator_id.eq.${uid}`);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  
  const { data, error } = await query.order('updated_at', { ascending: false }).order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  
  return (data || []).map(normalizeTask);
}

async function getTaskById(id) {
  if (!id) return null;
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching task:', error);
    return null;
  }
  
  return normalizeTask(data);
}

async function createTask({ title, description, projectId, status, assigneeId, creatorId, priority, dueDate, comments, attachments }) {
  const doc = {
    title: String(title).trim(),
    description: String(description || "").trim(),
    project_id: projectId || null,
    status: status || "Backlog",
    assignee_id: assigneeId || null,
    creator_id: creatorId || null,
    priority: priority || "Normal",
    due_date: dueDate || null,
    comments: comments || [],
    attachments: attachments || [],
  };
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(doc)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating task:', error);
    return null;
  }
  
  return normalizeTask(data);
}

async function updateTask(id, updates = {}) {
  if (!id) return null;
  const allowedUpdates = ["title", "description", "status", "assigneeId", "dueDate", "projectId", "priority"];
  const updateFields = {};
  
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase to snake_case
      updateFields[dbKey] = updates[key] === "" ? null : updates[key];
    }
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating task:', error);
    return null;
  }
  
  return normalizeTask(data);
}

async function addTaskComment(id, comment) {
  if (!id) return null;
  
  const { data, error } = await supabase
    .from('tasks')
    .select('comments')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching task for comment:', error);
    return null;
  }
  
  const updatedComments = [...(data.comments || []), comment];
  
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({ comments: updatedComments })
    .eq('id', id)
    .select()
    .single();
  
  if (updateError) {
    console.error('Error adding comment:', updateError);
    return null;
  }
  
  return normalizeTask(updatedTask);
}

async function addTaskAttachment(id, attachment) {
  if (!id) return null;
  
  const { data, error } = await supabase
    .from('tasks')
    .select('attachments')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching task for attachment:', error);
    return null;
  }
  
  const updatedAttachments = [...(data.attachments || []), attachment];
  
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({ attachments: updatedAttachments })
    .eq('id', id)
    .select()
    .single();
  
  if (updateError) {
    console.error('Error adding attachment:', updateError);
    return null;
  }
  
  return normalizeTask(updatedTask);
}

async function getLeaves() {
  const { data, error } = await supabase
    .from('leaves')
    .select('*');
  
  if (error) {
    console.error('Error fetching leaves:', error);
    return [];
  }
  
  return (data || []).map(normalizeLeave);
}

async function getLeaveById(id) {
  const { data, error } = await supabase
    .from('leaves')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching leave:', error);
    return null;
  }
  
  return normalizeLeave(data);
}

async function createLeave(leaveData) {
  const doc = {
    employee_id: leaveData.employeeId,
    employee_name: leaveData.employeeName,
    start_date: leaveData.startDate,
    end_date: leaveData.endDate || null,
    type: leaveData.type || 'Leave',
    reason: leaveData.reason || null,
    status: leaveData.status || 'Pending',
  };
  
  const { data, error } = await supabase
    .from('leaves')
    .insert(doc)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating leave:', error);
    return null;
  }
  
  return normalizeLeave(data);
}

async function updateLeave(id, updateData) {
  const updates = {
    employee_id: updateData.employeeId,
    employee_name: updateData.employeeName,
    start_date: updateData.startDate,
    end_date: updateData.endDate || null,
    type: updateData.type || 'Leave',
    reason: updateData.reason || null,
    status: updateData.status || 'Pending',
  };
  
  const { data, error } = await supabase
    .from('leaves')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating leave:', error);
    return null;
  }
  
  return normalizeLeave(data);
}

async function deleteLeave(id) {
  const { error } = await supabase
    .from('leaves')
    .delete()
    .eq('id', id);
  
  return !error;
}

async function updateEmployeeBreakAllowance(employeeId, dailyBreakAllowanceMinutes) {
  // Try employees table first
  const { data, error: empError } = await supabase
    .from('employees')
    .update({ daily_break_allowance_minutes: dailyBreakAllowanceMinutes })
    .eq('id', employeeId)
    .select()
    .single();
  
  if (data && !empError) return normalizeEmployee(data);
  
  // Try users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .update({ daily_break_allowance_minutes: dailyBreakAllowanceMinutes })
    .eq('id', employeeId)
    .select()
    .single();
  
  if (userData && !userError) return normalizeEmployee(userData);
  
  return null;
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
