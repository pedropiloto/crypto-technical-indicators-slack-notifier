const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info', prettyPrint: { colorize: true } });

const log = (params) => {
    logger.info(params);
};

module.exports = { log };
