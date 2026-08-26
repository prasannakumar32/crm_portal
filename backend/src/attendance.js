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

async function requireAdminForHoliday(req, res) {
  const employee = await db.findEmployeeById(req.session.employeeId || req.session.userId);
  if (!employee || employee.role !== "admin") {
    res.status(403).json({ error: "Admin access required for holidays." });
    return false;
  }
  return true;
}

function recordAction(type) {
  return async (req, res) => {
    const employeeId = req.session.employeeId || req.session.userId;
    const employee = await db.findEmployeeById(employeeId);
    const employeeTimeZone = employee && (employee.timezone || null);
    const events = await db.getEventsForEmployee(employeeId);
    const { status } = logic.getStatus(events, employeeTimeZone);

    const { timestampUtc, latitude, longitude, address, reason } = req.body || {};
    const actionTime = new Date(timestampUtc);
    if (!timestampUtc || Number.isNaN(actionTime.getTime())) {
      return res.status(400).json({ error: "Please enter a valid time for this action." });
    }

    const event = await db.addEvent({
      employeeId,
      type,
      timestampUtc: actionTime.toISOString(),
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
      address: typeof address === "string" ? address.slice(0, 300) : null,
      reason: typeof reason === "string" ? reason.trim().slice(0, 200) : null,
    });

    const updated = await db.getEventsForEmployee(employeeId);
    const { status: newStatus, todayEvents } = logic.getStatus(updated, employeeTimeZone);
    const durations = logic.computeDurations(todayEvents);

    res.json({ event, status: newStatus, today: todayEvents, durations });
  };
}

router.post("/check-in", recordAction("check_in"));
router.post("/break-start", recordAction("break_start"));
router.post("/break-end", recordAction("break_end"));
router.post("/check-out", recordAction("check_out"));

router.put("/events/:id", async (req, res) => {
  const employeeId = req.session.employeeId || req.session.userId;
  const { timestampUtc, reason } = req.body || {};
  const eventTime = new Date(timestampUtc);
  if (!timestampUtc || Number.isNaN(eventTime.getTime())) {
    return res.status(400).json({ error: "Please enter a valid time for this event." });
  }

  const event = await db.updateAttendanceEvent(employeeId, req.params.id, {
    timestampUtc: eventTime.toISOString(),
    reason,
  });
  if (!event) return res.status(404).json({ error: "Attendance event not found." });
  res.json({ event });
});

router.delete("/events/:id", async (req, res) => {
  const employeeId = req.session.employeeId || req.session.userId;
  const deleted = await db.deleteAttendanceEvent(employeeId, req.params.id);
  if (!deleted) return res.status(404).json({ error: "Attendance event not found." });
  res.json({ success: true });
});

router.get("/today", async (req, res) => {
  const employeeId = req.session.employeeId || req.session.userId;
  const employee = await db.findEmployeeById(employeeId);
  const employeeTimeZone = employee && (employee.timezone || null);
  const events = await db.getEventsForEmployee(employeeId);
  const { status, todayEvents } = logic.getStatus(events, employeeTimeZone);
  const durations = logic.computeDurations(todayEvents);
  res.json({ status, today: todayEvents, durations });
});

router.get("/history", async (req, res) => {
  const employeeId = req.session.employeeId || req.session.userId;
  const employee = await db.findEmployeeById(employeeId);
  const employeeTimeZone = employee && (employee.timezone || null);
  const period = `${req.query.period || "day"}`.trim().toLowerCase();
  const events = await db.getEventsForEmployee(employeeId);

  const [startKey, endKey] = logic.getPeriodDateRange(period, employeeTimeZone);
  let summaries = logic.buildDailySummariesBetween(events, startKey, endKey, employeeTimeZone);
  if (period === "day") {
    const [todayKey] = logic.getPeriodDateRange("day", employeeTimeZone);
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
    const employee = await db.findEmployeeById(req.session.employeeId || req.session.userId);
    const { name, type, location, startDate, endDate, reason, status } = req.body;
    const leaveType = type || "Annual Leave";
    if (!name || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (String(leaveType).toLowerCase() === "holiday" && !(await requireAdminForHoliday(req, res))) return;
    const leave = await db.createLeave({
      name,
      type: leaveType,
      location: location || employee.location || "India",
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
    const existingLeave = await db.getLeaveById(id);
    if (!existingLeave) {
      return res.status(404).json({ error: "Leave not found" });
    }
    const isHoliday = String(existingLeave.type || "").toLowerCase() === "holiday" || String(type || "").toLowerCase() === "holiday";
    if (isHoliday && !(await requireAdminForHoliday(req, res))) return;
    const leave = await db.updateLeave(id, {
      name,
      type,
      location,
      startDate,
      endDate,
      reason,
      status,
    });
    res.json({ leave });
  } catch (error) {
    console.error("Error updating leave:", error);
    res.status(500).json({ error: "Failed to update leave" });
  }
});

router.delete("/leaves/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existingLeave = await db.getLeaveById(id);
    if (!existingLeave) {
      return res.status(404).json({ error: "Leave not found" });
    }
    if (String(existingLeave.type || "").toLowerCase() === "holiday" && !(await requireAdminForHoliday(req, res))) return;
    const success = await db.deleteLeave(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting leave:", error);
    res.status(500).json({ error: "Failed to delete leave" });
  }
});

module.exports = router;
