const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./db");
const { requireAuth } = require("./middleware");
const { supabase } = require("./supabase");

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

router.put("/employees/:id", canManageEmployees, async (req, res) => {
  try {
    const { username, password, fullName, role, location, timezone } = req.body || {};
    if (!username || !fullName) {
      return res.status(400).json({ error: "Full name and username are required." });
    }
    if (!USERNAME_RE.test(username.trim())) {
      return res.status(400).json({ error: "Username must be 3-32 characters: letters, numbers, underscore or dot only." });
    }
    if (!['employee', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Role must be employee or admin." });
    }
    const existingUsername = await db.findEmployeeByUsername(username);
    const target = await db.findEmployeeById(req.params.id);
    if (!target) return res.status(404).json({ error: "Employee not found." });
    if (existingUsername && existingUsername.id !== target.id) {
      return res.status(409).json({ error: "That username is already taken." });
    }
    if (password && password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const employee = await db.updateEmployee(req.params.id, { username, passwordHash, fullName, role, location, timezone });
    if (!employee) return res.status(404).json({ error: "Employee not found." });
    res.json({ employee });
  } catch (err) {
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

router.delete("/employees/:id", canManageEmployees, async (req, res) => {
  try {
    if (String(req.params.id) === String(req.session.employeeId || req.session.userId)) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }
    const target = await db.findEmployeeById(req.params.id);
    if (!target) return res.status(404).json({ error: "Employee not found." });
    if (target.role === "admin") {
      const admins = (await db.getEmployees()).filter((employee) => employee.role === "admin");
      if (admins.length <= 1) return res.status(400).json({ error: "The last admin account cannot be deleted." });
    }
    const success = await db.deleteEmployee(req.params.id);
    if (!success) return res.status(404).json({ error: "Employee not found." });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Internal error" });
  }
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

// Microsoft OAuth Login
router.get("/microsoft/login", async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'microsoft',
      options: {
        redirectTo: `${req.protocol}://${req.get('host')}/api/auth/microsoft/callback`,
        scopes: 'openid profile email'
      }
    });

    if (error) throw error;

    if (data.url) {
      res.redirect(data.url);
    } else {
      res.status(500).json({ error: "Failed to initiate Microsoft login" });
    }
  } catch (err) {
    console.error("Microsoft OAuth error:", err);
    res.status(500).json({ error: "Failed to initiate Microsoft login" });
  }
});

// Microsoft OAuth Callback
router.get("/microsoft/callback", async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect('/#login?error=microsoft_auth_failed');
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error("Microsoft callback error:", error);
      return res.redirect('/#login?error=microsoft_auth_failed');
    }

    const { user, session } = data;
    const email = user.email;
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];

    // Try to find existing employee by email
    let employee = await db.findEmployeeByEmail(email);

    if (employee) {
      // Link Microsoft account to existing employee
      await db.updateEmployee(employee.id, { 
        microsoftUserId: user.id,
        microsoftEmail: email 
      });
      
      req.session.employeeId = employee.id;
      req.session.userId = employee.id;
      req.session.loginAt = new Date().toISOString();
      req.session.microsoftUserId = user.id;
      
      return res.redirect('/#dashboard');
    } else {
      // Create new employee account
      const employees = await db.getEmployees();
      const role = employees.length === 0 ? "admin" : "employee";
      
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '');
      
      // Check if username exists, append number if needed
      let finalUsername = username;
      let counter = 1;
      while (await db.findEmployeeByUsername(finalUsername)) {
        finalUsername = `${username}${counter}`;
        counter++;
      }

      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      
      employee = await db.createEmployee({
        username: finalUsername,
        passwordHash,
        fullName,
        role,
        microsoftUserId: user.id,
        microsoftEmail: email,
        location: null,
        timezone: null,
        dailyBreakAllowanceMinutes: 60,
      });

      req.session.employeeId = employee.id;
      req.session.userId = employee.id;
      req.session.loginAt = new Date().toISOString();
      req.session.microsoftUserId = user.id;
      
      return res.redirect('/#dashboard');
    }
  } catch (err) {
    console.error("Microsoft callback error:", err);
    res.redirect('/#login?error=microsoft_auth_failed');
  }
});

module.exports = router;
