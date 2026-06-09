const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Load environment variables from Render
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Publishable key/anon key

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration for Survfix API stream (Blueprint Endpoint 2)
// Note: The stream operates on a read-only telemetry channel (GET)
const SURVFIX_API = "https://survfix.com/api/v1/tracking/stream?rover_id=RVR-12345&interval=5000";
const BEARER_TOKEN = "YOUR_ACTUAL_BEARER_TOKEN_HERE"; // Replace with a valid active token 

async function fetchAndSaveData() {
  console.log("Fetching telemetry data from Survfix...");
  
  if (BEARER_TOKEN === "YOUR_ACTUAL_BEARER_TOKEN_HERE") {
    console.error("[-] Please replace BEARER_TOKEN with an active token from a surveyor login session.");
    return;
  }

  try {
    const response = await fetch(SURVFIX_API, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Survfix API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Data received:", data);

    // Mapping the JSON structure directly from the blueprint schema
    const roverRecord = {
      rover_id: data.rover_id,
      surveyor_name: 'Unknown', // Surveyor username is returned on login, not the stream
      status: data.status,
      latitude: data.latitude || 0.0,     // Root level from blueprint
      longitude: data.longitude || 0.0,   // Root level from blueprint
      battery_level: data.telemetry?.battery_level || 0, // Nested inside telemetry
      updated_at: new Date().toISOString()
    };

    // Insert or update data into the Supabase table named 'rovers'
    const { error } = await supabase
      .from('rovers')
      .upsert(roverRecord, { onConflict: 'rover_id' });

    if (error) {
      console.error("Error saving to Supabase:", error.message);
    } else {
      console.log("Rover data successfully saved to Supabase!");
    }

  } catch (error) {
    console.error("Error in fetch loop:", error.message);
  }
}

// Run the fetch loop every 10 seconds (10000 ms)
const POLLING_INTERVAL = 10000;
setInterval(fetchAndSaveData, POLLING_INTERVAL);

// Run immediately on start
fetchAndSaveData();

console.log("Survfix Supabase Proxy background worker started.");
