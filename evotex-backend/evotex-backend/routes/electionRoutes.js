const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  getAllElections,
  getElectionById,
  getElectionResults,
} = require('../controllers/electionController');

router.get('/', verifyToken, getAllElections);
router.get('/:id/results', verifyToken, getElectionResults);
router.get('/:id', verifyToken, getElectionById);

module.exports = router;
