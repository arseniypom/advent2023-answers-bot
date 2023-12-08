const winston = require('winston');

const infoOnlyFilter = winston.format((info) => {
  return info.level === 'info' ? info : false;
});

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ 
      filename: 'supportRequests.log', 
      level: 'info',
      format: winston.format.combine(
        infoOnlyFilter(),
        winston.format.json()
      )
    })
  ]
});

module.exports = logger;
