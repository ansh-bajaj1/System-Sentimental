const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  host: {
    type: String,
    required: true,
    default: 'localhost'
  },
  issue: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true,
    index: true
  },
  recommendation: {
    type: String,
    required: true
  },
  acknowledged: {
    type: Boolean,
    default: false,
    index: true
  },
  acknowledgedAt: {
    type: Date
  },
  acknowledgedBy: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', AlertSchema);
