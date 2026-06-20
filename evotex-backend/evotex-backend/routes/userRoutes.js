const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { verifyCnic } = require('../controllers/userController');

router.post('/verify-cnic', verifyToken, verifyCnic);

module.exports = router;
