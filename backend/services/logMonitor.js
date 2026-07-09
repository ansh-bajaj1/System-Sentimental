const fs = require('fs');
const path = require('path');
const logParser = require('./logParser');
const Log = require('../models/Log');
const anomalyEngine = require('./anomalyEngine');
const prometheus = require('./prometheus');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

let activeWatcher = null;
let pollIntervalId = null;
let currentFilePath = null;
let filePosition = 0;

const processNewLines = async (filePath, io) => {
  try {
    const stats = fs.statSync(filePath);
    
    // File was truncated or rotated
    if (stats.size < filePosition) {
      logger.info(`Log file truncated or rotated: ${filePath}. Resetting pointer.`);
      filePosition = 0;
    }

    if (stats.size === filePosition) {
      return; // No new content
    }

    const stream = fs.createReadStream(filePath, {
      start: filePosition,
      end: stats.size - 1,
      encoding: 'utf8'
    });

    filePosition = stats.size;

    let buffer = '';
    for await (const chunk of stream) {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      // Save last incomplete line back to buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (line.trim() !== '') {
          await handleLogLine(line, io);
        }
      }
    }

    // Process remainder if it's not empty
    if (buffer.trim() !== '') {
      await handleLogLine(buffer, io);
    }

  } catch (error) {
    logger.error(`Error processing new log lines: ${error.message}`);
  }
};

const handleLogLine = async (line, io) => {
  try {
    const parsed = logParser.parseLogLine(line);
    if (!parsed) return;

    // 1. Save to Database
    const logDoc = new Log(parsed);
    await logDoc.save();

    // 2. Increment Prometheus Counter for Errors/Warnings
    if (parsed.level === 'ERROR' || parsed.level === 'WARN') {
      prometheus.metrics.logErrorsCounter.inc({
        level: parsed.level,
        service: parsed.service
      });
    }

    // 3. Emit to frontend over socket
    if (io) {
      io.emit('new-log', logDoc);
    }

    // 4. Send to Anomaly Engine for check
    await anomalyEngine.checkLogAnomalies(parsed);

  } catch (error) {
    logger.error(`Error handling parsed log line: ${error.message}`);
  }
};

const startLogMonitor = (io) => {
  const settings = settingsService.getSettings();
  const filePath = path.resolve(settings.logFilePath || 'logs/application.log');
  
  // Clean up existing watcher / polling
  stopLogMonitor();

  currentFilePath = filePath;
  logger.info(`Initializing Log Monitor watching file: ${filePath}`);

  // Create directory if it doesn't exist
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create empty file if it doesn't exist
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }

  // Initialize position at end of file to prevent reprocessing historic logs on startup
  try {
    const stats = fs.statSync(filePath);
    filePosition = stats.size;
  } catch (err) {
    filePosition = 0;
  }

  // Setup file system watcher
  try {
    activeWatcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        processNewLines(filePath, io);
      }
    });
  } catch (watchErr) {
    logger.error(`fs.watch failed: ${watchErr.message}. Falling back to polling.`);
  }

  // Setup fallback polling interval check every 1 second (very lightweight)
  pollIntervalId = setInterval(() => {
    processNewLines(filePath, io);
  }, 1000);

  // Global handle to restart the monitor when log settings change
  global.restartLogMonitor = () => {
    logger.info('Restarting Log Monitor due to configuration changes...');
    startLogMonitor(io);
  };
};

const stopLogMonitor = () => {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
  }
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
};

module.exports = {
  startLogMonitor,
  stopLogMonitor
};
