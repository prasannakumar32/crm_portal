const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("\n❌ STARTUP ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set");
  console.error("─".repeat(60));
  console.error("REQUIRED SETUP STEPS:");
  console.error("1. Create a Supabase project at https://supabase.com");
  console.error("2. Go to Project Settings → API");
  console.error("3. Copy the Project URL and Service Role Key");
  console.error("4. Set SUPABASE_URL=<your-project-url>");
  console.error("5. Set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>");
  console.error("─".repeat(60));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('employees').select('id').limit(1);
    if (error) throw error;
    console.log("✅ Connected to Supabase successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Supabase:", error.message);
    return false;
  }
}

module.exports = { supabase, testConnection };
