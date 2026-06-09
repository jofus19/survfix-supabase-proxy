const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const http = require('http');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SURVFIX_API = "http://163.181.81.231/api/v1/tracking/stream?rover_id=RVR-12345&interval=5000";

async function fetchAndSaveData() {
  console.log("Fetching telemetry data from Survfix...");

  try {
    // Added User-Agent to simulate the Android APK client and avoid 403 Forbidden
    const response = await fetch(SURVFIX_API, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'okhttp/4.9.3',
        'X-Requested-With': 'XMLHttpRequest'
      }
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

// Run polling loop every 10 seconds
const POLLING_INTERVAL = 10000;
setInterval(fetchAndSaveData, POLLING_INTERVAL);
fetchAndSaveData();

// Bind strictly to Render's required port
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Survfix Supabase Proxy background worker active.');
}).listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

console.log("Survfix Supabase Proxy background worker started.");
