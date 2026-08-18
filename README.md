# Team Portal — Login & Attendance

A small CRM/team portal with:

- **Login & registration** — username + password, passwords hashed with bcrypt, session-based auth (a plain-text password is never stored or logged).
- **Check-in / break / check-out** — one shift per day: `check in → (start break → end break)* → check out`. The server rejects any action that's out of order (e.g. you can't check out while on a break).
- **IST + GMT time** — every event is timestamped by the **server clock** (not the browser's, so it can't be spoofed) and displayed in both `Asia/Kolkata` (IST) and UTC/GMT. The dashboard has a live split-flap style clock showing both.
- **Location capture** — each check-in/break/check-out asks the browser for GPS coordinates and reverse-geocodes them to a readable address (via OpenStreetMap Nominatim, free, no API key). If the user denies location access, the action still goes through — it's just tagged "location unavailable."
- **Today's timeline + 30-day history** — worked time and break time are computed automatically (worked = time between check-in and check-out, minus breaks).

No paid services, no native/binary dependencies — data is stored in two plain JSON files (`data/users.json`, `data/attendance.json`), so `npm install` works on any machine without a C++ build toolchain. Swap `src/db.js` for a real database later without touching the routes if the team grows past a handful of people.

## Run it

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm start
```

Then open **http://localhost:3000** — it redirects to the login page. Click "Create an account" to register the first user, then sign in and use the dashboard.

The server listens on port 3000 by default; set `PORT=xxxx` to change it.

## Project layout

```
crm-portal/
├── backend/
│   ├── server.js           Express app, sessions, route wiring
│   ├── src/
│   │   ├── db.js             JSON-file data access (users + attendance events)
│   │   ├── attendanceLogic.js  Check-in/break/check-out state machine + duration math
│   │   ├── auth.js            /api/auth/* routes (register, login, logout, me)
│   │   ├── attendance.js      /api/attendance/* routes (check-in, break-*, check-out, today, history)
│   │   └── middleware.js      requireAuth guards for API + pages
│   └── public/
│       ├── index.html
│       ├── css/style.css
│       └── js/app.js
├── package.json
└── README.md
- Browsers only allow geolocation on `https://` or `http://localhost` — if you deploy this to a real server, put it behind HTTPS or the "Check in" button will silently get no coordinates.
- Reverse geocoding calls `nominatim.openstreetmap.org` directly from the browser. That's fine for a small internal team, but Nominatim's usage policy caps free use at roughly one request/second — if you scale this up, either self-host Nominatim or switch to a paid geocoding provider (Google/Mapbox/etc.) and add an API key.

## Extending this

A few things worth adding next, none of which require restructuring what's here:

- **Manager/admin view** — everyone currently only sees their own attendance. Add a `role` field to users and a `/api/attendance/team` route that reads every user's events for a manager dashboard.
- **Task assignment** — there is now a `src/tasks.js` backend module plus frontend task management routes for projects, tasks, status, assignees, and comments.
- **Editing/correcting an entry** — there's currently no UI to fix a missed check-out; that'd be an admin-only PATCH route plus an audit trail of who changed what.
- **Real database** — if the team grows, swap `src/db.js` for Postgres/MySQL (e.g. via Prisma) — the route files call `db.getEventsForUser()` etc. and don't care how it's implemented underneath.
