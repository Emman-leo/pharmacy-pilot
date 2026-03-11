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
      .select('pharmacy_id, role')  // <-- also fetch role
      .eq('id', req.user.id)
      .single();

    const pharmacyId = profile?.pharmacy_id;
    const role = profile?.role || 'STAFF';
    
    // Cache role on req for rbacMiddleware to use
    req.userRole = role;
    req.userPharmacyId = pharmacyId;
    if (!pharmacyId) {
      // Super admin / unassigned user — no tier restrictions
      req.tier = 'pro';
      req.tierFeatures = TIER_FEATURES.pro;
      return next();
    }

    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('tier, subscription_status, trial_ends_at, current_period_end')
      .eq('id', pharmacyId)
      .single();

    const { subscription_status, trial_ends_at, current_period_end } = pharmacy || {};

    // Check if subscription is active
    const isActive = subscription_status === 'active' && 
      (!current_period_end || new Date(current_period_end) >= new Date());
    const isTrial = subscription_status === 'trial';
    const trialValid = isTrial && (!trial_ends_at || new Date(trial_ends_at) >= new Date());

    // Allow auth/user through regardless of subscription status
    // so users can log in and see an expired subscription screen
    const isAuthUserRoute = req.path === '/auth/user' || req.originalUrl?.includes('/auth/user');

    if (!isActive && !trialValid && !isAuthUserRoute) {
      return res.status(402).json({
        error: 'Your subscription has expired or been cancelled. Please contact support to reactivate.',
        subscription_status,
      });
    }

    const tier = pharmacy?.tier || 'starter';
    req.tier = tier;
    req.tierFeatures = TIER_FEATURES[tier] || TIER_FEATURES.starter;
    req.subscriptionStatus = subscription_status;
    next();
  } catch (err) {
    // Log with enough context for diagnosis
    console.error('[tierMiddleware] Failed to resolve tier for user', req.user?.id, err.message);
    return res.status(503).json({
      error: 'Unable to verify your subscription tier. Please try again.',
    });
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
