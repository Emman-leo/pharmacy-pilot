/**
 * Alert & Safety Service
 * Validates prescriptions (dosage, interactions), flags controlled drugs.
 */
export const alertService = {
  async validatePrescription(supabase, prescribedDrugs, patient = {}) {
    const issues = [];
    let requiresApproval = false;

    const drugIds = prescribedDrugs.map((p) => p.drug_id);
    if (drugIds.length === 0) return { valid: true, issues: [], requiresApproval: false };

    const { data: drugs } = await supabase
      .from('drugs')
      .select('*')
      .in('id', drugIds);

    const drugMap = (drugs || []).reduce((m, d) => ({ ...m, [d.id]: d }), {});

    for (const d of prescribedDrugs) {
      const drug = drugMap[d.drug_id];
      if (!drug) {
        issues.push({ drug_id: d.drug_id, message: 'Drug not found' });
        continue;
      }
      if (drug.controlled_drug) requiresApproval = true;

      if (patient.age != null || patient.weight != null) {
        const limitCheck = await this.checkDosageLimits(supabase, drug.id, d, patient);
        if (limitCheck) issues.push(limitCheck);
      }
    }

    for (let i = 0; i < drugIds.length; i++) {
      for (let j = i + 1; j < drugIds.length; j++) {
        const interaction = await this.checkInteraction(supabase, drugIds[i], drugIds[j]);
        if (interaction) {
          issues.push(interaction);
          if (interaction.severity === 'severe') requiresApproval = true;
        }
      }
    }

    const valid = issues.filter((x) => x.blocking).length === 0;
    return { valid, issues, requiresApproval };
  },

  async checkDosageLimits(supabase, drugId, prescribed, patient) {
    const { data: limits } = await supabase
      .from('dosage_limits')
      .select('*')
      .eq('drug_id', drugId);

    for (const l of limits || []) {
      if (patient.age != null) {
        if (l.min_age_years != null && patient.age < l.min_age_years) continue;
        if (l.max_age_years != null && patient.age > l.max_age_years) continue;
      }
      if (patient.weight != null && l.min_weight_kg != null && patient.weight < l.min_weight_kg) continue;

      const dailyDose = (prescribed.dosage_per_day ?? prescribed.daily_dose ?? 0) * (prescribed.duration_days ?? 1);
      if (l.max_daily_dose != null && dailyDose > l.max_daily_dose) {
        return {
          drug_id: drugId,
          message: `Exceeds max daily dose (${l.max_daily_dose})`,
          blocking: true,
        };
      }
    }
    return null;
  },

  async checkInteraction(supabase, drugId1, drugId2) {
    const id1 = drugId1 < drugId2 ? drugId1 : drugId2;
    const id2 = drugId1 < drugId2 ? drugId2 : drugId1;

    const { data } = await supabase
      .from('drug_interactions')
      .select('*')
      .eq('drug_id_1', id1)
      .eq('drug_id_2', id2)
      .single();

    if (!data) return null;
    return {
      drug_ids: [drugId1, drugId2],
      severity: data.severity,
      message: data.description || `Drug interaction: ${data.severity}`,
      blocking: data.severity === 'severe',
    };
  },
};
