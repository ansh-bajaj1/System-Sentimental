const { redisClient } = require('../config/redis');
const alertEngine = require('./alertEngine');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

// Sliding window event counter in Redis
const countEventInWindow = async (key, windowSeconds) => {
  if (!redisClient.isOpen) {
    logger.debug('Redis client not connected, skipping sliding window count');
    return 1; // Fallback to 1 event
  }

  try {
    const now = Date.now();
    const cutoff = now - (windowSeconds * 1000);
    const uniqueVal = `${now}-${Math.random()}`;

    // Use redis multi or execute operations in order
    await redisClient.zAdd(key, { score: now, value: uniqueVal });
    await redisClient.zRemRangeByScore(key, 0, cutoff);
    const card = await redisClient.zCard(key);
    await redisClient.expire(key, windowSeconds);

    return card;
  } catch (error) {
    logger.error(`Error counting event in sliding window: ${error.message}`);
    return 1;
  }
};

// Check Resource usage alerts
const checkResourceThresholds = async ({ cpu, memory, disk, host }) => {
  const settings = settingsService.getSettings();

  // 1. CPU Threshold Check
  if (cpu >= settings.cpuThreshold) {
    await alertEngine.triggerAlert({
      severity: cpu >= 95 ? 'CRITICAL' : 'HIGH',
      service: 'system-resources',
      host,
      issue: `CPU usage has exceeded threshold: ${cpu}% (Threshold: ${settings.cpuThreshold}%)`,
      recommendation: 'Check running processes via SSH (top/htop). Identify and terminate resource-hogging tasks.'
    });
  }

  // 2. Memory Threshold Check
  if (memory >= settings.memoryThreshold) {
    await alertEngine.triggerAlert({
      severity: memory >= 95 ? 'CRITICAL' : 'HIGH',
      service: 'system-resources',
      host,
      issue: `Memory usage has exceeded threshold: ${memory}% (Threshold: ${settings.memoryThreshold}%)`,
      recommendation: 'Verify active application memory leaks, clear caches, or increase VM swap space.'
    });
  }

  // 3. Disk Threshold Check
  if (disk >= settings.diskThreshold) {
    await alertEngine.triggerAlert({
      severity: 'CRITICAL',
      service: 'system-resources',
      host,
      issue: `Disk space usage is critical: ${disk}% (Threshold: ${settings.diskThreshold}%)`,
      recommendation: 'Free up disk space immediately. Run backup scripts, clean up package caches, prune docker layers.'
    });
  }
};

// Check Logs for anomalies
const checkLogAnomalies = async (parsedLog) => {
  const { level, service, message, rawContent } = parsedLog;
  const host = parsedLog.host || 'localhost';

  // 1. Check for Repeated ERROR logs (e.g. 5 errors in 1 minute)
  if (level === 'ERROR') {
    const redisKey = `counter:log:error:${service}`;
    const count = await countEventInWindow(redisKey, 60);
    if (count >= 5) {
      await alertEngine.triggerAlert({
        severity: 'CRITICAL',
        service,
        host,
        issue: `Repeated ERROR logs detected: ${count} errors in the last 1 minute. Last error: "${message}"`,
        recommendation: `Inspect server and application services for '${service}'. Review logs/combined.log.`
      });
    }
  }

  // 2. Check for Repeated WARN logs (e.g. 10 warnings in 1 minute)
  if (level === 'WARN') {
    const redisKey = `counter:log:warn:${service}`;
    const count = await countEventInWindow(redisKey, 60);
    if (count >= 10) {
      await alertEngine.triggerAlert({
        severity: 'MEDIUM',
        service,
        host,
        issue: `High frequency of WARN logs: ${count} warnings in the last 1 minute.`,
        recommendation: `Check database pools, slow queries, or API response latencies for service: ${service}.`
      });
    }
  }

  // 3. Detect authentication failures (repeated failed login attempts)
  const isAuthFailure = 
    service === 'auth' || 
    /failed password|login failed|invalid user|authentication failure|auth failure/i.test(message) ||
    /failed password|login failed|invalid user|authentication failure|auth failure/i.test(rawContent);

  if (isAuthFailure) {
    const redisKey = `counter:log:auth_fail:${host}`;
    const count = await countEventInWindow(redisKey, 60);
    if (count >= 3) {
      await alertEngine.triggerAlert({
        severity: 'HIGH',
        service: service || 'auth',
        host,
        issue: `Brute force warning: ${count} failed login attempts in the last 1 minute.`,
        recommendation: 'Block malicious IP using iptables/fail2ban. Review SSH config and enforce SSH key authentication.'
      });
    }
  }

  // 4. Detect HTTP 500 Spikes
  const isHttp500 = 
    / 500 /i.test(message) || 
    /HTTP\/1\.[01]" 500/i.test(rawContent) || 
    /status":500/i.test(rawContent) ||
    (service === 'nginx' && (message.includes('500') || message.includes('502') || message.includes('504')));

  if (isHttp500) {
    const redisKey = `counter:log:http_500:${service}`;
    const count = await countEventInWindow(redisKey, 60);
    if (count >= 5) {
      await alertEngine.triggerAlert({
        severity: 'CRITICAL',
        service,
        host,
        issue: `HTTP 500 Spikes: ${count} server errors in the last 1 minute on '${service}'.`,
        recommendation: 'Check gateway services, server load, database connections, and upstream application code crash dumps.'
      });
    }
  }
};

module.exports = {
  checkResourceThresholds,
  checkLogAnomalies
};
