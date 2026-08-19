const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");
const { requireAuth } = require("./middleware");

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,32}$/;

async function canManageEmployees(req, res, next) {
  try {
    const employees = await db.getEmployees();
    if (employees.length === 0) {
      // Allow the first account to be created without an admin so the app can bootstrap.
      return next();
    }

    if (!req.session || !(req.session.employeeId || req.session.userId)) {
      return res.status(401).json({ error: "Admin authentication required." });
    }

    const employee = await db.findEmployeeById(req.session.employeeId || req.session.userId);
    if (!employee || employee.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

const createEmployeeHandler = async (req, res) => {
  try {
    const { username, password, fullName, role = "employee", location, timezone, dailyBreakAllowanceMinutes } = req.body || {};

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: "Full name, username and password are all required." });
    }
    if (!USERNAME_RE.test(username.trim())) {
      return res.status(400).json({
        error: "Username must be 3-32 characters: letters, numbers, underscore or dot only.",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    const existing = await db.findEmployeeByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "That username is already taken." });
    }

    const employees = await db.getEmployees();
    const requestedRole = role === "user" ? "employee" : role;
    const selectedRole = employees.length === 0 ? "admin" : requestedRole;
    if (!["employee", "admin"].includes(selectedRole)) {
      return res.status(400).json({ error: "Role must be employee or admin." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const employee = await db.createEmployee({
      username,
      passwordHash,
      fullName,
      role: selectedRole,
      location: location || null,
      timezone: timezone || null,
      dailyBreakAllowanceMinutes: dailyBreakAllowanceMinutes || 60,
    });
    res.json({
      id: employee.id,
      username: employee.username,
      fullName: employee.fullName,
      role: employee.role,
      location: employee.location || null,
      timezone: employee.timezone || null,
      dailyBreakAllowanceMinutes: employee.dailyBreakAllowanceMinutes || 60,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
};

router.post("/create-employee", canManageEmployees, createEmployeeHandler);

router.post("/create-user", canManageEmployees, async (req, res) => {
  return createEmployeeHandler(req, res);
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  const employee = await db.findEmployeeByUsername(username);
  if (!employee) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  const ok = await bcrypt.compare(password, employee.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  req.session.employeeId = employee.id;
  req.session.userId = employee.id;
  req.session.loginAt = new Date().toISOString();
  res.json({
    id: employee.id,
    username: employee.username,
    fullName: employee.fullName,
    role: employee.role,
    location: employee.location || null,
    timezone: employee.timezone || null,
    dailyBreakAllowanceMinutes: employee.dailyBreakAllowanceMinutes || 60,
    loggedInAt: req.session.loginAt,
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("crm_session");
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", async (req, res) => {
  const employeeId = req.session?.employeeId || req.session?.userId;
  if (!employeeId) return res.json({ employee: null });
  const employee = await db.findEmployeeById(employeeId);
  if (!employee) return res.json({ employee: null });
  res.json({
    employee: {
      id: employee.id,
      username: employee.username,
      fullName: employee.fullName,
      role: employee.role,
      location: employee.location || null,
      timezone: employee.timezone || null,
      dailyBreakAllowanceMinutes: employee.dailyBreakAllowanceMinutes || 60,
      loggedInAt: req.session.loginAt || null,
    },
  });
});

router.put("/employees/:id/break-allowance", canManageEmployees, async (req, res) => {
  try {
    const { id } = req.params;
    const { dailyBreakAllowanceMinutes } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: "Employee ID is required." });
    }
    if (dailyBreakAllowanceMinutes === undefined || dailyBreakAllowanceMinutes === null) {
      return res.status(400).json({ error: "Daily break allowance minutes is required." });
    }
    if (dailyBreakAllowanceMinutes < 0) {
      return res.status(400).json({ error: "Daily break allowance must be a positive number." });
    }

    const employee = await db.updateEmployeeBreakAllowance(id, dailyBreakAllowanceMinutes);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    res.json({
      id: employee.id,
      username: employee.username,
      fullName: employee.fullName,
      role: employee.role,
      dailyBreakAllowanceMinutes: employee.dailyBreakAllowanceMinutes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

module.exports = router;
