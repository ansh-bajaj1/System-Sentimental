const mongoose = require('mongoose');

const MetricSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: { expires: '24h' } // Automatically clean up metrics older than 24 hours to prevent DB bloat
  },
  cpuUsage: {
    type: Number,
    required: true
  },
  memoryUsage: {
    type: Number,
    required: true
  },
  diskUsage: {
    type: Number,
    required: true
  },
  loadAverage: {
    type: [Number], // [1m, 5m, 15m]
    required: true
  },
  networkSpeed: {
    rx: Number, // KB/s received
    tx: Number  // KB/s transmitted
  },
  processCount: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('Metric', MetricSchema);
