import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

// Countries/States/Cities are treated as shared reference data (no
// company_id column on the entity itself) — same convention across
// every prior turn in this project. The activity log entry still needs
// a real company_id (NOT NULL, no fallback) — that's the acting user's
// own company, passed in explicitly by every caller below, not the
// (nonexistent) company of the global entity being changed.
export async function listCountries() { const [rows] = await pool.query(`SELECT * FROM countries WHERE is_deleted=0 ORDER BY name`); return rows; }
export async function createCountry({ name, isoCode }, createdBy, companyId) {
  const [result] = await pool.query(`INSERT INTO countries (name, iso_code, created_by, updated_by) VALUES (?,?,?,?)`, [name, isoCode || null, createdBy, createdBy]);
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "country", entityId: result.insertId, description: `Created country ${name}`, companyId });
  return result.insertId;
}
export async function listStates(countryId) { const [rows] = await pool.query(`SELECT * FROM states WHERE country_id=? AND is_deleted=0 ORDER BY name`, [countryId]); return rows; }
export async function createState({ countryId, name }, createdBy, companyId) {
  const [result] = await pool.query(`INSERT INTO states (country_id, name, created_by) VALUES (?,?,?)`, [countryId, name, createdBy]);
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "state", entityId: result.insertId, description: `Created state ${name}`, companyId });
  return result.insertId;
}
export async function listCities(stateId) { const [rows] = await pool.query(`SELECT * FROM cities WHERE state_id=? AND is_deleted=0 ORDER BY name`, [stateId]); return rows; }
export async function createCity({ stateId, name }, createdBy, companyId) {
  const [result] = await pool.query(`INSERT INTO cities (state_id, name, created_by) VALUES (?,?,?)`, [stateId, name, createdBy]);
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "city", entityId: result.insertId, description: `Created city ${name}`, companyId });
  return result.insertId;
}
export async function deleteGeoRecord(table, id, deletedBy, companyId) {
  if (!["countries", "states", "cities"].includes(table)) { const e = new Error("Invalid table."); e.status = 400; throw e; }
  await pool.query(`UPDATE ${table} SET is_deleted=1 WHERE id=?`, [id]);
  await logActivity({ userId: deletedBy, module: "settings", action: "delete", entityType: table.slice(0, -1), entityId: id, description: `Deleted ${table} #${id}`, companyId });
}