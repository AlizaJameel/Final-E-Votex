const db = require('../config/db');
const { isValidCnic } = require('../utils/helpers');

/** POST /user/verify-cnic — save CNIC during enrollment (auth required). */
exports.verifyCnic = async (req, res) => {
  try {
    const voterId = req.user.id;
    const cnic = String(req.body.cnic ?? '').trim();

    if (!isValidCnic(cnic)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CNIC. Use 13 digits in format XXXXX-XXXXXXX-X.',
      });
    }

    const [dup] = await db.execute(
      'SELECT id FROM voters WHERE cnic = ? AND id != ?',
      [cnic, voterId]
    );
    if (dup.length) {
      return res.status(409).json({
        success: false,
        message: 'This CNIC is already registered to another account.',
      });
    }

    await db.execute('UPDATE voters SET cnic = ? WHERE id = ?', [cnic, voterId]);

    res.json({ success: true, cnic_verified: true, message: 'CNIC saved successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This CNIC is already registered to another account.',
      });
    }
    console.error('verifyCnic (user) error:', err);
    res.status(500).json({ success: false, message: 'Server error while saving CNIC' });
  }
};
