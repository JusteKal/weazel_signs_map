const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5500;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(express.static(__dirname));

// Helper: read data from JSON
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return { points: [] };
  }
}

// Helper: write data to JSON
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// API: Get all points
app.get('/api/points', (req, res) => {
  const data = readData();
  res.json(data.points);
});

// API: Save points
app.post('/api/points', (req, res) => {
  const points = req.body;
  writeData({ points });
  res.json({ success: true, message: 'Points saved' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
