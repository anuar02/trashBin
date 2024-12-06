const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

let wasteData = { wasteLevel: null, distance: null, latitude: null, longitude: null };

app.post('/api/waste-level', (req, res) => {
    const { wasteLevel, distance, latitude, longitude } = req.body;

    wasteData = { wasteLevel, distance, latitude, longitude };

    console.log(`Received waste level: ${wasteLevel}`);
    console.log(`Distance measured: ${distance} cm`);
    console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

    res.status(200).send('Data received');
});

app.get('/api/waste-level', (req, res) => {
    res.status(200).json(wasteData);
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
