import { supabaseAdmin } from '../utils/db.js';
import { alertService } from '../services/alertService.js';
import { recordAuditEvent } from '../utils/auditLogger.js';

export async function create(req, res) {
  const { patient_name, patient_age, patient_weight, doctor_name, prescribed_drugs, notes } = req.body || {};
  if (!patient_name || !doctor_name || !Array.isArray(prescribed_drugs) || prescribed_drugs.length === 0) {
    return res.status(400).json({ error: 'patient_name, doctor_name, prescribed_drugs required' });
  }
  try {
    const profile = await getProfile(req);
    const pharmacy_id = profile?.pharmacy_id || null;

    const validation = await alertService.validatePrescription(req.supabase, prescribed_drugs, {
      age: patient_age,
      weight: patient_weight,
    });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Prescription validation failed',
        issues: validation.issues,
      });
    }

    const { data, error } = await req.supabase
      .from('prescriptions')
      .insert({
        pharmacy_id,
        patient_name,
        patient_age: patient_age || null,
        patient_weight: patient_weight || null,
        doctor_name,
        prescribed_drugs,
        notes: notes || null,
        status: validation.requiresApproval ? 'PENDING' : 'APPROVED',
      })
      .select()
      .single();

    if (error) throw error;

    await recordAuditEvent(req, {
      action: 'CREATE',
      resource: 'prescription',
      resourceId: data.id,
      details: {
        patient_name: data.patient_name,
        doctor_name: data.doctor_name,
        status: data.status,
      },
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create prescription' });
  }
}

export async function list(req, res) {
  const { status, limit = 50 } = req.query;
  try {
    let q = req.supabase.from('prescriptions').select('*').order('created_at', { ascending: false }).limit(parseInt(limit, 10));
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list prescriptions' });
  }
}

export async function getPending(req, res) {
  try {
    const { data, error } = await req.supabase
      .from('prescriptions')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch pending prescriptions' });
  }
}

export async function approve(req, res) {
  const { id } = req.params;
  try {
    const { data, error } = await req.supabase
      .from('prescriptions')
      .update({
        status: 'APPROVED',
        approved_by: req.user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Prescription not found' });

    await recordAuditEvent(req, {
      action: 'APPROVE',
      resource: 'prescription',
      resourceId: data.id,
      details: {
        approved_by: data.approved_by,
        approved_at: data.approved_at,
      },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to approve' });
  }
}

export async function reject(req, res) {
  const { id } = req.params;
  const { reason } = req.body || {};
  try {
    const { data, error } = await req.supabase
      .from('prescriptions')
      .update({
        status: 'REJECTED',
        approved_by: req.user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Prescription not found' });

    await recordAuditEvent(req, {
      action: 'REJECT',
      resource: 'prescription',
      resourceId: data.id,
      details: {
        approved_by: data.approved_by,
        approved_at: data.approved_at,
        rejection_reason: data.rejection_reason,
      },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to reject' });
  }
}

async function getProfile(req) {
  const { data } = await supabaseAdmin.from('profiles').select('pharmacy_id').eq('id', req.user.id).single();
  return data;
}
