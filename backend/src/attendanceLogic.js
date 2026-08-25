// Rules for one attendance day:
//   check_in -> (break_start -> break_end)* -> check_out
// The house/day boundary follows the user's configured database timezone, not a fixed browser timezone.

const AUSTRALIA_TIME_ZONE = "Australia/Sydney";
const IST_TIME_ZONE = "Asia/Kolkata";
const DEFAULT_TIME_ZONE = AUSTRALIA_TIME_ZONE;

function normalizeTimeZone(timeZone) {
  if (!timeZone) return DEFAULT_TIME_ZONE;
  const normalized = `${timeZone}`.trim().toLowerCase();
  if (normalized === "ist" || normalized === "ist (utc+5:30)" || normalized === "asia/kolkata") return "Asia/Kolkata";
  if (normalized === "aest" || normalized === "aest (utc+10:00)" || normalized === "australia" || normalized === "australia/sydney" || normalized === "australia/sydney") return "Australia/Sydney";
  if (normalized === "utc" || normalized === "gmt") return "UTC";
  return timeZone;
}

function userDateKey(isoTimestamp, timeZone) {
  const zone = normalizeTimeZone(timeZone);
  const d = new Date(isoTimestamp);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

function defaultDateKey(isoTimestamp) {
  return userDateKey(isoTimestamp, DEFAULT_TIME_ZONE);
}

function istDateKey(isoTimestamp) {
  return userDateKey(isoTimestamp, IST_TIME_ZONE);
}

function addDaysToDateKey(dateKey, offset) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAY_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getLocalWeekday(dateKey, timeZone) {
  const zone = normalizeTimeZone(timeZone);
  const middayUtc = new Date(`${dateKey}T12:00:00.000Z`);
  const label = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(middayUtc);
  return WEEKDAY_INDEX[label] ?? middayUtc.getUTCDay();
}

function getPeriodDateRange(period, timeZone = DEFAULT_TIME_ZONE) {
  const todayKey = userDateKey(new Date().toISOString(), timeZone);
  if (period === "day") {
    return [todayKey, todayKey];
  }

  if (period === "week") {
    const offset = getLocalWeekday(todayKey, timeZone) === 0 ? 6 : getLocalWeekday(todayKey, timeZone) - 1;
    return [addDaysToDateKey(todayKey, -offset), todayKey];
  }

  if (period === "month") {
    const [year, month] = todayKey.split("-");
    return [`${year}-${month}-01`, todayKey];
  }

  return [todayKey, todayKey];
}

function todaysEvents(events, timeZone = DEFAULT_TIME_ZONE) {
  const today = userDateKey(new Date().toISOString(), timeZone);
  return events.filter((e) => userDateKey(e.timestampUtc, timeZone) === today);
}

// Given a user's full event history, return today's events plus derived status.
function getStatus(events, timeZone = DEFAULT_TIME_ZONE) {
  const today = todaysEvents(events, timeZone);
  const last = today[today.length - 1];

  let status = "not_checked_in";
  if (last) {
    if (last.type === "check_in") status = "checked_in";
    else if (last.type === "break_start") status = "on_break";
    else if (last.type === "break_end") status = "checked_in";
    else if (last.type === "check_out") status = "checked_out";
  }

  return { status, todayEvents: today };
}

// Which action is allowed to happen next, given current status.
const ALLOWED_NEXT = {
  not_checked_in: "check_in",
  checked_in: ["break_start", "check_out"],
  on_break: "break_end",
  checked_out: null,
};

function canPerform(status, action, dayEvents = []) {
  const allowed = ALLOWED_NEXT[status];
  if (!allowed) return false;
  if (Array.isArray(allowed)) return allowed.includes(action);
  return allowed === action;
}

// Compute worked/break durations (in seconds) for a set of same-day events.
function computeDurations(dayEvents) {
  let checkIn = null;
  let checkOut = null;
  let breakStart = null;
  let breakSeconds = 0;
  const breaks = [];

  for (const e of dayEvents) {
    const t = new Date(e.timestampUtc).getTime();
    if (e.type === "check_in") checkIn = t;
    else if (e.type === "check_out") checkOut = t;
    else if (e.type === "break_start") breakStart = t;
    else if (e.type === "break_end" && breakStart !== null) {
      const dur = (t - breakStart) / 1000;
      breakSeconds += dur;
      breaks.push({ startMs: breakStart, endMs: t, seconds: dur });
      breakStart = null;
    }
  }

  // If currently on an open break, count it up to now for a live total.
  if (breakStart !== null && checkOut === null) {
    breakSeconds += (Date.now() - breakStart) / 1000;
  }

  let workedSeconds = null;
  if (checkIn !== null) {
    const end = checkOut !== null ? checkOut : Date.now();
    workedSeconds = Math.max(0, (end - checkIn) / 1000 - breakSeconds);
  }

  return {
    checkInUtc: checkIn ? new Date(checkIn).toISOString() : null,
    checkOutUtc: checkOut ? new Date(checkOut).toISOString() : null,
    breakSeconds: Math.round(breakSeconds),
    workedSeconds: workedSeconds !== null ? Math.round(workedSeconds) : null,
    breakCount: breaks.length,
  };
}

// Group a user's full event history into per-day summaries (chronological order: oldest first, newest last).
function buildDailySummaries(events, limitDays = 30, timeZone = DEFAULT_TIME_ZONE) {
  const byDay = new Map();
  for (const e of events) {
    const key = userDateKey(e.timestampUtc, timeZone);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(e);
  }

  // Sort days chronologically (oldest first, newest last) for professional display
  // Take the most recent limitDays and maintain chronological order
  const days = [...byDay.keys()].sort();
  const recentDays = days.slice(-limitDays);
  return recentDays.map((date) => {
    const dayEvents = byDay.get(date).sort(
      (a, b) => new Date(a.timestampUtc) - new Date(b.timestampUtc)
    );
    return { date, ...computeDurations(dayEvents), events: dayEvents };
  });
}

function buildDailySummariesBetween(events, startKey, endKey, timeZone = DEFAULT_TIME_ZONE) {
  const byDay = new Map();
  for (const e of events) {
    const key = userDateKey(e.timestampUtc, timeZone);
    if (key < startKey || key > endKey) continue;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(e);
  }

  // Sort days chronologically (oldest first, newest last) for professional display
  const days = [...byDay.keys()].sort();
  return days.map((date) => {
    const dayEvents = byDay.get(date).sort(
      (a, b) => new Date(a.timestampUtc) - new Date(b.timestampUtc)
    );
    return { date, ...computeDurations(dayEvents), events: dayEvents };
  });
}

module.exports = {
  AUSTRALIA_TIME_ZONE,
  IST_TIME_ZONE,
  DEFAULT_TIME_ZONE,
  normalizeTimeZone,
  defaultDateKey,
  istDateKey,
  userDateKey,
  todaysEvents,
  getStatus,
  canPerform,
  computeDurations,
  buildDailySummaries,
  getPeriodDateRange,
  buildDailySummariesBetween,
};
