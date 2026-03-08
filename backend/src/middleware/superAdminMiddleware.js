// Blocks anyone who has a pharmacy_id assigned.
// Super-admins are identified by pharmacy_id being NULL.
export function requireSuperAdmin(req, res, next) {
  // req.userPharmacyId is set by tierMiddleware
  if (req.userPharmacyId !== null && req.userPharmacyId !== undefined) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}
