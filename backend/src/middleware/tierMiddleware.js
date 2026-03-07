import { supabaseAdmin } from '../utils/db.js';

// Tier feature matrix
export const TIER_FEATURES = {
  starter: {
    maxStaff:       2,
    advancedReports: false,
    csvExport:       false,
    auditLog:        false,
    accounting:      false,
  },
  growth: {
    maxStaff:       5,
    advancedReports: true,
    csvExport:       true,
    auditLog:        true,
    accounting:      false,
  },
  pro: {
    maxStaff:       Infinity,
    advancedReports: true,
    csvExport:       true,
    auditLog:        true,
    accounting:      true,
  },
};

/**
 * Attaches req.tier and req.tierFeatures to every authenticated request.
 * Must run after authMiddleware.
 */
export async function tierMiddleware(req, res, next) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', req.user.id)
      .single();

    const pharmacyId = profile?.pharmacy_id;
    if (!pharmacyId) {
      // Super admin / unassigned user — no tier restrictions
      req.tier = 'pro';
      req.tierFeatures = TIER_FEATURES.pro;
      return next();
    }

    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('tier')
      .eq('id', pharmacyId)
      .single();

    const tier = pharmacy?.tier || 'starter';
    req.tier = tier;
    req.tierFeatures = TIER_FEATURES[tier] || TIER_FEATURES.starter;
    next();
  } catch (err) {
    // Fail open — don't block the request, default to starter restrictions
    req.tier = 'starter';
    req.tierFeatures = TIER_FEATURES.starter;
    next();
  }
}

/**
 * Middleware factory — blocks the request if the pharmacy's tier
 * doesn't have the required feature.
 * Usage: requireFeature('auditLog')
 */
export function requireFeature(feature) {
  return (req, res, next) => {
    if (!req.tierFeatures?.[feature]) {
      return res.status(403).json({
        error: `This feature is not available on your current plan.`,
        feature,
        tier: req.tier,
      });
    }
    next();
  };
}
