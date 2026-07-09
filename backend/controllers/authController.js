const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_system_sentinel_key_987654321', {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// Seed default administrator if DB empty
const seedDefaultAdmin = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const defaultAdmin = new User({
        username: 'admin',
        password: 'adminpassword123' // This will be hashed automatically by the pre-save hook
      });
      await defaultAdmin.save();
      logger.info('Default admin user seeded successfully (username: admin, password: adminpassword123)');
    }
  } catch (error) {
    logger.error(`Error seeding default admin: ${error.message}`);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    // Check for user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Return token
    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  login,
  seedDefaultAdmin
};
