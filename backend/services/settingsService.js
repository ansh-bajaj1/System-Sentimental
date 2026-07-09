const Setting = require('../models/Setting');
const logger = require('../utils/logger');

let cachedSettings = null;

const loadSettings = async () => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      logger.info('No settings found. Initializing system settings with defaults...');
      settings = new Setting({});
      await settings.save();
    }
    cachedSettings = settings.toObject();
    logger.info('System settings loaded successfully');
    return cachedSettings;
  } catch (error) {
    logger.error(`Error loading settings: ${error.message}`);
    // Return fallback settings if DB fails initially
    cachedSettings = {
      cpuThreshold: 80,
      memoryThreshold: 85,
      diskThreshold: 90,
      monitoringInterval: 10,
      logFilePath: 'logs/application.log',
      slackEnabled: false,
      slackWebhook: '',
      emailEnabled: false,
      emailSmtpHost: 'smtp.ethereal.email',
      emailSmtpPort: 587,
      emailSmtpUser: '',
      emailSmtpPass: '',
      emailSmtpFrom: 'sentinel@system.monitor',
      alertCooldown: 300
    };
    return cachedSettings;
  }
};

const getSettings = () => {
  if (!cachedSettings) {
    return {
      cpuThreshold: 80,
      memoryThreshold: 85,
      diskThreshold: 90,
      monitoringInterval: 10,
      logFilePath: 'logs/application.log',
      slackEnabled: false,
      slackWebhook: '',
      emailEnabled: false,
      emailSmtpHost: 'smtp.ethereal.email',
      emailSmtpPort: 587,
      emailSmtpUser: '',
      emailSmtpPass: '',
      emailSmtpFrom: 'sentinel@system.monitor',
      alertCooldown: 300
    };
  }
  return cachedSettings;
};

const updateSettings = async (settingsData) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting(settingsData);
    } else {
      Object.assign(settings, settingsData);
    }
    await settings.save();
    cachedSettings = settings.toObject();
    logger.info('System settings updated and cached');
    
    // Notify log monitor, metrics engine or alerts if they need to restart
    if (global.restartLogMonitor) {
      global.restartLogMonitor();
    }
    if (global.restartMetricsCollector) {
      global.restartMetricsCollector();
    }

    return cachedSettings;
  } catch (error) {
    logger.error(`Error updating settings: ${error.message}`);
    throw error;
  }
};

module.exports = {
  loadSettings,
  getSettings,
  updateSettings
};
