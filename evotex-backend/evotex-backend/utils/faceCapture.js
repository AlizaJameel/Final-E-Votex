const FACE_HASH_MAX_DISTANCE = 14;

function hammingDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
  }
  return dist;
}

function facesMatch(storedHash, liveHash) {
  return hammingDistance(storedHash, liveHash) <= FACE_HASH_MAX_DISTANCE;
}

module.exports = { hammingDistance, facesMatch, FACE_HASH_MAX_DISTANCE };
