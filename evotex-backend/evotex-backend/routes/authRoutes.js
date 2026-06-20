const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  register,
  login,
  getMe,
  updateProfile,
} = require('../controllers/authController');
const { verifyCnic } = require('../controllers/stepupController');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);

// Step 1 of the pre-vote step-up verification (CNIC match).
router.post('/vote/verify-cnic', verifyToken, verifyCnic);

module.exports = router;
