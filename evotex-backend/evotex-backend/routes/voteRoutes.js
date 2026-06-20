const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const requireVoteSession = require('../middleware/voteSession');
const { castVote } = require('../controllers/voteController');

router.post('/', verifyToken, requireVoteSession, castVote);

module.exports = router;
