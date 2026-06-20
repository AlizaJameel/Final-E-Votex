const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { formatUser, isValidCnic } = require('../utils/helpers');
const { insertAuditLog } = require('../utils/auditLog');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, cnic } = req.body;
    if (!name || !email || !password || !cnic) {
      return res.status(400).json({ success: false, message: 'Name, email, password and CNIC are required' });
    }

    if (!isValidCnic(cnic)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CNIC format. Use XXXXX-XXXXXXX-X.',
      });
    }

    const [existing] = await db.execute('SELECT id FROM voters WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const [cnicExisting] = await db.execute('SELECT id FROM voters WHERE cnic = ?', [cnic]);
    if (cnicExisting.length) {
      return res.status(400).json({ success: false, message: 'CNIC already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);
    await db.execute(
      'INSERT INTO voters (name, email, password_hash, status, cnic) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, 'pending', cnic]
    );

    await db.execute(
      'INSERT INTO admin_notifications (type, title, message) VALUES (?, ?, ?)',
      ['info', 'New voter registration', `${name} has registered with email ${email}.`]
    );

    await insertAuditLog(`New voter registered: ${name} (${email})`);

    res.status(201).json({ message: 'Registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
   

    const [rows] = await db.execute('SELECT * FROM voters WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    

    const token = signToken({ id: user.id, email: user.email, role: 'voter' });
    res.json({
      token,
      role: 'voter',
      user: formatUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// NOTE: Admin login lives in adminController.adminLogin (POST /admin/login)
// against the `admins` table. Voter and admin auth are kept fully separate.

exports.getMe = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({
        id: req.user.id,
        name: 'Admin',
        email: 'admin@evotex.com',
        cnic: '',
        status: 'verified',
      });
    }

    const [rows] = await db.execute('SELECT * FROM voters WHERE id = ?', [req.user.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json(formatUser(rows[0]));
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { name, cnic } = req.body;
    const userId = req.user.id;

    if (cnic !== undefined && cnic !== '' && !isValidCnic(cnic)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CNIC format. Use XXXXX-XXXXXXX-X.',
      });
    }

    if (cnic) {
      const [cnicRows] = await db.execute(
        'SELECT id FROM voters WHERE cnic = ? AND id != ?',
        [cnic, userId]
      );
      if (cnicRows.length) {
        return res.status(400).json({ success: false, message: 'CNIC already in use' });
      }
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (cnic !== undefined) {
      updates.push('cnic = ?');
      values.push(cnic);
    }

    if (!updates.length) {
      const [rows] = await db.execute('SELECT * FROM voters WHERE id = ?', [userId]);
      return res.json(formatUser(rows[0]));
    }

    values.push(userId);
    await db.execute(`UPDATE voters SET ${updates.join(', ')} WHERE id = ?`, values);

    const [rows] = await db.execute('SELECT * FROM voters WHERE id = ?', [userId]);
    res.json(formatUser(rows[0]));
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
