// Results are served via GET /elections/:id/results in electionRoutes.
// This controller is reserved for future admin result-calculation endpoints.

exports.placeholder = (req, res) => {
  res.json({ message: 'Use GET /elections/:id/results for election results' });
};
