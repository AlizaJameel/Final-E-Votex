const db = require('../config/db');
const { formatElection, formatCandidate } = require('../utils/helpers');

async function getCandidatesForElection(electionId) {
  const [rows] = await db.execute(
    'SELECT * FROM candidates WHERE election_id = ? ORDER BY id',
    [electionId]
  );
  return rows.map(formatCandidate);
}

async function getElectionById(id, { includeCandidates = false } = {}) {
  const [rows] = await db.execute(
    `SELECT e.*,
            COUNT(c.id) AS candidate_count,
            (SELECT COUNT(*) FROM votes WHERE election_id = e.id) AS vote_count
     FROM elections e
     LEFT JOIN candidates c ON c.election_id = e.id
     WHERE e.id = ?
     GROUP BY e.id`,
    [id]
  );
  if (!rows.length) return null;

  const election = rows[0];
  if (includeCandidates) {
    const candidates = await getCandidatesForElection(id);
    return formatElection(election, { includeCandidates: true, candidates });
  }
  return formatElection(election);
}

exports.getAllElections = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT e.*,
             COUNT(c.id) AS candidate_count,
             (SELECT COUNT(*) FROM votes WHERE election_id = e.id) AS voteCount
      FROM elections e
      LEFT JOIN candidates c ON c.election_id = e.id
      GROUP BY e.id
      ORDER BY e.start_date DESC
    `);

    const elections = rows.map((row) =>
      formatElection({ ...row, vote_count: row.voteCount })
    );
    res.json(elections);
  } catch (err) {
    console.error('Get elections error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getElectionById = async (req, res) => {
  try {
    const election = await getElectionById(req.params.id, { includeCandidates: true });
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }
    res.json(election);
  } catch (err) {
    console.error('Get election error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getElectionResults = async (req, res) => {
  try {
    const electionId = req.params.id;

    const [electionRows] = await db.execute(
      `SELECT e.*,
              COUNT(c.id) AS candidate_count,
              (SELECT COUNT(*) FROM votes WHERE election_id = e.id) AS vote_count
       FROM elections e
       LEFT JOIN candidates c ON c.election_id = e.id
       WHERE e.id = ?
       GROUP BY e.id`,
      [electionId]
    );
    if (!electionRows.length) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    const [candidateRows] = await db.execute(
      'SELECT * FROM candidates WHERE election_id = ? ORDER BY id',
      [electionId]
    );

    // candidate_id in `votes` is encrypted (AES-256-GCM), so per-candidate
    // tallies come from the denormalized candidates.vote_count counter that
    // castVote increments — not from aggregating the votes table.
    const candidates = candidateRows.map((row) => formatCandidate(row));

    const [[votesRow]] = await db.execute(
      'SELECT COUNT(*) AS total FROM votes WHERE election_id = ?',
      [electionId]
    );
    const totalVotes = Number(votesRow.total);

    const [[votersRow]] = await db.execute('SELECT COUNT(*) AS total FROM voters');
    const totalRegisteredVoters = Number(votersRow.total);

    const voterTurnout = totalRegisteredVoters > 0
      ? ((totalVotes / totalRegisteredVoters) * 100).toFixed(1)
      : '0.0';

    const election = formatElection(
      { ...electionRows[0], vote_count: totalVotes },
      { includeCandidates: true, candidates }
    );

    res.json({
      ...election,
      totalVotes,
      turnout: Number(voterTurnout),
      voterTurnout,
      totalRegisteredVoters,
    });
  } catch (err) {
    console.error('Get results error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports.getElectionByIdHelper = getElectionById;
module.exports.getCandidatesForElection = getCandidatesForElection;
