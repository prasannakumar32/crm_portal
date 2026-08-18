const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || null;
const DB_NAME = process.env.MONGO_DB_NAME || "crm_portal";

if (!MONGO_URI) {
  console.warn("MONGO_URI not set — MongoDB connections will fail until you set MONGO_URI to your Atlas connection string.");
}

let client = null;

function createMongoClient(uri) {
  return new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    maxPoolSize: 10,
    minPoolSize: 2,
    authSource: "admin",
  });
}

function normalizeError(error) {
  const message = error.message || String(error);
  if (message.includes("<password>") || message.includes("<PASSWORD>") || message.includes("<USERNAME>")) {
    return new Error("ERROR: MONGO_URI contains placeholder credentials. Replace <USERNAME> and <PASSWORD> with your actual MongoDB Atlas credentials from the Database Users page.");
  }
  if (message.includes("querySrv") || message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
    return new Error(
      "ERROR: MongoDB SRV DNS lookup failed.\n- Ensure your MongoDB credentials are correct\n- Check your IP address is whitelisted in MongoDB Atlas Network Access\n- Use the exact connection string from MongoDB Atlas"
    );
  }
  if (message.includes("authentication failed") || message.includes("Unauthorized")) {
    return new Error("ERROR: MongoDB authentication failed. Verify your username and password are correct in .env");
  }
  if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
    return new Error("ERROR: Cannot reach MongoDB server. Check your internet connection and firewall settings.");
  }
  return error;
}


async function connect() {
  if (client && client.topology && client.topology.isConnected && client.topology.isConnected()) return client;
  if (!MONGO_URI) throw new Error("MONGO_URI environment variable is required to connect to MongoDB.");

  try {
    console.log("📡 Connecting to MongoDB...");
    const clientInstance = createMongoClient(MONGO_URI);
    await clientInstance.connect();
    client = clientInstance;
    console.log("✅ Connected to MongoDB");
    return client;
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    throw normalizeError(err);
  }
}

async function getDb() {
  const c = await connect();
  return c.db(DB_NAME);
}

module.exports = { connect, getDb };
