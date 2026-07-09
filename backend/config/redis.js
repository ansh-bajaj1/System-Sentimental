const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({
  url: redisUrl
});

redisClient.on('error', (err) => logger.error(`Redis Client Error: ${err.message}`));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    logger.error(`Failed to connect to Redis: ${error.message}`);
  }
};

module.exports = {
  redisClient,
  connectRedis
};
