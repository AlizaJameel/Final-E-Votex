const CNIC_REGEX = /^\d{5}-\d{7}-\d$/;

function computeStatus(startDate, endDate) {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

function formatCandidate(row) {
  return {
    id: row.id,
    name: row.name,
    party: row.party || '',
    partyCode: row.party_code || '',
    photoUrl: row.photo_url || '',
    symbol: row.symbol || '',
    voteCount: row.vote_count || 0,
  };
}

function formatElection(row, { includeCandidates = false, candidates = [] } = {}) {
  const election = {
    id: row.id,
    title: row.title,
    description: row.description || '',
    startDate: new Date(row.start_date).toISOString(),
    endDate: new Date(row.end_date).toISOString(),
    status: computeStatus(row.start_date, row.end_date),
    voteCount: Number(row.vote_count) || 0,
  };

  if (row.candidate_count !== undefined) {
    election.candidateCount = Number(row.candidate_count) || 0;
  }

  if (includeCandidates) {
    election.candidates = candidates;
  }

  return election;
}

function formatUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    cnic: row.cnic || '',
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

function formatVoter(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    cnic: row.cnic || '',
    phone: row.phone || '',
    status: row.status,
    biometric: Boolean(row.biometric),
    votesCast: row.votes_cast || 0,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

function formatNotification(row) {
  return {
    id: row.id,
    type: row.type || row.category || 'system',
    title: row.title,
    message: row.message,
    read: Boolean(row.read_status ?? row.read_flag),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function formatAdminNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: Boolean(row.read_status),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function isValidCnic(cnic) {
  return CNIC_REGEX.test(cnic);
}

module.exports = {
  CNIC_REGEX,
  computeStatus,
  formatCandidate,
  formatElection,
  formatUser,
  formatVoter,
  formatNotification,
  formatAdminNotification,
  isValidCnic,
};
