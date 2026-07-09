const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  level: {
    type: String,
    enum: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
    required: true,
    index: true
  },
  service: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  errorType: {
    type: String,
    default: null,
    index: true
  },
  rawContent: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Log', LogSchema);
