import { useAuth } from '../contexts/AuthContext';

const FEATURES = {
  starter: {
    advancedReports: false,
    csvExport:        false,
    auditLog:         false,
    accounting:       false,
    maxStaff:         2,
  },
  growth: {
    advancedReports: true,
    csvExport:        true,
    auditLog:         true,
    accounting:       false,
    maxStaff:         5,
  },
  pro: {
    advancedReports: true,
    csvExport:        true,
    auditLog:         true,
    accounting:       true,
    maxStaff:         null, // unlimited
  },
};

export function useTier() {
  const { tier } = useAuth();
  const features = FEATURES[tier] || FEATURES.starter;

  return {
    tier,
    features,
    can: (feature) => !!features[feature],
  };
}
