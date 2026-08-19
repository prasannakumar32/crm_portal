const fs = require('fs');
const path = require('path');
const { getDb, connect } = require('./mongo');

async function migrate() {
  await connect();
  const db = await getDb();
  const dataDir = path.join(__dirname, '..', 'data');
  const usersFile = path.join(dataDir, 'users.json');
  const eventsFile = path.join(dataDir, 'attendance.json');

  const users = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '[]');
  const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8') || '[]');

  const usersCol = db.collection('users');
  const attCol = db.collection('attendance');

  const uCount = await usersCol.countDocuments();
  const aCount = await attCol.countDocuments();

  if (uCount === 0 && users.length) {
    const docs = users.map(u => ({
      username: u.username,
      normalizedUsername: u.username.trim().toLowerCase(),
      passwordHash: u.passwordHash,
      fullName: u.fullName,
      role: u.role === 'user' ? 'employee' : (u.role || 'employee'),
      createdAt: u.createdAt || new Date().toISOString()
    }));
    await usersCol.insertMany(docs);
    console.log(`Inserted ${docs.length} users.`);
  } else {
    console.log('Users collection not empty or no users to migrate.');
  }

  if (aCount === 0 && events.length) {
    const docs = events.map(e => ({
      userId: String(e.userId),
      type: e.type,
      timestampUtc: e.timestampUtc,
      latitude: e.latitude,
      longitude: e.longitude,
      address: e.address
    }));
    await attCol.insertMany(docs);
    console.log(`Inserted ${docs.length} attendance events.`);
  } else {
    console.log('Attendance collection not empty or no events to migrate.');
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
