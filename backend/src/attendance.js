const express = require("express");
const db = require("./db");
const logic = require("./attendanceLogic");

const router = express.Router();

const ACTION_LABEL = {
  check_in: "check in",
  break_start: "start a break",
  break_end: "end your break",
  check_out: "check out",
};

function recordAction(type) {
  return async (req, res) => {
    const userId = req.session.userId;
    const user = await db.findUserById(userId);
    const userTimeZone = user && (user.timezone || null);
    const events = await db.getEventsForUser(userId);
    const { status } = logic.getStatus(events, userTimeZone);

    if (!logic.canPerform(status, type)) {
      return res.status(409).json({
        error: `You can't ${ACTION_LABEL[type]} right now (current status: ${status.replace("_", " ")}).`,
        status,
      });
    }

    const { latitude, longitude, address, reason } = req.body || {};

    if (type === "break_start") {
      const normalizedReason = typeof reason === "string" ? reason.trim() : "";
      if (!normalizedReason) {
        return res.status(400).json({ error: "Please select a break reason before starting your break." });
      }

      // Check break time allowance
      const { todayEvents } = logic.getStatus(events, userTimeZone);
      const durations = logic.computeDurations(todayEvents);
      const dailyBreakAllowanceMinutes = user.dailyBreakAllowanceMinutes || 60;
      const usedBreakMinutes = Math.floor(durations.breakSeconds / 60);

      if (usedBreakMinutes >= dailyBreakAllowanceMinutes) {
        return res.status(409).json({
          error: `You have exceeded your daily break allowance of ${dailyBreakAllowanceMinutes} minutes. You've used ${usedBreakMinutes} minutes today.`,
          status,
          breakAllowanceExceeded: true,
          usedBreakMinutes,
          dailyBreakAllowanceMinutes,
        });
      }
    }

    const event = await db.addEvent({
      userId,
      type,
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
      address: typeof address === "string" ? address.slice(0, 300) : null,
      reason: typeof reason === "string" ? reason.trim().slice(0, 200) : null,
    });

    const updated = await db.getEventsForUser(userId);
    const { status: newStatus, todayEvents } = logic.getStatus(updated, userTimeZone);
    const durations = logic.computeDurations(todayEvents);

    res.json({ event, status: newStatus, today: todayEvents, durations });
  };
}

router.post("/check-in", recordAction("check_in"));
router.post("/break-start", recordAction("break_start"));
router.post("/break-end", recordAction("break_end"));
router.post("/check-out", recordAction("check_out"));

router.get("/today", async (req, res) => {
  const user = await db.findUserById(req.session.userId);
  const userTimeZone = user && (user.timezone || null);
  const events = await db.getEventsForUser(req.session.userId);
  const { status, todayEvents } = logic.getStatus(events, userTimeZone);
  const durations = logic.computeDurations(todayEvents);
  const dailyBreakAllowanceMinutes = user.dailyBreakAllowanceMinutes || 60;
  const usedBreakMinutes = Math.floor(durations.breakSeconds / 60);
  const remainingBreakMinutes = Math.max(0, dailyBreakAllowanceMinutes - usedBreakMinutes);

  res.json({ 
    status, 
    today: todayEvents, 
    durations,
    breakAllowance: {
      dailyBreakAllowanceMinutes,
      usedBreakMinutes,
      remainingBreakMinutes,
    }
  });
});

router.get("/history", async (req, res) => {
  const user = await db.findUserById(req.session.userId);
  const userTimeZone = user && (user.timezone || null);
  const period = `${req.query.period || "day"}`.trim().toLowerCase();
  const events = await db.getEventsForUser(req.session.userId);

  const [startKey, endKey] = logic.getPeriodDateRange(period, userTimeZone);
  let summaries = logic.buildDailySummariesBetween(events, startKey, endKey, userTimeZone);
  if (period === "day") {
    const [todayKey] = logic.getPeriodDateRange("day", userTimeZone);
    summaries = summaries.filter((day) => day.date === todayKey);
  }
  res.json({ days: summaries, period });
});

router.get("/leaves", async (req, res) => {
  try {
    const leaves = await db.getLeaves();
    res.json({ leaves });
  } catch (error) {
    console.error("Error fetching leaves:", error);
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
});

router.post("/leaves", async (req, res) => {
  try {
    const { name, type, location, startDate, endDate, reason, status } = req.body;
    if (!name || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const leave = await db.createLeave({
      name,
      type: type || "Annual Leave",
      location: location || user.location || "India",
      startDate,
      endDate,
      reason,
      status: status || "Pending",
    });
    res.json({ leave });
  } catch (error) {
    console.error("Error creating leave:", error);
    res.status(500).json({ error: "Failed to create leave" });
  }
});

router.put("/leaves/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, location, startDate, endDate, reason, status } = req.body;
    const leave = await db.updateLeave(id, {
      name,
      type,
      location,
      startDate,
      endDate,
      reason,
      status,
    });
    if (!leave) {
      return res.status(404).json({ error: "Leave not found" });
    }
    res.json({ leave });
  } catch (error) {
    console.error("Error updating leave:", error);
    res.status(500).json({ error: "Failed to update leave" });
  }
});

router.delete("/leaves/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteLeave(id);
    if (!success) {
      return res.status(404).json({ error: "Leave not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting leave:", error);
    res.status(500).json({ error: "Failed to delete leave" });
  }
});

module.exports = router;
