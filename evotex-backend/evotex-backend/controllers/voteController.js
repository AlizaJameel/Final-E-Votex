const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');
const { isValidCnic } = require('../utils/helpers');
const { insertAuditLog } = require('../utils/auditLog');
const { encryptCandidateId } = require('../utils/voteCrypto');

// Verification: CNIC + FINGERPRINT + FACE RECOGNITION are enforced before this
// runs (requireVoteSession middleware + Step 1 CNIC match below). The chosen
// candidate_id is stored encrypted (AES-256-GCM) with its IV in the `votes` row.

exports.castVote = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { electionId, candidateId, cnic } = req.body;
    const voterId = req.user.id;

    if (req.user.role !== 'voter') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!electionId || !candidateId || !cnic) {
      return res.status(400).json({ success: false, message: 'electionId, candidateId and cnic are required' });
    }

    if (!isValidCnic(cnic)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CNIC format. Use XXXXX-XXXXXXX-X.',
      });
    }

    // Step 1 — CNIC verification: the submitted CNIC must match the one
    // registered to this voter. CNIC is immutable after registration.
    const [voterRows] = await connection.execute('SELECT cnic FROM voters WHERE id = ?', [voterId]);
    if (!voterRows.length) {
      return res.status(404).json({ success: false, message: 'Voter not found' });
    }
    const registeredCnic = voterRows[0].cnic;
    if (!registeredCnic) {
      return res.status(403).json({
        success: false,
        message: 'No CNIC on file for this account. Please contact the administrator.',
      });
    }
    if (registeredCnic !== cnic) {
      return res.status(403).json({ success: false, message: 'CNIC does not match registered CNIC' });
    }

    const [electionRows] = await connection.execute('SELECT * FROM elections WHERE id = ?', [electionId]);
    if (!electionRows.length) {
      return res.status(400).json({ success: false, message: 'Election is not active' });
    }

    const election = electionRows[0];
    const now = Date.now();
    const start = new Date(election.start_date).getTime();
    const end = new Date(election.end_date).getTime();
    const isActive = now >= start && now <= end;

    if (!isActive) {
      return res.status(400).json({ success: false, message: 'Election is not active' });
    }

    const [existingVote] = await connection.execute(
      'SELECT id FROM votes WHERE voter_id = ? AND election_id = ?',
      [voterId, electionId]
    );
    if (existingVote.length) {
      return res.status(409).json({
        success: false,
        message: 'This CNIC has already been used to vote in this election.',
      });
    }

    const [candidateRows] = await connection.execute(
      'SELECT id FROM candidates WHERE id = ? AND election_id = ?',
      [candidateId, electionId]
    );
    if (!candidateRows.length) {
      return res.status(400).json({ success: false, message: 'Candidate not found' });
    }

    await connection.beginTransaction();

    const { encrypted, iv } = encryptCandidateId(candidateId);
    await connection.execute(
      'INSERT INTO votes (voter_id, election_id, candidate_id, iv, cnic) VALUES (?, ?, ?, ?, ?)',
      [voterId, electionId, encrypted, iv, cnic]
    );
    await connection.execute(
      'UPDATE candidates SET vote_count = vote_count + 1 WHERE id = ?',
      [candidateId]
    );
    await connection.execute(
      'UPDATE elections SET vote_count = vote_count + 1 WHERE id = ?',
      [electionId]
    );
    await connection.execute(
      'UPDATE voters SET votes_cast = votes_cast + 1 WHERE id = ?',
      [voterId]
    );

    await connection.execute(
      `INSERT INTO notifications (voter_id, recipient_role, type, category, title, message, read_status, read_flag)
       VALUES (?, 'voter', ?, ?, ?, ?, 0, 0)`,
      [
        voterId,
        'vote',
        'vote',
        'Vote recorded',
        `Your vote has been recorded for ${election.title}.`,
      ]
    );

    await insertAuditLog(`Vote cast in election "${election.title}"`, connection);

    await connection.commit();

    const [userRows] = await db.execute('SELECT email FROM voters WHERE id = ?', [voterId]);
    if (userRows.length) {
      sendEmail({
        to: userRows[0].email,
        subject: 'Vote Confirmation — E-Votex',
        html: `<p>Your vote has been recorded for <strong>${election.title}</strong>.</p>`,
      });
    }

    res.status(201).json({ message: 'Vote cast successfully' });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This CNIC has already been used to vote in this election.',
      });
    }
    console.error('Cast vote error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
};
