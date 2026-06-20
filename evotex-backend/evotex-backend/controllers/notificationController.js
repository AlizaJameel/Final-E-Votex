const db = require('../config/db');
const { formatNotification } = require('../utils/helpers');

exports.getNotifications = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM notifications
       WHERE voter_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(formatNotification));
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
