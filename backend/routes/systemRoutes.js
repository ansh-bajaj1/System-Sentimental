const express = require('express');
const router = express.Router();
const { 
  getLogs, 
  getAlerts, 
  getMetrics, 
  acknowledgeAlert, 
  testAlert 
} = require('../controllers/systemController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/logs', getLogs);
router.get('/alerts', getAlerts);
router.get('/metrics', getMetrics);
router.post('/alerts/acknowledge/:id', acknowledgeAlert);
router.post('/alerts/test', testAlert);

module.exports = router;
