const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const http = require('http');

// Load environment variables from Render
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SURVFIX_API = "http://code.survfix.com/api/v1/tracking/stream?rover_id=RVR-12345&interval=5000";

async function fetchAndSaveData() {
  console.log("Fetching telemetry data from Survfix...");

  try {
    const response = await fetch(SURVFIX_API, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Survfix API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Data received:", data);

    const roverRecord = {
      rover_name: data.rover_id || 'Unknown', 
      status: data.status || 'Inactive',
      surveyor_name: 'Unknown'
    };

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

// Run the fetch loop every 10 seconds
const POLLING_INTERVAL = 10000;
setInterval(fetchAndSaveData, POLLING_INTERVAL);
fetchAndSaveData();

// --- ADDED: Minimal HTTP server so Render considers this a healthy Web Service ---
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Survfix Supabase Proxy is running and active.\n');
}).listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

console.log("Survfix Supabase Proxy background worker started.");
