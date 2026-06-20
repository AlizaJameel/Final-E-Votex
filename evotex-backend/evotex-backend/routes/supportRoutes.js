const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { submitTicket } = require('../controllers/supportController');

router.post('/ticket', verifyToken, submitTicket);

module.exports = router;
