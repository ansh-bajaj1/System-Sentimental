const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  // Resource Thresholds
  cpuThreshold: {
    type: Number,
    required: true,
    default: 80
  },
  memoryThreshold: {
    type: Number,
    required: true,
    default: 85
  },
  diskThreshold: {
    type: Number,
    required: true,
    default: 90
  },
  // Interval & Paths
  monitoringInterval: {
    type: Number,
    required: true,
    default: 10 // in seconds
  },
  logFilePath: {
    type: String,
    required: true,
    default: 'logs/application.log'
  },
  // Slack Alert Config
  slackEnabled: {
    type: Boolean,
    required: true,
    default: false
  },
  slackWebhook: {
    type: String,
    default: ''
  },
  // Email Alert Config
  emailEnabled: {
    type: Boolean,
    required: true,
    default: false
  },
  emailSmtpHost: {
    type: String,
    default: 'smtp.ethereal.email'
  },
  emailSmtpPort: {
    type: Number,
    default: 587
  },
  emailSmtpUser: {
    type: String,
    default: ''
  },
  emailSmtpPass: {
    type: String,
    default: ''
  },
  emailSmtpFrom: {
    type: String,
    default: 'sentinel@system.monitor'
  },
  // General Alert Rules
  alertCooldown: {
    type: Number,
    required: true,
    default: 300 // 5 minutes in seconds
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', SettingSchema);
