require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const logger = require('./utils/logger');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const settingsService = require('./services/settingsService');
const { seedDefaultAdmin } = require('./controllers/authController');

const authRoutes = require('./routes/authRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const systemRoutes = require('./routes/systemRoutes');
const prometheus = require('./services/prometheus');
const { protect } = require('./middleware/authMiddleware');
const { testAlert } = require('./controllers/systemController');

const { startLogMonitor } = require('./services/logMonitor');
const { startMetricsCollector } = require('./services/metricsCollector');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: '*', // In production, replace with specific frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());

// Prometheus Metrics Endpoint (Unauthenticated for easy Prometheus scraping)
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  } catch (err) {
    logger.error(`Error generating prometheus metrics: ${err.message}`);
    res.status(500).end(err);
  }
});

// Middleware to track HTTP Requests in Prometheus
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.baseUrl + (req.route ? req.route.path : req.path);
    // Ignore metrics endpoint requests to avoid noise
    if (req.path !== '/metrics') {
      prometheus.metrics.httpRequestsCounter.inc({
        method: req.method,
        route: route,
        status: res.statusCode
      });
    }
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system', systemRoutes);

// Explicit POST /api/alerts/test to match exact API endpoint list
app.post('/api/alerts/test', protect, testAlert);

// Simple health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { redisClient } = require('./config/redis');
    
    const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
    const redisStatus = redisClient.isOpen ? 'UP' : 'DOWN';

    res.status(200).json({
      status: 'UP',
      timestamp: new Date(),
      services: {
        database: dbStatus,
        cache: redisStatus
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'DOWN', error: error.message });
  }
});

// Server Static Frontend assets in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled Express Error: ${err.message}`, err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

const PORT = process.env.PORT || 5000;

// Initialize Server
const initServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Connect Redis
    await connectRedis();

    // 3. Seed Default Admin User
    await seedDefaultAdmin();

    // 4. Load System Settings into Cache
    await settingsService.loadSettings();

    // 5. Setup Socket.io
    const io = socketIo(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    global.io = io; // Share socket server globally

    io.on('connection', (socket) => {
      logger.info(`Socket client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Socket client disconnected: ${socket.id}`);
      });
    });

    // 6. Start Log Monitoring & Resource Monitoring
    startLogMonitor(io);
    startMetricsCollector(io);

    // 7. Start listening
    server.listen(PORT, () => {
      logger.info(`System Sentinel Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

  } catch (error) {
    logger.error(`Critical error during initialization: ${error.message}`);
    process.exit(1);
  }
};

initServer();
