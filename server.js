const { createClient } = require('@supabase/supabase-js');
const net = require('net');

// Load environment variables from Render
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HOST = 'support.survfix.com';
const PORT = 13434;

function connectToStream() {
  const client = new net.Socket();

  console.log(`Connecting to raw stream at ${HOST}:${PORT}...`);

  client.connect(PORT, HOST, () => {
    console.log('Connected to Survfix TCP stream successfully!');
  });

  client.on('data', async (data) => {
    const textData = data.toString('utf8');
    console.log("Received data chunk:\n", textData);

    // Parse the Job Name/Rover ID from the JB line
    let roverName = 'RVR-12345';
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
  });

  client.on('close', () => {
    console.log('Stream connection closed. Reconnecting in 10 seconds...');
    // Auto-reconnect if the stream drops
    setTimeout(connectToStream, 10000);
  });

  client.on('error', (err) => {
    console.error('Stream socket error:', err.message);
    client.destroy();
  });
}

// Start the stream listener
connectToStream();

console.log("Survfix TCP Supabase Proxy started.");
