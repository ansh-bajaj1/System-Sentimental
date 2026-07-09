const fs = require('fs');
const path = require('path');

const logFilePath = path.resolve(__dirname, '../logs/application.log');
const dir = path.dirname(logFilePath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Log level styles
const services = ['auth-service', 'payment-gateway', 'user-profile', 'nginx', 'sshd', 'database-pool'];
const errorTypes = ['NullPointerException', 'TimeoutException', 'ConnectionError', 'AuthFailure', 'DiskFullException'];
const messages = {
  INFO: [
    'User successfully logged in',
    'Database connection pool warmed up',
    'Cache refreshed successfully',
    'API request processed in 45ms',
    'Session token validated for user_987'
  ],
  WARN: [
    'Slow database query detected: SELECT * FROM users (took 320ms)',
    'Redis memory usage is approaching 80%',
    'API latency spike detected: 850ms on GET /api/v1/analytics',
    'Connection pool size close to capacity limit (92/100)'
  ],
  ERROR: [
    'Failed to complete payment transaction (TimeoutException): gateway unreachable',
    'User registration failed: email already exists',
    'Database sync failed (ConnectionError): handshake failed',
    'Failed to write file to storage (DiskFullException): no space left on device'
  ]
};

// Write helper
const writeLog = (line) => {
  fs.appendFileSync(logFilePath, line + '\n', 'utf8');
  console.log(`[Generated Log]: ${line}`);
};

// Generate standard app log
const generateAppLog = (level, service, message) => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  return `[${timestamp}] [${level}] [${service}] ${message}`;
};

// Generate nginx access log
const generateNginxLog = (status) => {
  const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  const timestamp = new Date().toUTCString().replace('GMT', '+0000');
  const request = `GET /api/system/metrics HTTP/1.1`;
  const bytes = Math.floor(Math.random() * 2000) + 100;
  return `${ip} - - [${timestamp}] "${request}" ${status} ${bytes} "-" "Mozilla/5.0"`;
};

// Generate auth syslog
const generateAuthLog = (success) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const dateStr = `${months[now.getMonth()]} ${now.getDate().toString().padStart(2, ' ')} ${now.toTimeString().substring(0, 8)}`;
  
  if (success) {
    return `${dateStr} localhost sshd[${Math.floor(Math.random() * 50000)}]: Accepted publickey for admin from 192.168.1.100 port 55432 ssh2`;
  } else {
    return `${dateStr} localhost sshd[${Math.floor(Math.random() * 50000)}]: Failed password for invalid user admin from 203.0.113.12 port 51123 ssh2`;
  }
};

// Trigger regular logs
const startSimulation = () => {
  console.log(`Starting mock log generator writing to: ${logFilePath}`);
  console.log(`Press Ctrl+C to stop.`);
  console.log(`Modes:`);
  console.log(`1. Regular logs every 2 seconds.`);
  console.log(`2. Random anomaly spikes injected every 25 seconds.`);

  // Write a startup log
  writeLog(generateAppLog('INFO', 'system-sentinel', 'System Sentinel log generator service started.'));

  // 1. Regular Log Loop
  setInterval(() => {
    const roll = Math.random();
    let line = '';
    
    if (roll < 0.7) {
      // INFO
      const svc = services[Math.floor(Math.random() * services.length)];
      const msg = messages.INFO[Math.floor(Math.random() * messages.INFO.length)];
      line = generateAppLog('INFO', svc, msg);
    } else if (roll < 0.9) {
      // WARN
      const svc = services[Math.floor(Math.random() * services.length)];
      const msg = messages.WARN[Math.floor(Math.random() * messages.WARN.length)];
      line = generateAppLog('WARN', svc, msg);
    } else {
      // ERROR
      const svc = services[Math.floor(Math.random() * services.length)];
      const msg = messages.ERROR[Math.floor(Math.random() * messages.ERROR.length)];
      line = generateAppLog('ERROR', svc, msg);
    }
    
    writeLog(line);
  }, 2000);

  // 2. Anomaly Injection Loop
  setInterval(() => {
    const rolls = ['auth_spike', 'nginx_500_spike', 'error_spike'];
    const chosen = rolls[Math.floor(Math.random() * rolls.length)];

    console.log(`\n>>> INJECTING ANOMALY: ${chosen.toUpperCase()} <<<\n`);

    if (chosen === 'auth_spike') {
      // Write 4 auth failures in 2 seconds
      let count = 0;
      const subInt = setInterval(() => {
        writeLog(generateAuthLog(false));
        count++;
        if (count >= 4) clearInterval(subInt);
      }, 500);
    } else if (chosen === 'nginx_500_spike') {
      // Write 6 HTTP 500 status codes in 3 seconds
      let count = 0;
      const subInt = setInterval(() => {
        writeLog(generateNginxLog(500));
        count++;
        if (count >= 6) clearInterval(subInt);
      }, 500);
    } else {
      // Write 6 ERROR logs on the payment-gateway in 3 seconds
      let count = 0;
      const subInt = setInterval(() => {
        writeLog(generateAppLog('ERROR', 'payment-gateway', `Critical transaction failure (ConnectionError): database deadlock detected`));
        count++;
        if (count >= 6) clearInterval(subInt);
      }, 500);
    }
  }, 25000);
};

startSimulation();
