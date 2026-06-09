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

const BASE_URL = "https://survfix.com";
const ROVER_ID = "RVR-12345";

let sessionCookie = '';

// Step 1: Handshake / Login to get the session
async function performLogin() {
  console.log("Performing Rover Login handshake...");
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/rover-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Identifier': ROVER_ID,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Login failed with status: ${response.statusText}`);
    }

    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.split(';')[0];
      console.log("Session cookie acquired:", sessionCookie);
    } else {
      console.warn("No cookie returned in login response, proceeding...");
    }

    const data = await response.json();
    console.log("Login successful, profile data:", data);
  } catch (error) {
    console.error("Error during login handshake:", error.message);
  }
}

// Step 2: Fetch Telemetry and Save to Supabase
async function fetchAndSaveData() {
  if (!sessionCookie) {
    await performLogin();
  }

  console.log("Fetching telemetry data from Survfix...");

  try {
    const streamUrl = `${BASE_URL}/api/v1/tracking/stream?rover_id=${ROVER_ID}&interval=5000`;
    
    const headers = { 
      'Accept': 'application/json',
      'User-Agent': 'okhttp/4.9.3',
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }

    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: headers
    });

    if (response.status === 401 || response.status === 403) {
      console.warn("Session expired or unauthorized. Re-logging in...");
      await performLogin();
      return;
    }

    if (!response.ok) {
      throw new Error(`Survfix API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Data received:", data);

    const roverRecord = {
      rover_name: data.rover_id || ROVER_ID, 
      status: data.status || 'Active',
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
setTimeout(fetchAndSaveData, 1000);

// Minimal HTTP server so Render considers this a healthy Web Service
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Survfix Supabase Proxy is running and active.\n');
}).listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

console.log("Survfix Supabase Proxy background worker started.");
