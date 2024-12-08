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

// Schema remains the same
const wasteBinSchema = new mongoose.Schema({
    binId: { type: String, default: 'МЕД-001' },
    department: { type: String, default: 'Хирургическое Отделение' },
    wasteType: { type: String, default: 'Острые Медицинские Отходы' },
    fullness: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    temperature: { type: Number, default: 22.7 },
    latitude: { type: Number, default: 43.2364 },
    longitude: { type: Number, default: 76.9457 },
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

// Mock data generator
const generateMockData = () => {
    const now = moment();
    const baseFullness = 20 + Math.random() * 30; // Random fullness between 20-50%

    return {
        distance: Math.floor(Math.random() * 50),
        fullness: baseFullness,
        weight: (baseFullness/100 * 5).toFixed(1),
        temperature: (22 + Math.random() * 2).toFixed(1),
        latitude: 43.2364 + (Math.random() - 0.5) * 0.001,
        longitude: 76.9457 + (Math.random() - 0.5) * 0.001,
        timestamp: now.format()
    };
};

// Generate mock history data
const generateMockHistory = () => {
    const history = [];
    const now = moment();
    let baseFullness = 20;

    for (let i = 23; i >= 0; i--) {
        baseFullness += (Math.random() - 0.3) * 5; // Slight random variation
        baseFullness = Math.max(0, Math.min(100, baseFullness)); // Keep between 0-100

        history.push({
            binId: 'МЕД-001',
            time: moment(now).subtract(i, 'hours').format('HH:mm'),
            fullness: Math.round(baseFullness),
            timestamp: moment(now).subtract(i, 'hours').toDate()
        });
    }
    return history;
};

// Initialize mock data if none exists
const initializeMockData = async () => {
    const existingBin = await WasteBin.findOne({ binId: 'МЕД-001' });
    if (!existingBin) {
        const mockData = generateMockData();
        await WasteBin.create({
            binId: 'МЕД-001',
            ...mockData
        });

        const mockHistory = generateMockHistory();
        await History.insertMany(mockHistory);
    }
};

initializeMockData();

// Update mock data periodically
setInterval(async () => {
    const mockData = generateMockData();
    await WasteBin.findOneAndUpdate(
        { binId: 'МЕД-001' },
        {
            ...mockData,
            lastUpdate: new Date()
        }
    );

    await History.create({
        binId: 'МЕД-001',
        time: moment().format('HH:mm'),
        fullness: mockData.fullness,
        timestamp: new Date()
    });
}, 5 * 60 * 1000); // Update every 5 minutes

// Routes remain the same
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

        // If ESP data is provided, use it; otherwise, use mock data
        const mockData = generateMockData();
        const data = {
            distance: distance || mockData.distance,
            latitude: latitude || mockData.latitude,
            longitude: longitude || mockData.longitude,
            fullness: distance ? Math.max(0, Math.min(100, (1 - distance/100) * 100)) : mockData.fullness,
            weight: distance ? ((1 - distance/100) * 5).toFixed(1) : mockData.weight,
            temperature: mockData.temperature
        };

        const bin = await WasteBin.findOneAndUpdate(
            { binId: 'МЕД-001' },
            {
                ...data,
                lastUpdate: new Date()
            },
            { upsert: true, new: true }
        );

        await History.create({
            binId: 'МЕД-001',
            time: moment().format('HH:mm'),
            fullness: data.fullness,
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