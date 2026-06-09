const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Load environment variables from Render
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Use the publishable key/anon key

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration for Survfix API
const SURVFIX_API = "https://survfix.com/api/v1/tracking/stream?rover_id=RVR-12345&interval=5000";
const BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Replace with a valid token from your blueprint/testing

async function fetchAndSaveData() {
  console.log("Fetching telemetry data from Survfix...");
  try {
    const response = await fetch(SURVFIX_API, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ BEARER_TOKEN }`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Survfix API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Data received:", data);

    // Map the JSON structure from your blueprint to your Supabase table columns
    const roverRecord = {
      rover_id: data.rover_id,
      surveyor_name: data.data?.username || 'Unknown', // Adjust based on full JSON response
      status: data.status,
      latitude: data.coordinates?.latitude || 0.0,
      longitude: data.coordinates?.longitude || 0.0,
      battery_level: data.telemetry?.battery_level || 0,
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
