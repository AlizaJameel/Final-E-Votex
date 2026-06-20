const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  getRegistrationOptions,
  verifyRegistration,
  getLoginOptions,
  verifyLogin,
} = require('../controllers/webauthnController');
const { stepupStatus, verifyFingerprint, verifyFace, refreshFingerprintOptions, refreshFaceOptions } = require('../controllers/stepupController');

router.post('/register/options', verifyToken, getRegistrationOptions);
router.post('/register/verify', verifyToken, verifyRegistration);
router.get('/login/options', getLoginOptions);
router.post('/login/verify', verifyLogin);

// Pre-vote step-up verification (Steps 2 & 3) + enrollment status.
router.get('/stepup/status', verifyToken, stepupStatus);
router.post('/stepup/verify-fingerprint', verifyToken, verifyFingerprint);
router.post('/stepup/verify-face', verifyToken, verifyFace);
router.post('/stepup/refresh-fingerprint-options', verifyToken, refreshFingerprintOptions);
router.post('/stepup/refresh-face-options', verifyToken, refreshFaceOptions);

module.exports = router;
