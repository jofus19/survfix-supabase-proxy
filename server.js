const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

const SUPABASE_URL = "https://bcwhvynkwghcbjjxtvlw.supabase.co/rest/v1";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"; // Make sure to paste your JWT key here!

app.post('/api/v1/tracking/stream', async (req, res) => {
    try {
        const payload = req.body;
        console.log("Received payload from rover:", payload.rover_id);

        // Forward data to Supabase 'rovers' table (adjust table/columns as needed)
        const response = await fetch(`${SUPABASE_URL}/rovers?id=eq.${payload.rover_id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`, // <-- FIXED: Added $ and curly braces
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                latitude: payload.latitude,
                longitude: payload.longitude,
                battery_level: payload.battery_level,
                status: "Active"
            })
        });

        if (response.ok) {
            res.status(200).send({ status: "Synced" });
        } else {
            const errText = await response.text();
            console.error("Supabase reject:", errText);
            res.status(500).send("Sync error");
        }
    } catch (e) {
        console.error("Proxy error:", e);
        res.status(500).send("Server error");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy active on port ${PORT}`));