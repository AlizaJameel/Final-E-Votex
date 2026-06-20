const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');
const {
  adminLogin,
  getAdminElections,
  getAdminElectionById,
  createElection,
  updateElection,
  deleteElection,
  getVoters,
  updateVoterStatus,
  getAdminNotifications,
  getDashboardStats,
  getSettings,
  updateSettings,
} = require('../controllers/adminController');

// Public: admin authentication. Must be registered BEFORE the auth guard below.
router.post('/login', adminLogin);

router.use(verifyToken, requireAdmin);

router.get('/elections', getAdminElections);
router.get('/elections/:id', getAdminElectionById);
router.post('/elections', createElection);
router.put('/elections/:id', updateElection);
router.delete('/elections/:id', deleteElection);

router.get('/voters', getVoters);
router.put('/voters/:id/status', updateVoterStatus);

router.get('/notifications', getAdminNotifications);

router.get('/dashboard-stats', getDashboardStats);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
