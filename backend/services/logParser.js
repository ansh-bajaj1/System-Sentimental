const logger = require('../utils/logger');

// Regex patterns
const patterns = {
  // Custom application log: [2026-07-09 19:24:19] [INFO] [service-name] Message goes here (optional error info)
  appLog: /^\[([\d\-]+\s[\d:,]+)\]\s+\[(INFO|WARN|ERROR|DEBUG)\]\s+\[([^\]]+)\]\s+(.*)$/,

  // Nginx log: 192.168.1.1 - - [09/Jul/2026:19:24:19 +0000] "GET /api HTTP/1.1" 200 456 "-" "Mozilla/5.0"
  nginxLog: /^([\d\.]+) - - \[(.*?)\] "(.*?)" (\d+) (\d+)(?: "(.*?)" "(.*?)")?$/,

  // Syslog / Auth.log: Jul  9 19:24:19 hostname sshd[12345]: Failed password for root
  syslog: /^([A-Za-z]{3}\s+\d+\s+[\d:]+)\s+(\S+)\s+(\S+?)\[?(\d*)\]?:\s+(.*)$/
};

// Helper to parse syslog dates (e.g. "Jul  9 19:24:19")
const parseSyslogDate = (dateStr) => {
  const currentYear = new Date().getFullYear();
  // Normalize double space in "Jul  9" to "Jul 9"
  const normalized = dateStr.replace(/\s+/g, ' ');
  const parsed = Date.parse(`${normalized} ${currentYear}`);
  return isNaN(parsed) ? new Date() : new Date(parsed);
};

// Helper to parse Nginx dates (e.g. "09/Jul/2026:19:24:19 +0000")
const parseNginxDate = (dateStr) => {
  // Format: "dd/MMM/yyyy:HH:mm:ss Z"
  // Let's replace the first colon with a space to make it easier for Date.parse
  const formatted = dateStr.replace(':', ' ');
  const parsed = Date.parse(formatted);
  return isNaN(parsed) ? new Date() : new Date(parsed);
};

const parseLogLine = (rawLine) => {
  if (!rawLine || rawLine.trim() === '') return null;

  const line = rawLine.trim();

  // 1. Try Custom App Log
  let match = line.match(patterns.appLog);
  if (match) {
    const [, timestampStr, level, service, message] = match;
    
    // Check if error type can be extracted, e.g. "Transaction failed (NullPointerException): timeout"
    let errorType = null;
    const errorMatch = message.match(/\(([a-zA-Z]+Exception|[a-zA-Z]+Error)\)/);
    if (errorMatch) {
      errorType = errorMatch[1];
    } else if (level === 'ERROR') {
      errorType = 'AppError';
    }

    return {
      timestamp: new Date(timestampStr),
      level,
      service,
      message,
      errorType,
      rawContent: line
    };
  }

  // 2. Try Nginx Access Log
  match = line.match(patterns.nginxLog);
  if (match) {
    const [, ip, dateStr, request, statusStr, bytesStr] = match;
    const status = parseInt(statusStr, 10);
    const bytes = parseInt(bytesStr, 10);
    
    let level = 'INFO';
    let errorType = null;

    if (status >= 500) {
      level = 'ERROR';
      errorType = 'Http5xxError';
    } else if (status >= 400) {
      level = 'WARN';
      errorType = 'Http4xxError';
    }

    return {
      timestamp: parseNginxDate(dateStr),
      level,
      service: 'nginx',
      message: `Client ${ip} requested "${request}" -> Responded with status ${status} (${bytes} bytes)`,
      errorType,
      rawContent: line
    };
  }

  // 3. Try Syslog / Auth.log
  match = line.match(patterns.syslog);
  if (match) {
    const [, dateStr, host, procName, pid, message] = match;
    
    // Determine level from message keywords
    let level = 'INFO';
    let errorType = null;

    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('fail') || lowerMessage.includes('error') || lowerMessage.includes('critical') || lowerMessage.includes('fatal')) {
      level = 'ERROR';
      if (lowerMessage.includes('password') || lowerMessage.includes('login') || lowerMessage.includes('auth')) {
        errorType = 'AuthFailure';
      } else {
        errorType = 'SystemError';
      }
    } else if (lowerMessage.includes('warn')) {
      level = 'WARN';
    }

    return {
      timestamp: parseSyslogDate(dateStr),
      level,
      service: procName,
      message: message,
      errorType,
      host,
      rawContent: line
    };
  }

  // 4. Fallback for unformatted logs
  let level = 'INFO';
  let errorType = null;
  const upperLine = line.toUpperCase();
  
  if (upperLine.includes('ERROR') || upperLine.includes('FATAL') || upperLine.includes('EXCEPTION')) {
    level = 'ERROR';
    errorType = 'UnclassifiedException';
  } else if (upperLine.includes('WARN')) {
    level = 'WARN';
  }

  return {
    timestamp: new Date(),
    level,
    service: 'unclassified',
    message: line,
    errorType,
    rawContent: line
  };
};

module.exports = {
  parseLogLine
};
