const jwt = require('jsonwebtoken');

// Requires a valid `session_token` proving CNIC + FINGERPRINT + FACE RECOGNITION
// were all verified (in order) within the last 2 minutes. Must run AFTER
// verifyToken so req.user.id is available.
module.exports = function requireVoteSession(req, res, next) {
  const token = req.body.session_token || req.headers['x-vote-session'];
  if (!token) {
    return res.status(403).json({ success: false, message: 'Complete all 3 verifications first' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.stepup !== 'session' || Number(decoded.id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Complete all 3 verifications first' });
    }
    next();
  } catch {
    return res.status(403).json({
      success: false,
      message: 'Verification expired. Complete all 3 verifications again.',
    });
  }
};
