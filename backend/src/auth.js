const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");
const { requireAuth } = require("./middleware");

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,32}$/;

async function canCreateUsers(req, res, next) {
  try {
    const users = await db.getUsers();
    if (users.length === 0) {
      // Allow the first account to be created without an admin so the app can bootstrap.
      return next();
    }

    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Admin authentication required." });
    }

    const user = await db.findUserById(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

router.post("/create-user", canCreateUsers, async (req, res) => {
  try {
    const { username, password, fullName, role = "user", location, timezone, dailyBreakAllowanceMinutes } = req.body || {};

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
    const existing = await db.findUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "That username is already taken." });
    }

    const users = await db.getUsers();
    const selectedRole = users.length === 0 ? "admin" : role;
    if (!["user", "admin"].includes(selectedRole)) {
      return res.status(400).json({ error: "Role must be user or admin." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.createUser({
      username,
      passwordHash,
      fullName,
      role: selectedRole,
      location: location || null,
      timezone: timezone || null,
      dailyBreakAllowanceMinutes: dailyBreakAllowanceMinutes || 60,
    });
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      location: user.location || null,
      timezone: user.timezone || null,
      dailyBreakAllowanceMinutes: user.dailyBreakAllowanceMinutes || 60,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  const user = await db.findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  req.session.userId = user.id;
  req.session.loginAt = new Date().toISOString();
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    location: user.location || null,
    timezone: user.timezone || null,
    dailyBreakAllowanceMinutes: user.dailyBreakAllowanceMinutes || 60,
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
  if (!req.session || !req.session.userId) return res.json({ user: null });
  const user = await db.findUserById(req.session.userId);
  if (!user) return res.json({ user: null });
  res.json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      location: user.location || null,
      timezone: user.timezone || null,
      dailyBreakAllowanceMinutes: user.dailyBreakAllowanceMinutes || 60,
      loggedInAt: req.session.loginAt || null,
    },
  });
});

router.put("/users/:id/break-allowance", canCreateUsers, async (req, res) => {
  try {
    const { id } = req.params;
    const { dailyBreakAllowanceMinutes } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: "User ID is required." });
    }
    if (dailyBreakAllowanceMinutes === undefined || dailyBreakAllowanceMinutes === null) {
      return res.status(400).json({ error: "Daily break allowance minutes is required." });
    }
    if (dailyBreakAllowanceMinutes < 0) {
      return res.status(400).json({ error: "Daily break allowance must be a positive number." });
    }

    const user = await db.updateUserBreakAllowance(id, dailyBreakAllowanceMinutes);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      dailyBreakAllowanceMinutes: user.dailyBreakAllowanceMinutes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

module.exports = router;
