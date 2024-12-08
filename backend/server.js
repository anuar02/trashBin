require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const moment = require('moment');

const app = express();
app.use(cors());
app.use(express.json());

// Use MongoDB URI from .env
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// Schema matches frontend data structure
const wasteBinSchema = new mongoose.Schema({
    binId: { type: String, default: 'МЕД-001' },
    department: { type: String, default: 'Хирургическое Отделение' },
    wasteType: { type: String, default: 'Острые Медицинские Отходы' },
    fullness: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    temperature: { type: Number, default: 22.7 },
    latitude: { type: Number },
    longitude: { type: Number },
    lastCollection: { type: Date, default: Date.now },
    lastUpdate: { type: Date, default: Date.now }
});

const historySchema = new mongoose.Schema({
    binId: String,
    time: String,
    fullness: Number,
    timestamp: { type: Date, default: Date.now }
});

const WasteBin = mongoose.model('WasteBin', wasteBinSchema);
const History = mongoose.model('History', historySchema);

app.get('/api/waste-bins/:binId', async (req, res) => {
    try {
        const bin = await WasteBin.findOne({ binId: req.params.binId });
        if (!bin) {
            return res.status(404).json({ message: 'Bin not found' });
        }

        const response = {
            ...bin._doc,
            lastCollection: moment(bin.lastCollection).format('DD.MM.YYYY HH:mm'),
            estimatedFillTime: moment(bin.lastCollection).add(2, 'days').format('DD.MM.YYYY HH:mm')
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching bin:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/waste-bins/:binId/history', async (req, res) => {
    try {
        const history = await History.find({ binId: req.params.binId })
            .sort('-timestamp')
            .limit(24);

        const formattedHistory = history.map(h => ({
            time: moment(h.timestamp).format('HH:mm'),
            fullness: h.fullness
        }));

        res.json(formattedHistory);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/waste-level', async (req, res) => {
    try {
        const { distance, latitude, longitude } = req.body;

        const fullness = Math.max(0, Math.min(100, (1 - distance/100) * 100));
        const weight = (fullness/100 * 5).toFixed(1);

        const bin = await WasteBin.findOneAndUpdate(
            { binId: 'МЕД-001' },
            {
                fullness,
                distance,
                weight,
                latitude,
                longitude,
                lastUpdate: new Date()
            },
            { upsert: true, new: true }
        );

        await History.create({
            binId: 'МЕД-001',
            time: moment().format('HH:mm'),
            fullness,
            timestamp: new Date()
        });

        const response = {
            ...bin._doc,
            lastCollection: moment(bin.lastCollection).format('DD.MM.YYYY HH:mm'),
            estimatedFillTime: moment(bin.lastCollection).add(2, 'days').format('DD.MM.YYYY HH:mm')
        };

        res.json(response);
    } catch (error) {
        console.error('Error updating waste level:', error);
        res.status(500).json({ message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});