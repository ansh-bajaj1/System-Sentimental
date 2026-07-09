const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (like CPU, memory usage from node process)
client.collectDefaultMetrics({ register, prefix: 'sentinel_' });

// Custom System Metrics
const cpuUsageGauge = new client.Gauge({
  name: 'sentinel_system_cpu_usage_ratio',
  help: 'System CPU usage percentage (0-100)'
});

const memoryUsageGauge = new client.Gauge({
  name: 'sentinel_system_memory_usage_ratio',
  help: 'System memory usage percentage (0-100)'
});

const diskUsageGauge = new client.Gauge({
  name: 'sentinel_system_disk_usage_ratio',
  help: 'System disk usage percentage (0-100)'
});

const httpRequestsCounter = new client.Counter({
  name: 'sentinel_http_requests_total',
  help: 'Total HTTP requests processed',
  labelNames: ['method', 'route', 'status']
});

const logErrorsCounter = new client.Counter({
  name: 'sentinel_parsed_errors_total',
  help: 'Total parsed log errors categorized by level and service',
  labelNames: ['level', 'service']
});

const alertsCounter = new client.Counter({
  name: 'sentinel_alerts_triggered_total',
  help: 'Total infrastructure alerts dispatched',
  labelNames: ['severity', 'service', 'issue']
});

const uptimeGauge = new client.Gauge({
  name: 'sentinel_system_uptime_seconds',
  help: 'System uptime in seconds'
});

// Register custom metrics
register.registerMetric(cpuUsageGauge);
register.registerMetric(memoryUsageGauge);
register.registerMetric(diskUsageGauge);
register.registerMetric(httpRequestsCounter);
register.registerMetric(logErrorsCounter);
register.registerMetric(alertsCounter);
register.registerMetric(uptimeGauge);

module.exports = {
  register,
  metrics: {
    cpuUsageGauge,
    memoryUsageGauge,
    diskUsageGauge,
    httpRequestsCounter,
    logErrorsCounter,
    alertsCounter,
    uptimeGauge
  }
};
