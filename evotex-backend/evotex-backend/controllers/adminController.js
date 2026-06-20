const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');
const { insertAuditLog } = require('../utils/auditLog');
const {
  formatElection,
  formatCandidate,
  formatVoter,
  formatAdminNotification,
  computeStatus,
} = require('../utils/helpers');

// Admin authentication is fully separate from voter authentication.
// Admins live in the `admins` table; voters live in the `voters` table.
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [rows] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token, role: 'admin' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const DEFAULT_SETTINGS = {
  siteName: 'E-Votex',
  adminEmail: 'admin@evotex.com',
  emailNotifications: true,
  voteConfirmationAlerts: true,
  notifyOnVote: true,
  notifyOnResult: true,
  allowBiometric: true,
};

function parseSettingValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

async function loadSettings() {
  const [rows] = await db.execute('SELECT key_name, value FROM settings');
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    settings[row.key_name] = parseSettingValue(row.value);
  }
  return settings;
}

async function saveSettings(settings) {
  for (const [key, value] of Object.entries(settings)) {
    await db.execute(
      'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [key, String(value)]
    );
  }
  return loadSettings();
}

async function getCandidatesForElection(electionId) {
  const [rows] = await db.execute(
    'SELECT * FROM candidates WHERE election_id = ? ORDER BY id',
    [electionId]
  );
  return rows.map(formatCandidate);
}

async function fetchElectionWithCandidates(id) {
  const [rows] = await db.execute(
    `SELECT e.*,
            COUNT(c.id) AS candidate_count,
            COALESCE(SUM(c.vote_count), 0) AS vote_count
     FROM elections e
     LEFT JOIN candidates c ON c.election_id = e.id
     WHERE e.id = ?
     GROUP BY e.id`,
    [id]
  );
  if (!rows.length) return null;
  const candidates = await getCandidatesForElection(id);
  return formatElection(rows[0], { includeCandidates: true, candidates });
}

exports.getAdminElections = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT e.*,
             COUNT(c.id) AS candidate_count,
             COALESCE(SUM(c.vote_count), 0) AS vote_count
      FROM elections e
      LEFT JOIN candidates c ON c.election_id = e.id
      GROUP BY e.id
      ORDER BY e.start_date DESC
    `);
    res.json(rows.map((row) => formatElection(row)));
  } catch (err) {
    console.error('Admin get elections error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAdminElectionById = async (req, res) => {
  try {
    const election = await fetchElectionWithCandidates(req.params.id);
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }
    res.json(election);
  } catch (err) {
    console.error('Admin get election error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createElection = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { title, description, startDate, endDate, candidates = [] } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Title, startDate and endDate are required' });
    }

    const status = computeStatus(startDate, endDate);
    const adminId = req.user.id || null;

    await connection.beginTransaction();

    const [result] = await connection.execute(
      'INSERT INTO elections (title, description, start_date, end_date, status, created_by, vote_count) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [title, description || '', startDate, endDate, status, adminId]
    );
    const electionId = result.insertId;

    for (const c of candidates) {
      await connection.execute(
        `INSERT INTO candidates (election_id, name, party, party_code, photo_url, symbol, vote_count)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [
          electionId,
          c.name,
          c.party || '',
          c.partyCode || '',
          c.photoUrl || '',
          c.symbol || '',
        ]
      );
    }

    await connection.execute(
      'INSERT INTO admin_notifications (type, title, message) VALUES (?, ?, ?)',
      ['success', 'New election created', `New election created: ${title}`]
    );

    const [voters] = await connection.execute('SELECT id, email FROM voters');
    for (const voter of voters) {
      await connection.execute(
        `INSERT INTO notifications (voter_id, recipient_role, type, category, title, message, read_status, read_flag)
         VALUES (?, 'voter', ?, ?, ?, ?, 0, 0)`,
        [voter.id, 'election', 'election', 'New Election', `${title} has been scheduled`]
      );

      sendEmail({
        to: voter.email,
        subject: 'New Election Scheduled — E-Votex',
        html: `<p>A new election <strong>${title}</strong> has been scheduled.</p>`,
      });
    }

    await connection.commit();

    const created = await fetchElectionWithCandidates(electionId);
    res.status(201).json(created);
  } catch (err) {
    await connection.rollback();
    console.error('Create election error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};

exports.updateElection = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate, status, candidates } = req.body;

    const [existing] = await connection.execute('SELECT * FROM elections WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    if (status && Object.keys(req.body).length === 1) {
      const oldStatus = existing[0].status;
      await connection.execute('UPDATE elections SET status = ? WHERE id = ?', [status, id]);
      if (oldStatus !== status) {
        await insertAuditLog(
          `Election "${existing[0].title}" status changed from ${oldStatus} to ${status}`,
          connection
        );
      }
      const updated = await fetchElectionWithCandidates(id);
      return res.json(updated);
    }

    await connection.beginTransaction();

    const newStatus = startDate && endDate
      ? computeStatus(startDate, endDate)
      : existing[0].status;
    const resolvedStatus = status ?? newStatus;
    const oldStatus = existing[0].status;

    await connection.execute(
      `UPDATE elections SET title = ?, description = ?, start_date = ?, end_date = ?, status = ?
       WHERE id = ?`,
      [
        title ?? existing[0].title,
        description ?? existing[0].description,
        startDate ?? existing[0].start_date,
        endDate ?? existing[0].end_date,
        resolvedStatus,
        id,
      ]
    );

    if (oldStatus !== resolvedStatus) {
      await insertAuditLog(
        `Election "${title ?? existing[0].title}" status changed from ${oldStatus} to ${resolvedStatus}`,
        connection
      );
    }

    if (Array.isArray(candidates)) {
      await connection.execute('DELETE FROM candidates WHERE election_id = ?', [id]);
      for (const c of candidates) {
        await connection.execute(
          `INSERT INTO candidates (election_id, name, party, party_code, photo_url, symbol, vote_count)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            c.name,
            c.party || '',
            c.partyCode || '',
            c.photoUrl || '',
            c.symbol || '',
            c.voteCount || 0,
          ]
        );
      }
    }

    await connection.commit();

    const updated = await fetchElectionWithCandidates(id);
    res.json(updated);
  } catch (err) {
    await connection.rollback();
    console.error('Update election error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};

exports.deleteElection = async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM elections WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete election error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getVoters = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM voters ORDER BY created_at DESC');
    res.json(rows.map(formatVoter));
  } catch (err) {
    console.error('Get voters error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateVoterStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const [result] = await db.execute('UPDATE voters SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Voter not found' });
    }

    const [rows] = await db.execute('SELECT * FROM voters WHERE id = ?', [req.params.id]);
    res.json(formatVoter(rows[0]));
  } catch (err) {
    console.error('Update voter status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAdminNotifications = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM admin_notifications ORDER BY created_at DESC'
    );
    res.json(rows.map(formatAdminNotification));
  } catch (err) {
    console.error('Get admin notifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [[pendingRow]] = await db.execute("SELECT COUNT(*) AS total FROM voters WHERE status = 'pending'");
    const flaggedIssues = Number(pendingRow.total);
    const [[voterRow]] = await db.execute('SELECT COUNT(*) AS total FROM voters');
    const [[votesRow]] = await db.execute('SELECT COUNT(*) AS total FROM votes');
    const [[activeRow]] = await db.execute("SELECT COUNT(*) AS total FROM elections WHERE status = 'active'");
    const [[candidateRow]] = await db.execute('SELECT COUNT(*) AS total FROM candidates');

    const totalRegisteredVoters = Number(voterRow.total);
    const totalVotesCast = Number(votesRow.total);
    const activeElections = Number(activeRow.total);
    const totalCandidates = Number(candidateRow.total);
    const voterTurnout = totalRegisteredVoters > 0
      ? ((totalVotesCast / totalRegisteredVoters) * 100).toFixed(1) + '%'
      : '0%';

    let auditLogs = [];
    try {
      const [auditRows] = await db.execute(
        'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10'
      );
      if (auditRows.length) {
        auditLogs = auditRows.map((row) => ({
          id: row.id,
          action: row.action,
          createdAt: new Date(row.created_at).toISOString(),
        }));
      }
    } catch (auditErr) {
      console.log('Audit logs query failed:', auditErr.message);
      auditLogs = [];
    }

    res.json({
      totalRegisteredVoters,
      totalVotesCast,
      activeElections,
      totalCandidates,
      voterTurnout,
      flaggedIssues,
      auditLogs,
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await loadSettings();
    res.json(settings);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await saveSettings(req.body);
    res.json(settings);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};