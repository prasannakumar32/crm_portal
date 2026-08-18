# Team Portal — Login & Attendance

A professional CRM/team portal with:

- **Login & registration** — username + password, passwords hashed with bcrypt, session-based auth (a plain-text password is never stored or logged).
- **Check-in / break / check-out** — one shift per day: `check in → (start break → end break)* → check out`. The server rejects any action that's out of order (e.g. you can't check out while on a break).
- **IST + GMT time** — every event is timestamped by the **server clock** (not the browser's, so it can't be spoofed) and displayed in both `Asia/Kolkata` (IST) and UTC/GMT. The dashboard has a live split-flap style clock showing both.
- **Location capture** — each check-in/break/check-out asks the browser for GPS coordinates and reverse-geocodes them to a readable address (via OpenStreetMap Nominatim, free, no API key). If the user denies location access, the action still goes through — it's just tagged "location unavailable."
- **Today's timeline + history** — worked time and break time are computed automatically (worked = time between check-in and check-out, minus breaks).
- **Daily hours chart** — Professional bar chart showing worked hours and break hours for each day in chronological order.
- **Password visibility toggle** — Professional password show/hide functionality with proper icons.
- **MongoDB database** — Production-ready MongoDB integration for scalable data storage.

## Run it (Local Development)

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm start
```

Then open **http://localhost:3333** — it redirects to the login page. Sign in with your credentials and use the dashboard.

The server listens on port 3333 by default; set `PORT=xxxx` to change it.

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. Create a MongoDB Atlas account: https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Create a Database User:
   - Go to: Database → Database Users → Add New Database User
   - Use username: crm_user (or your preferred username)
   - Generate a secure password
   - Set Database User Privileges: Built-in role: Atlas admin
4. Copy your connection string from: Clusters > Connect > Drivers
5. Replace `<USERNAME>` and `<PASSWORD>` in `.env` file
6. Ensure your IP is whitelisted:
   - Go to: Network Access → IP Access List
   - Add your IP address or allow 0.0.0.0/0 for development
7. Copy `.env.example` to `.env` and update with your credentials

### Local MongoDB (Development)

You can also use a local MongoDB instance if you prefer:

```bash
# Install MongoDB locally
# Update .env with local connection string
MONGO_URI=mongodb://localhost:27017/crm_portal
```

## Deploy to Render.com

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/crm_portal.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml` configuration
   - The configuration includes:
     - MongoDB database setup
     - Environment variables (auto-generated SESSION_SECRET)
     - Node.js web service configuration

3. **Environment Variables** (Render handles automatically):
   - `MONGODB_URI` - Auto-configured from Render MongoDB service
   - `SESSION_SECRET` - Auto-generated secure string
   - `PORT` - Set by Render automatically
   - `NODE_ENV` - Set to production

4. **Your app will be live at**: `https://your-app-name.onrender.com`

## Project layout

```
crm-portal/
├── backend/
│   ├── server.js           Express app, sessions, route wiring
│   ├── src/
│   │   ├── db.js             MongoDB data access (users + attendance events)
│   │   ├── mongo.js          MongoDB connection management
│   │   ├── attendanceLogic.js  Check-in/break/check-out state machine + duration math
│   │   ├── auth.js            /api/auth/* routes (register, login, logout, me)
│   │   ├── attendance.js      /api/attendance/* routes (check-in, break-*, check-out, today, history)
│   │   ├── tasks.js           /api/tasks/* routes for task management
│   │   └── middleware.js      requireAuth guards for API + pages
│   └── data/
│       ├── users.json        (Local development - can be ignored with MongoDB)
│       └── attendance.json   (Local development - can be ignored with MongoDB)
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── css/style.css
│   │   ├── js/
│   │   │   ├── app.js
│   │   │   ├── dashboard.js
│   │   │   ├── state.js
│   │   │   ├── api.js
│   │   │   └── tasks.js
│   │   └── images/
│   │       └── t_m_logo.png
│   └── server.js             Frontend development server
├── render.yaml               Render.com deployment configuration
├── .env.example              Environment variables template
├── package.json
└── README.md
```

## Features

### Core Features
- ✅ User authentication with secure password hashing
- ✅ Attendance tracking (check-in, check-out, break start/end)
- ✅ Real-time dashboard with daily hours chart
- ✅ Professional chronological data ordering
- ✅ Password visibility toggle with icons
- ✅ Location capture with reverse geocoding
- ✅ IST + GMT timezone support
- ✅ Session-based authentication
- ✅ MongoDB database integration

### Additional Features
- ✅ Timesheets and history tracking
- ✅ Time off request management
- ✅ Work schedules management
- ✅ Task management with projects
- ✅ Responsive modern UI design
- ✅ Professional styling and animations

## Security Notes

- Browsers only allow geolocation on `https://` or `http://localhost` — if you deploy this to a real server, put it behind HTTPS or the "Check in" button will silently get no coordinates.
- Reverse geocoding calls `nominatim.openstreetmap.org` directly from the browser. That's fine for a small internal team, but Nominatim's usage policy caps free use at roughly one request/second — if you scale this up, either self-host Nominatim or switch to a paid geocoding provider (Google/Mapbox/etc.) and add an API key.
- Never commit `.env` file to version control (it's in `.gitignore`)
- Use strong passwords for production databases
- Rotate credentials regularly

## Extending this

A few things worth adding next, none of which require restructuring what's here:

- **Manager/admin view** — everyone currently only sees their own attendance. Add a `role` field to users and a `/api/attendance/team` route that reads every user's events for a manager dashboard.
- **Task assignment** — there is now a `src/tasks.js` backend module plus frontend task management routes for projects, tasks, status, assignees, and comments.
- **Editing/correcting an entry** — there's currently no UI to fix a missed check-out; that'd be an admin-only PATCH route plus an audit trail of who changed what.
- **Email notifications** — add email alerts for attendance reminders, leave approvals, etc.
- **Mobile app** — create a React Native or Flutter mobile app for on-the-go attendance tracking.
