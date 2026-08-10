import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createLead, findDuplicateLead } from "@/lib/modules/crm/actions/leads";
import { fetchSheetRows, isGoogleSheetsConfigured } from "@/lib/integrations/googleSheets";

export async function listSyncSources(session) {
  const [rows] = await pool.query(
    `SELECT s.*, ls.name AS lead_source_name, sv.name AS service_name, u.name AS assignee_name
     FROM lead_sync_sources s
     LEFT JOIN lead_sources ls ON ls.id = s.default_lead_source_id
     LEFT JOIN services sv ON sv.id = s.default_service_id
     LEFT JOIN users u ON u.id = s.default_assigned_to
     WHERE s.company_id = ? AND s.is_deleted = 0 ORDER BY s.created_at DESC`,
    [session.company_id]
  );
  return rows.map((r) => ({ ...r, column_mapping: JSON.parse(r.column_mapping || "{}"), configured: isGoogleSheetsConfigured() }));
}

export async function getSyncSource(session, id) {
  const [[row]] = await pool.query(`SELECT * FROM lead_sync_sources WHERE id=? AND company_id=? AND is_deleted=0`, [id, session.company_id]);
  if (!row) return null;
  return { ...row, column_mapping: JSON.parse(row.column_mapping || "{}") };
}

export async function createSyncSource(session, data, createdBy) {
  if (!data.name || !data.spreadsheetId) { const e = new Error("Name and Spreadsheet ID are required."); e.status = 400; throw e; }
  const [result] = await pool.query(
    `INSERT INTO lead_sync_sources (company_id, type, name, spreadsheet_id, sheet_name, column_mapping, default_lead_source_id, default_service_id, default_assigned_to, frequency_minutes, status, created_by, updated_by)
     VALUES (?, 'google_sheet', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.company_id, data.name, data.spreadsheetId, data.sheetName || "Sheet1", JSON.stringify(data.columnMapping || {}),
      data.defaultLeadSourceId || null, data.defaultServiceId || null, data.defaultAssignedTo || null,
      data.frequencyMinutes || 30, data.enabled ? "enabled" : "disabled", createdBy, createdBy,
    ]
  );
  await logActivity({ userId: createdBy, module: "leads", action: "sync_source_create", entityType: "lead_sync_source", entityId: result.insertId, companyId: session.company_id, description: `Created lead sync source "${data.name}"` });
  return result.insertId;
}

export async function updateSyncSource(session, id, data, updatedBy) {
  await pool.query(
    `UPDATE lead_sync_sources SET name=?, spreadsheet_id=?, sheet_name=?, column_mapping=?, default_lead_source_id=?, default_service_id=?, default_assigned_to=?, frequency_minutes=?, status=?, updated_by=?
     WHERE id=? AND company_id=? AND is_deleted=0`,
    [
      data.name, data.spreadsheetId, data.sheetName || "Sheet1", JSON.stringify(data.columnMapping || {}),
      data.defaultLeadSourceId || null, data.defaultServiceId || null, data.defaultAssignedTo || null,
      data.frequencyMinutes || 30, data.enabled ? "enabled" : "disabled", updatedBy, id, session.company_id,
    ]
  );
  await logActivity({ userId: updatedBy, module: "leads", action: "sync_source_update", entityType: "lead_sync_source", entityId: id, companyId: session.company_id, description: `Updated lead sync source #${id}` });
}

export async function deleteSyncSource(session, id, deletedBy) {
  await pool.query(`UPDATE lead_sync_sources SET is_deleted=1, status='disabled' WHERE id=? AND company_id=?`, [id, session.company_id]);
  await logActivity({ userId: deletedBy, module: "leads", action: "sync_source_delete", entityType: "lead_sync_source", entityId: id, companyId: session.company_id, description: `Deleted lead sync source #${id}` });
}

export async function listSyncRuns(session, sourceId, limit = 20) {
  const [[source]] = await pool.query(`SELECT id FROM lead_sync_sources WHERE id=? AND company_id=?`, [sourceId, session.company_id]);
  if (!source) { const e = new Error("Sync source not found."); e.status = 404; throw e; }
  const [rows] = await pool.query(`SELECT * FROM lead_sync_runs WHERE sync_source_id=? ORDER BY started_at DESC LIMIT ?`, [sourceId, limit]);
  return rows.map((r) => ({ ...r, error_report: r.error_report ? JSON.parse(r.error_report) : null }));
}

/**
 * The real sync pipeline: fetch -> validate -> idempotency check against
 * lead_sync_records (sync_source_id, external_lead_id) -> duplicate-lead
 * check against the same company -> create or match -> record attribution.
 * Safe to call repeatedly: rows already in lead_sync_records are counted
 * as duplicates and never reinserted. No session/browser state is
 * involved, so this is exactly what the cron endpoint and the "Sync Now"
 * button both call — there is no separate "fake" scheduled path.
 */
export async function runSync(source) {
  const startedAt = new Date();
  let fetched = 0, created = 0, duplicates = 0, failed = 0;
  const errors = [];
  const pseudoSession = { company_id: source.company_id };

  try {
    if (!isGoogleSheetsConfigured()) {
      const e = new Error("Google Sheets is not configured on this deployment (missing service account credentials)."); e.status = 400; throw e;
    }
    const rows = await fetchSheetRows(source.spreadsheet_id, source.sheet_name);
    fetched = rows.length;
    const mapping = typeof source.column_mapping === "string" ? JSON.parse(source.column_mapping) : source.column_mapping;

    for (const row of rows) {
      try {
        const externalId = mapping.external_lead_id ? row[mapping.external_lead_id] : null;
        if (!externalId) { failed++; errors.push({ row, reason: "Row has no value in the mapped external_lead_id column." }); continue; }

        const [[existingRecord]] = await pool.query(
          `SELECT id FROM lead_sync_records WHERE sync_source_id=? AND external_lead_id=?`,
          [source.id, externalId]
        );
        if (existingRecord) { duplicates++; continue; }

        const name = mapping.name ? row[mapping.name] : null;
        const phone = mapping.phone ? row[mapping.phone] : null;
        const email = mapping.email ? row[mapping.email] : null;
        if (!name || !phone) { failed++; errors.push({ row, reason: "Missing required name/phone after column mapping." }); continue; }

        const dup = await findDuplicateLead(source.company_id, { phone, email });
        let leadId;
        if (dup) {
          leadId = dup.id;
        } else {
          leadId = await createLead(pseudoSession, {
            name, phone, email: email || null,
            country: mapping.country ? row[mapping.country] : null,
            leadSourceId: source.default_lead_source_id,
            serviceId: source.default_service_id,
            campaign: mapping.campaign ? row[mapping.campaign] : null,
          }, null);
          created++;
          if (source.default_assigned_to) {
            await pool.query(`UPDATE leads SET assigned_to=?, status='Assigned' WHERE id=?`, [source.default_assigned_to, leadId]);
          }
        }

        await pool.query(
          `INSERT INTO lead_sync_records (sync_source_id, company_id, external_lead_id, lead_id, platform, campaign, ad_set, ad, raw_data)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            source.id, source.company_id, externalId, leadId,
            mapping.platform ? row[mapping.platform] : null,
            mapping.campaign ? row[mapping.campaign] : null,
            mapping.ad_set ? row[mapping.ad_set] : null,
            mapping.ad ? row[mapping.ad] : null,
            JSON.stringify(row),
          ]
        );
      } catch (rowErr) {
        failed++; errors.push({ row, reason: rowErr.message });
      }
    }

    const status = failed === 0 ? "success" : (created + duplicates > 0 ? "partial" : "failed");
    await recordRun(source, { status, fetched, created, duplicates, failed, errors, startedAt });
    return { status, fetched, created, duplicates, failed };
  } catch (err) {
    await recordRun(source, { status: "failed", fetched, created, duplicates, failed, errors: [...errors, { reason: err.message }], startedAt });
    throw err;
  }
}

async function recordRun(source, { status, fetched, created, duplicates, failed, errors, startedAt }) {
  await pool.query(
    `INSERT INTO lead_sync_runs (sync_source_id, company_id, status, fetched_count, created_count, duplicate_count, failed_count, error_report, started_at, finished_at, duration_ms)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [source.id, source.company_id, status, fetched, created, duplicates, failed, errors.length ? JSON.stringify(errors.slice(0, 50)) : null, startedAt, new Date(), Date.now() - startedAt.getTime()]
  );
  await pool.query(`UPDATE lead_sync_sources SET last_sync_at=NOW(), last_sync_status=? WHERE id=?`, [status, source.id]);
  await logActivity({
    userId: null, module: "leads", action: status === "failed" ? "sync_failed" : "sync_completed", entityType: "lead_sync_source", entityId: source.id,
    companyId: source.company_id, description: `Sync "${source.name}": ${created} created, ${duplicates} duplicate, ${failed} failed of ${fetched} fetched`,
  });
}
