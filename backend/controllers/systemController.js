const Log = require('../models/Log');
const Alert = require('../models/Alert');
const Metric = require('../models/Metric');
const alertEngine = require('../services/alertEngine');
const logger = require('../utils/logger');

// @desc    Get system logs (paginated, searchable, filterable)
// @route   GET /api/system/logs
// @access  Private
const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, level, service, search } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const query = {};

    if (level) {
      query.level = level;
    }
    if (service) {
      query.service = service;
    }
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { rawContent: { $regex: search, $options: 'i' } },
        { errorType: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Log.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    logger.error(`Error in getLogs: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error retrieving logs' });
  }
};

// @desc    Get system alerts
// @route   GET /api/system/alerts
// @access  Private
const getAlerts = async (req, res) => {
  try {
    const { acknowledged, severity } = req.query;
    const query = {};

    if (acknowledged !== undefined) {
      query.acknowledged = acknowledged === 'true';
    }
    if (severity) {
      query.severity = severity;
    }

    const alerts = await Alert.find(query).sort({ timestamp: -1 });
    res.status(200).json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    logger.error(`Error in getAlerts: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error retrieving alerts' });
  }
};

// @desc    Get system metrics (current and history)
// @route   GET /api/system/metrics
// @access  Private
const getMetrics = async (req, res) => {
  try {
    // Get last 60 metrics for charts (e.g. 10 minutes of history at 10s intervals)
    const metricsHistory = await Metric.find()
      .sort({ timestamp: -1 })
      .limit(60);

    // Return chronological order for charts
    const history = metricsHistory.reverse();
    const current = history[history.length - 1] || null;

    res.status(200).json({
      success: true,
      data: {
        current,
        history
      }
    });
  } catch (error) {
    logger.error(`Error in getMetrics: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error retrieving metrics' });
  }
};

// @desc    Acknowledge an alert
// @route   POST /api/system/alerts/acknowledge/:id
// @access  Private
const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.user.username;
    await alert.save();

    // Broadcast update over sockets
    if (global.io) {
      global.io.emit('alert-acknowledged', alert);
    }

    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    logger.error(`Error in acknowledgeAlert: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error acknowledging alert' });
  }
};

// @desc    Send a test alert
// @route   POST /api/alerts/test
// @access  Private
const testAlert = async (req, res) => {
  const { severity = 'HIGH', service = 'test-service', issue = 'Manual verification test alert triggered' } = req.body;

  try {
    const recommendation = 'Verify if notifications were received in Slack and Email. Acknowledge this alert to clear.';
    const alert = await alertEngine.triggerAlert({
      severity,
      service,
      issue,
      recommendation
    });

    res.status(200).json({
      success: true,
      message: 'Test alert sent successfully',
      data: alert
    });
  } catch (error) {
    logger.error(`Error in testAlert controller: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to send test alert' });
  }
};

module.exports = {
  getLogs,
  getAlerts,
  getMetrics,
  acknowledgeAlert,
  testAlert
};
