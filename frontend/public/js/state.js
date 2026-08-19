const root = document.getElementById("root");

const AUSTRALIA_TIME_ZONE = "Australia/Sydney";
const IST_TIME_ZONE = "Asia/Kolkata";
const DEFAULT_TIME_ZONE = AUSTRALIA_TIME_ZONE;

const actionLabels = {
  check_in: "Check in",
  break_start: "Break start",
  break_end: "Break end",
  check_out: "Check out",
};

const actionTextMap = {
  "check-in": "Check in",
  "break-start": "Start break",
  "break-end": "End break",
  "check-out": "Check out",
};

const actionEndpointMap = {
  "btn-check-in": "check-in",
  "btn-break-start": "break-start",
  "btn-break-end": "break-end",
  "btn-check-out": "check-out",
};

const statusLabels = {
  not_checked_in: "Not checked in",
  checked_in: "Checked in",
  on_break: "On break",
  checked_out: "Checked out",
};

const enabledByStatus = {
  not_checked_in: ["check_in"],
  checked_in: ["break_start", "check_out"],
  on_break: ["break_end"],
  checked_out: [],
};

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:3333"
  : (window.location.origin || "");

const SCHEDULE_STORAGE_KEY = "crm-portal-work-schedules";

function loadStoredSchedules() {
  try {
    const stored = JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY) || "null");
    return Array.isArray(stored) ? stored.map((schedule) => ({
      ...schedule,
      name: schedule.name || "Unnamed schedule",
      assigned: schedule.assigned || schedule.owner || "Unassigned",
    })) : null;
  } catch {
    return null;
  }
}

function saveSchedules() {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(state.scheduleData));
  } catch {
    // Keep schedule changes available for the current session if storage is unavailable.
  }
}

const state = {
  page: location.hash.slice(1) || "home",
  user: null,
  error: null,
  submitting: false,
  busy: false,
  status: "not_checked_in",
  todayEvents: [],
  historyData: [],
  dashboardPeriod: "day",
  tasks: [],
  taskStatuses: [],
  projects: [],
  teamUsers: [],
  users: [],
  taskFilter: { status: null, projectId: null, assigneeId: null },
  taskView: "board",
  currentTask: null,
  scheduleData: loadStoredSchedules() || [
    { id: 1, name: "Sydney morning shift", date: "2026-08-11", shift: "Morning", start: "09:00", end: "17:00", location: "Sydney Office", assigned: "Muthu", status: "Confirmed" },
    { id: 2, name: "Kolkata afternoon shift", date: "2026-08-12", shift: "Afternoon", start: "13:00", end: "21:00", location: "Kolkata Remote", assigned: "Priya", status: "Planned" },
    { id: 3, name: "Sydney early shift", date: "2026-08-13", shift: "Morning", start: "08:00", end: "16:00", location: "Sydney Office", assigned: "Rohan", status: "Confirmed" },
  ],
  leaveData: [],
  locationLabel: "Locating…",
  clock: new Date(),
  breakAllowance: {
    dailyBreakAllowanceMinutes: 60,
    usedBreakMinutes: 0,
    remainingBreakMinutes: 60,
  },
};

function formatTime(iso, timeZone) {
  const normalizedZone = normalizeTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizedZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function formatDate(iso, timeZone) {
  // If iso is a date-only string (YYYY-MM-DD), format it as a calendar date
  // without allowing local timezone offsets to shift the day. We construct
  // a UTC date for the given components and format using UTC so the
  // calendar date remains the same regardless of user's timezone.
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(String(iso));
  if (dateOnlyMatch) {
    const [y, m, d] = String(iso).split("-").map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(utc);
  }

  const normalizedZone = normalizeTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizedZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function normalizeTimeZone(timeZone) {
  if (!timeZone) return DEFAULT_TIME_ZONE;
  const value = `${timeZone}`.trim().toLowerCase();
  if (value.includes("ist") || value.includes("kolkata") || value.includes("india")) return "Asia/Kolkata";
  if (value.includes("aest") || value.includes("australia") || value.includes("sydney")) return "Australia/Sydney";
  if (value.includes("utc") || value.includes("gmt")) return "UTC";
  return timeZone;
}

function getUserTimeZone() {
  return normalizeTimeZone(state.user?.timezone || DEFAULT_TIME_ZONE);
}

function getDisplayTimeZoneLabel() {
  const zone = getUserTimeZone();
  if (zone === "Asia/Kolkata") return "IST";
  if (zone === "Australia/Sydney") return "AEST";
  if (zone === "UTC") return "UTC";
  return zone;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDurationHms(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function computeDurationsClient(dayEvents) {
  let checkIn = null;
  let checkOut = null;
  let breakStart = null;
  let breakSeconds = 0;
  let breakCount = 0;

  for (const e of dayEvents) {
    const t = new Date(e.timestampUtc).getTime();
    if (e.type === "check_in") checkIn = t;
    else if (e.type === "check_out") checkOut = t;
    else if (e.type === "break_start") breakStart = t;
    else if (e.type === "break_end" && breakStart !== null) {
      breakSeconds += (t - breakStart) / 1000;
      breakCount += 1;
      breakStart = null;
    }
  }

  if (breakStart !== null && checkOut === null) {
    breakSeconds += (Date.now() - breakStart) / 1000;
  }

  let workedSeconds = null;
  if (checkIn !== null) {
    const end = checkOut !== null ? checkOut : Date.now();
    workedSeconds = Math.max(0, (end - checkIn) / 1000 - breakSeconds);
  }

  return {
    breakSeconds: Math.round(breakSeconds),
    workedSeconds: workedSeconds !== null ? Math.round(workedSeconds) : null,
    breakCount,
  };
}

function getLatestCheckInTime(dayEvents) {
  const checkIns = (dayEvents || []).filter((e) => e.type === "check_in");
  if (!checkIns.length) return null;
  return checkIns[checkIns.length - 1].timestampUtc;
}
