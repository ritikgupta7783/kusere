const fs = require('fs');
const path = require('path');
const config = require('../config/env');

let stream;
function getStream() {
  if (stream !== undefined) return stream;
  try {
    fs.mkdirSync(config.logDir, { recursive: true });
    stream = fs.createWriteStream(path.join(config.logDir, 'server.log'), { flags: 'a' });
  } catch {
    stream = null;
  }
  return stream;
}

function write(level, msg, meta) {
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;
  (level === 'error' ? console.error : console.log)(line);
  if (!config.isTest) getStream()?.write(line + '\n');
}

// Never pass OTPs, passwords, tokens or card data to these functions.
module.exports = {
  info: (m, meta) => write('info', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta),
};
