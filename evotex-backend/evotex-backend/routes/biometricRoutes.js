const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  generateFaceRegistrationOptions,
  verifyFaceRegistration,
  generateFaceAuthOptions,
  verifyFaceAuth,
} = require('../controllers/biometricController');

router.post('/face/register-options', verifyToken, generateFaceRegistrationOptions);
router.post('/face/register-verify', verifyToken, verifyFaceRegistration);
router.post('/face/auth-options', verifyToken, generateFaceAuthOptions);
router.post('/face/auth-verify', verifyToken, verifyFaceAuth);

module.exports = router;
