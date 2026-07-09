const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    const settings = settingsService.getSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    logger.error(`Error in getSettings controller: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update system settings
// @route   POST /api/settings
// @access  Private
const updateSettings = async (req, res) => {
  try {
    const updated = await settingsService.updateSettings(req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error(`Error in updateSettings controller: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
