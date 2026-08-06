import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listCountries() {
  const [rows] = await pool.query(`SELECT * FROM countries WHERE is_deleted = 0 ORDER BY name ASC`);
  return rows;
}

export async function createCountry({ name, isoCode }, createdBy) {
  const [result] = await pool.query(`INSERT INTO countries (name, iso_code, created_by, updated_by) VALUES (?, ?, ?, ?)`, [name, isoCode || null, createdBy, createdBy]);
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "country", entityId: result.insertId, description: `Created country ${name}` });
  return result.insertId;
}

export async function listStates(countryId) {
  const [rows] = await pool.query(`SELECT * FROM states WHERE country_id = ? AND is_deleted = 0 ORDER BY name ASC`, [countryId]);
  return rows;
}

export async function createState({ countryId, name }, createdBy) {
  const [result] = await pool.query(`INSERT INTO states (country_id, name, created_by) VALUES (?, ?, ?)`, [countryId, name, createdBy]);
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "state", entityId: result.insertId, description: `Created state ${name}` });
  return result.insertId;
}

export async function listCities(stateId) {
  const [rows] = await pool.query(`SELECT * FROM cities WHERE state_id = ? AND is_deleted = 0 ORDER BY name ASC`, [stateId]);
  return rows;
}

export async function createCity({ stateId, name }, createdBy) {
  const [result] = await pool.query(`INSERT INTO cities (state_id, name, created_by) VALUES (?, ?, ?)`, [stateId, name, createdBy]);
  await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "city", entityId: result.insertId, description: `Created city ${name}` });
  return result.insertId;
}

export async function deleteGeoRecord(table, id, deletedBy) {
  if (!["countries", "states", "cities"].includes(table)) {
    const err = new Error("Invalid geography table.");
    err.status = 400;
    throw err;
  }
  await pool.query(`UPDATE ${table} SET is_deleted = 1 WHERE id = ?`, [id]);
  await logActivity({ userId: deletedBy, module: "settings", action: "delete", entityType: table.slice(0, -1), entityId: id, description: `Deleted ${table} #${id}` });
}