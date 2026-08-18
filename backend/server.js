const crypto = require("crypto");
const path = require("path");
const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const authRoutes = require("./src/auth");
const attendanceRoutes = require("./src/attendance");
const taskRoutes = require("./src/tasks");
const { requireAuth } = require("./src/middleware");
const { connect: connectMongo } = require("./src/mongo");

const app = express();
const PORT = process.env.PORT || 3333;
const isProduction = process.env.NODE_ENV === "production";

// A fresh random session secret each boot is fine for local/small-team use.
// For a real deployment, set SESSION_SECRET yourself so sessions survive restarts.
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

app.set("trust proxy", 1);
app.use(express.json());

app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3333",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3333"
  ];

  const origin = req.headers.origin;
  let isRenderOrigin = false;
  try {
    if (origin) {
      const hostname = new URL(origin).hostname;
      isRenderOrigin = hostname.endsWith(".onrender.com") || hostname === "onrender.com";
    }
  } catch (err) {
    isRenderOrigin = false;
  }

  if (allowedOrigins.includes(origin) || isRenderOrigin || !origin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: isProduction ? "none" : "lax",
    },
    name: "crm_session", // Custom session name
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/attendance", requireAuth, attendanceRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);

const publicPath = path.join(__dirname, "..", "frontend", "public");

app.use(express.static(publicPath));

app.get("/", (req, res) => res.sendFile(path.join(publicPath, "index.html")));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  res.sendFile(path.join(publicPath, "index.html"));
});

async function startServer() {
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.error("\n❌ STARTUP ERROR: MONGO_URI/MONGODB_URI is not set");
    console.error("─".repeat(60));
    console.error("REQUIRED SETUP STEPS:");
    console.error("1. Open your MongoDB Atlas cluster");
    console.error("2. Go to: Database → Database Users");
    console.error("3. Copy the connection string from MongoDB Atlas");
    console.error("4. Set MONGO_URI=<your-connection-string> or MONGODB_URI=<your-connection-string>");
    console.error("5. Replace <USERNAME> and <PASSWORD> with your MongoDB user credentials");
    console.error("─".repeat(60));
    process.exit(1);
  }

  try {
    console.log("\n🚀 Starting CRM Portal Server...");
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`\n✅ CRM portal running at http://localhost:${PORT}`);
      console.log("📱 Open your browser and navigate to the URL above");
      console.log("─".repeat(60));
    });
  } catch (error) {
    console.error("\n❌ STARTUP ERROR: Failed to connect to MongoDB");
    console.error("─".repeat(60));
    console.error("Error Details:", error.message);
    console.error("─".repeat(60));
    console.error("\nTROUBLESHOOTING:");
    console.error("• Check your .env file has correct MONGO_URI");
    console.error("• Verify credentials in MongoDB Atlas Database Users");
    console.error("• Ensure your IP is whitelisted in Network Access");
    console.error("• Check internet connection");
    console.error("─".repeat(60));
    process.exit(1);
  }
}

startServer();
