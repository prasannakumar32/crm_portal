const path = require("path");
const dotenv = require("dotenv");

// Load environment variables FIRST before importing mongo.js
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const bcrypt = require("bcryptjs");
const { getDb, connect } = require("./mongo");

// Sample seed data with 3 users
const SEED_USERS = [
  {
    username: "prasanna",
    password: "Prasanna@123",
    fullName: "Prasanna",
    role: "employee",
    location: "India",
    timezone: "IST (UTC+5:30)",
  },
  {
    username: "muthu",
    password: "Muthu@123",
    fullName: "Muthu",
    role: "admin",
    location: "Australia",
    timezone: "AEST (UTC+10:00)",
  },
  {
    username: "kishanthi",
    password: "Kishanthi@123",
    fullName: "Kishanthi",
    role: "employee",
    location: "Australia",
    timezone: "AEST (UTC+10:00)",
  },
];

const SEED_PROJECTS = [
  {
    name: "E-Commerce Platform",
    clientName: "TechCorp India",
    managerName: "Rajesh Kumar",
    description: "Full-stack e-commerce platform with payment integration and inventory management",
    stack: "React, Node.js, MongoDB, Stripe API",
    location: "India",
  },
  {
    name: "Healthcare App",
    clientName: "MediCare Australia",
    managerName: "Sarah Williams",
    description: "Patient management system with appointment scheduling and telemedicine features",
    stack: "Angular, Python, PostgreSQL, AWS",
    location: "Australia",
  },
  {
    name: "Financial Dashboard",
    clientName: "Global Finance Ltd",
    managerName: "David Chen",
    description: "Real-time financial analytics dashboard with reporting capabilities",
    stack: "Vue.js, Java, MySQL, Docker",
    location: "Other",
  },
  {
    name: "Educational Portal",
    clientName: "EduTech Solutions",
    managerName: "Priya Sharma",
    description: "Online learning platform with video courses and interactive assessments",
    stack: "React, Node.js, MongoDB, Cloudinary",
    location: "India",
  },
  {
    name: "Logistics Management",
    clientName: "Transport NSW",
    managerName: "Michael Brown",
    description: "Supply chain management system with tracking and route optimization",
    stack: "React, Node.js, PostgreSQL, Google Maps API",
    location: "Australia",
  },
];

const SEED_LEAVES = [
  {
    name: "Pongal Festival",
    type: "Holiday",
    location: "India",
    startDate: new Date(new Date().getFullYear(), 0, 14).toISOString(), // January 14
    endDate: new Date(new Date().getFullYear(), 0, 17).toISOString(), // January 17 (4 days)
    reason: "Tamil harvest festival celebration",
    status: "Approved",
  },
  {
    name: "Tamil New Year",
    type: "Holiday",
    location: "India",
    startDate: new Date(new Date().getFullYear(), 3, 14).toISOString(), // April 14
    endDate: new Date(new Date().getFullYear(), 3, 14).toISOString(), // April 14 (1 day)
    reason: "Tamil New Year celebration",
    status: "Approved",
  },
  {
    name: "Deepavali",
    type: "Holiday",
    location: "India",
    startDate: new Date(new Date().getFullYear(), 9, 31).toISOString(), // October 31
    endDate: new Date(new Date().getFullYear(), 10, 3).toISOString(), // November 3 (4 days)
    reason: "Festival of lights celebration",
    status: "Approved",
  },
  {
    name: "Thiruvalluvar Day",
    type: "Holiday",
    location: "India",
    startDate: new Date(new Date().getFullYear(), 0, 16).toISOString(), // January 16
    endDate: new Date(new Date().getFullYear(), 0, 16).toISOString(), // January 16 (1 day)
    reason: "Celebrating Tamil poet Thiruvalluvar",
    status: "Approved",
  },
  {
    name: "Family Vacation",
    type: "Annual Leave",
    location: "India",
    startDate: new Date(new Date().getFullYear(), 5, 1).toISOString(), // June 1
    endDate: new Date(new Date().getFullYear(), 5, 8).toISOString(), // June 8 (8 days)
    reason: "Annual family vacation to hometown",
    status: "Approved",
  },
  {
    name: "Wedding Leave",
    type: "Personal Leave",
    location: "India",
    startDate: new Date(new Date().getFullYear(), 7, 15).toISOString(), // August 15
    endDate: new Date(new Date().getFullYear(), 7, 18).toISOString(), // August 18 (4 days)
    reason: "Attending cousin's wedding",
    status: "Pending",
  },
  {
    name: "Sick Leave",
    type: "Sick Leave",
    location: "India",
    startDate: new Date(new Date().getFullYear(), 11, 10).toISOString(), // December 10
    endDate: new Date(new Date().getFullYear(), 11, 12).toISOString(), // December 12 (3 days)
    reason: "Medical checkup and recovery",
    status: "Approved",
  },
];

function buildSampleEvents(employeeId, username, dayOffset, startHour = 9) {
  const userStartHour = startHour + (username === "muthu" ? 2 : 0);
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() - dayOffset);

  const checkIn = new Date(baseDate);
  checkIn.setHours(userStartHour, 0, 0, 0);

  const breakStart = new Date(baseDate);
  breakStart.setHours(userStartHour + 2, 30, 0, 0);

  const breakEnd = new Date(baseDate);
  breakEnd.setHours(userStartHour + 3, 0, 0, 0);

  const checkOut = new Date(baseDate);
  checkOut.setHours(userStartHour + 7, 30, 0, 0);

  return [
    {
      employeeId: String(employeeId),
      type: "check_in",
      timestampUtc: checkIn.toISOString(),
      latitude: -33.8688,
      longitude: 151.2093,
      address: username === "muthu" ? "Sydney, Australia" : "Workplace",
    },
    {
      employeeId: String(employeeId),
      type: "break_start",
      timestampUtc: breakStart.toISOString(),
      latitude: -33.8688,
      longitude: 151.2093,
      address: username === "muthu" ? "Sydney, Australia" : "Workplace",
    },
    {
      employeeId: String(employeeId),
      type: "break_end",
      timestampUtc: breakEnd.toISOString(),
      latitude: -33.8688,
      longitude: 151.2093,
      address: username === "muthu" ? "Sydney, Australia" : "Workplace",
    },
    {
      employeeId: String(employeeId),
      type: "check_out",
      timestampUtc: checkOut.toISOString(),
      latitude: -33.8688,
      longitude: 151.2093,
      address: username === "muthu" ? "Sydney, Australia" : "Workplace",
    },
  ];
}

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seed...");
    
    // Connect to MongoDB
    await connect();
    const db = await getDb();

    // Clear existing users (optional - comment out to preserve data)
    console.log("🗑️  Clearing existing data...");
    await db.collection("users").deleteMany({});
    await db.collection("employees").deleteMany({});
    await db.collection("attendance").deleteMany({});
    await db.collection("leaves").deleteMany({});
    await db.collection("projects").deleteMany({});

    // Create users
    console.log("👥 Creating users...");
    const createdEmployees = [];
    for (const userData of SEED_USERS) {
      const { username, password, fullName, role, location, timezone } = userData;
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create employee document
      const employee = {
        username,
        normalizedUsername: username.toLowerCase(),
        passwordHash,
        fullName,
        role,
        location,
        timezone,
        createdAt: new Date().toISOString(),
      };

      const result = await db.collection("employees").insertOne(employee);
      createdEmployees.push({ ...employee, id: result.insertedId.toString(), username, fullName, role, location, timezone });
      console.log(`✅ Created employee: ${fullName} (${role}) - ${location}`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   ID: ${result.insertedId}`);
      console.log("");
    }

    console.log("🗓️  Creating sample attendance events...");
    const attendanceEvents = [];
    for (let dayOffset = 1; dayOffset < 14; dayOffset += 1) {
      for (const created of createdEmployees) {
        const gap = dayOffset % 3;
        const startHour = gap === 0 ? 9 : gap === 1 ? 8 : 10;
        const events = buildSampleEvents(created.id, created.username, dayOffset, startHour);
        attendanceEvents.push(...events);
      }
    }

    if (attendanceEvents.length) {
      await db.collection("attendance").insertMany(attendanceEvents);
    }

    console.log(`✅ Inserted ${attendanceEvents.length} sample attendance events.`);

    // Insert leave data
    console.log("🏖️  Creating sample leave data...");
    const leavesWithIds = SEED_LEAVES.map((leave) => ({
      ...leave,
      createdAt: new Date().toISOString(),
    }));
    await db.collection("leaves").insertMany(leavesWithIds);
    console.log(`✅ Inserted ${leavesWithIds.length} sample leave records.`);

    // Insert project data
    console.log("🚀 Creating sample project data...");
    const projectsWithIds = SEED_PROJECTS.map((project) => ({
      ...project,
      ownerId: createdEmployees.find(employee => employee.role === "admin")?.id || createdEmployees[0].id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    await db.collection("projects").insertMany(projectsWithIds);
    console.log(`✅ Inserted ${projectsWithIds.length} sample project records.`);

    console.log("✅ Database seeding completed successfully!");
    console.log("\n📋 Summary:");
    console.log("─".repeat(50));
    console.log("Employee 1: Prasanna - India");
    console.log("  └─ Username: prasanna | Password: Prasanna@123");
    console.log("");
    console.log("Employee 2: Muthu (Admin) - Australia");
    console.log("  └─ Username: muthu | Password: Muthu@123");
    console.log("");
    console.log("Employee 3: Kishanthi - Australia");
    console.log("  └─ Username: kishanthi | Password: Kishanthi@123");
    console.log("─".repeat(50));
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
}

// Run seed
seedDatabase();
