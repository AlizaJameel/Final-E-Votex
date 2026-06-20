const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');

exports.submitTicket = async (req, res) => {
  try {
    const { subject, message, name, email } = req.body;
    const userId = req.user.id;

    const [tableCheck] = await db.execute(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'support_tickets'`
    );
    if (!tableCheck.length) {
      return res.status(500).json({
        success: false,
        message: 'Support tickets table not found. Run node setup-db.js',
      });
    }

    await db.execute(
      'INSERT INTO support_tickets (user_id, subject, message) VALUES (?, ?, ?)',
      [userId, subject, message]
    );

    try {
      const [settingsRows] = await db.execute(
        "SELECT value FROM settings WHERE key_name = 'adminEmail'"
      );
      const adminEmail = settingsRows[0]?.value || 'admin@evotex.com';

      await sendEmail({
        to: adminEmail,
        subject: `Support Ticket: ${subject}`,
        html: `<p>New support ticket from ${name || 'User'} (${email || 'N/A'}):</p><p><strong>${subject}</strong></p><p>${message}</p>`,
      });
    } catch (emailErr) {
      console.log('Support ticket email failed:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully',
    });
  } catch (err) {
    console.log('Submit support ticket error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
