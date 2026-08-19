function requireAuth(req, res, next) {
  if (req.session && (req.session.employeeId || req.session.userId)) {
    if (!req.session.employeeId && req.session.userId) {
      req.session.employeeId = req.session.userId;
    }
    return next();
  }
  console.log("Auth check failed - session:", req.session);
  return res.status(401).json({ error: "Not signed in. Please log in again." });
}

module.exports = { requireAuth };
