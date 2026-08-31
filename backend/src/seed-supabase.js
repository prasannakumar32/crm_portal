const path = require("path");
const dotenv = require("dotenv");

// Load environment variables FIRST before importing supabase.js
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const bcrypt = require("bcryptjs");
const { supabase } = require("./supabase");

// Sample seed data with 3 users
const SEED_USERS = [
  {
    username: "prasanna",
    password: "Prasanna@123",
    fullName: "Prasanna",
    role: "employee",
    location: "India",
    timezone: "Asia/Kolkata",
  },
  {
    username: "muthu",
    password: "Muthu@123",
    fullName: "Muthu",
    role: "admin",
    location: "Australia",
    timezone: "Australia/Sydney",
  },
  {
    username: "kishanthi",
    password: "Kishanthi@123",
    fullName: "Kishanthi",
    role: "employee",
    location: "Australia",
    timezone: "Australia/Sydney",
  },
];

const SEED_PROJECTS = [
  {
    name: "E-Commerce Platform",
    clientName: "TechCorp India",
    managerName: "Rajesh Kumar",
    description: "Full-stack e-commerce platform with payment integration and inventory management",
    stack: "React, Node.js, PostgreSQL, Stripe API",
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
    stack: "React, Node.js, PostgreSQL, Cloudinary",
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
    employeeName: "Prasanna",
    name: "Pongal Holiday",
    location: "India",
    type: "Holiday",
    startDate: new Date(new Date().getFullYear(), 0, 14).toISOString().split('T')[0], // January 14
    endDate: new Date(new Date().getFullYear(), 0, 17).toISOString().split('T')[0], // January 17 (4 days)
    reason: "Pongal Festival",
    status: "Approved",
  },
  {
    employeeName: "Prasanna",
    name: "Annual Leave",
    location: "India",
    type: "Annual Leave",
    startDate: new Date(new Date().getFullYear(), 4, 8).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), 4, 12).toISOString().split('T')[0],
    reason: "Family vacation",
    status: "Pending",
  },
  {
    employeeName: "Kishanthi",
    name: "Personal Leave",
    location: "Australia",
    type: "Personal Leave",
    startDate: new Date(new Date().getFullYear(), 5, 19).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), 5, 20).toISOString().split('T')[0],
    reason: "Medical appointment",
    status: "Approved",
  },
  {
    employeeName: "Prasanna",
    name: "Tamil New Year",
    location: "India",
    type: "Holiday",
    startDate: new Date(new Date().getFullYear(), 3, 14).toISOString().split('T')[0], // April 14
    endDate: new Date(new Date().getFullYear(), 3, 14).toISOString().split('T')[0], // April 14 (1 day)
    reason: "Tamil New Year",
    status: "Approved",
  },
  {
    employeeName: "Prasanna",
    name: "Deepavali Holiday",
    location: "India",
    type: "Holiday",
    startDate: new Date(new Date().getFullYear(), 9, 31).toISOString().split('T')[0], // October 31
    endDate: new Date(new Date().getFullYear(), 10, 3).toISOString().split('T')[0], // November 3 (4 days)
    reason: "Deepavali",
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
      employee_id: String(employeeId),
      type: "check_in",
      timestamp_utc: checkIn.toISOString(),
      latitude: -33.8688,
      longitude: 151.2093,
      address: username === "muthu" ? "Sydney, Australia" : "Workplace",
    },
    {
      employee_id: String(employeeId),
      type: "break_start",
      timestamp_utc: breakStart.toISOString(),
      latitude: -33.8688,
      longitude: 151.2093,
      address: username === "muthu" ? "Sydney, Australia" : "Workplace",
    },
    {
      employee_id: String(employeeId),
      type: "break_end",
      timestamp_utc: breakEnd.toISOString(),
      latitude: -33.8688,
      longitude: 151.2093,
      address: username === "muthu" ? "Sydney, Australia" : "Workplace",
    },
    {
      employee_id: String(employeeId),
      type: "check_out",
      timestamp_utc: checkOut.toISOString(),
      latitude: -33.8688,
      longitude: 151.2093,
      address: username === "muthu" ? "Sydney, Australia" : "Workplace",
    },
  ];
}

async function seedDatabase() {
  try {
    console.log("🌱 Starting Supabase database seed...");
    
    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('leaves').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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
        normalized_username: username.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        role,
        location,
        timezone,
        daily_break_allowance_minutes: 60,
      };

      const { data, error } = await supabase
        .from('employees')
        .insert(employee)
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error creating employee ${fullName}:`, error);
        continue;
      }

      createdEmployees.push({ ...data, username, fullName, role, location, timezone });
      console.log(`✅ Created employee: ${fullName} (${role}) - ${location}`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   ID: ${data.id}`);
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
      const { error } = await supabase.from('attendance').insert(attendanceEvents);
      if (error) console.error("❌ Error inserting attendance events:", error);
    }

    console.log(`✅ Inserted ${attendanceEvents.length} sample attendance events.`);

    // Insert leave data
    console.log("🏖️  Creating sample leave data...");
    const leavesWithIds = SEED_LEAVES.map((leave) => ({
      employee_id: createdEmployees.find(e => e.full_name === leave.employeeName)?.id,
      employee_name: leave.employeeName,
      name: leave.name || leave.employeeName,
      location: leave.location || 'India',
      type: leave.type,
      start_date: leave.startDate,
      end_date: leave.endDate,
      reason: leave.reason,
      status: leave.status,
    }));

    const { error: leaveError } = await supabase.from('leaves').insert(leavesWithIds);
    if (leaveError) console.error("❌ Error inserting leaves:", leaveError);
    else console.log(`✅ Inserted ${leavesWithIds.length} sample leave records.`);

    // Insert project data
    console.log("🚀 Creating sample project data...");
    const projectsWithIds = SEED_PROJECTS.map((project) => ({
      name: project.name,
      client_name: project.clientName,
      manager_name: project.managerName,
      description: project.description,
      stack: project.stack,
      location: project.location,
      owner_id: createdEmployees.find(employee => employee.role === "admin")?.id || createdEmployees[0].id,
    }));

    const { error: projectError } = await supabase.from('projects').insert(projectsWithIds);
    if (projectError) {
      console.error("❌ Error inserting projects:", projectError);
      throw projectError;
    }
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
