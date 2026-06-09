const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Load environment variables from Render
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration for Survfix stream (Port 13434)
// Removed Authorization headers assuming it's an open telemetry stream
const SURVFIX_API = "http://support.survfix.com:13434/api/v1/tracking/stream?rover_id=RVR-12345&interval=5000";

async function fetchAndSaveData() {
  console.log("Fetching telemetry data from Survfix...");

  try {
    const response = await fetch(SURVFIX_API, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Survfix API error: ${response.statusText}`);
    }

    // Read response as plain text
    const textData = await response.text();
    console.log("Raw text received:\n", textData);

    // Default fallback rover name
    let roverName = 'RVR-12345';
    
    // Attempt to extract job name / rover ID from the stream text
    const match = textData.match(/JB,NM([^,\r\n]+)/);
    if (match && match[1]) {
      roverName = match[1].trim();
    }

    const roverRecord = {
      rover_name: roverName, 
      status: 'Active',
      surveyor_name: 'Unknown'
    };

    // Insert or update data into the Supabase 'rovers' table
    const { error } = await supabase
      .from('rovers')
      .upsert(roverRecord, { onConflict: 'rover_name' });

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
