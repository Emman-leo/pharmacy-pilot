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
      .select('pharmacy_id, role, is_super_admin')
      .eq('id', req.user.id)
      .single();

    const pharmacyId   = profile?.pharmacy_id;
    const isSuperAdmin = profile?.is_super_admin || false;

    req.userRole       = profile?.role || 'STAFF';
    req.userPharmacyId = pharmacyId;
    req.isSuperAdmin   = isSuperAdmin;

    // Super admin — full access, no restrictions
    if (isSuperAdmin) {
      req.tier         = 'pro';
      req.tierFeatures = TIER_FEATURES.pro;
      return next();
    }

    // No pharmacy and not super admin — onboarding incomplete
    if (!pharmacyId) {
      const isExemptRoute =
        req.originalUrl?.includes('/auth/user') ||
        req.originalUrl?.includes('/onboarding/complete');

      if (isExemptRoute) return next();

      return res.status(403).json({
        error:            'Account setup incomplete. Please complete onboarding.',
        needs_onboarding: true,
      });
    }

    // Normal pharmacy user — resolve tier and subscription
    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('tier, subscription_status, trial_ends_at, current_period_end')
      .eq('id', pharmacyId)
      .single();

    const { subscription_status, current_period_end, trial_ends_at } = pharmacy || {};

    // Check trial
    const trialActive = subscription_status === 'trial' &&
      trial_ends_at && new Date(trial_ends_at) >= new Date();

    // Check active subscription
    const subActive = subscription_status === 'active' &&
      (!current_period_end || new Date(current_period_end) >= new Date());

    const isExemptRoute =
      req.originalUrl?.includes('/auth/user') ||
      req.originalUrl?.includes('/payments/initialize') ||
      req.originalUrl?.includes('/onboarding/complete');

    // Expired subscription — mark as past_due
    if (!trialActive && !subActive && !isExemptRoute) {
      if (current_period_end && new Date(current_period_end) < new Date()) {
        await supabaseAdmin
          .from('pharmacies')
          .update({ subscription_status: 'past_due' })
          .eq('id', pharmacyId)
          .catch(err => console.error('[tierMiddleware] past_due update failed', err));
      }
      return res.status(402).json({
        error:               'Your subscription has expired. Please renew to continue.',
        subscription_status: 'past_due',
      });
    }

    const tier         = pharmacy?.tier || 'starter';
    req.tier           = tier;
    req.tierFeatures   = TIER_FEATURES[tier] || TIER_FEATURES.starter;
    req.subscriptionStatus = subscription_status;
    next();
  } catch (err) {
    console.error('[tierMiddleware] error', req.user?.id, err.message);
    return res.status(503).json({
      error: 'Unable to verify your subscription. Please try again.',
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
