import "server-only";
import { SignJWT, importPKCS8 } from "jose";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

// Deliberately not the `googleapis` SDK — that's a large dependency for
// one read-only call. A service-account JWT-bearer exchange (RFC 7523)
// plus a plain REST GET is ~30 lines and reuses `jose`, already a
// dependency for session tokens. One platform-level service account is
// enough for every tenant: each company shares "Viewer" on their own
// spreadsheet with that account's email, so no per-tenant credentials
// ever need to be stored in this database.
function getServiceAccountCreds() {
  const email = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  return { email, key: rawKey.replace(/\\n/g, "\n") };
}

export function isGoogleSheetsConfigured() {
  return !!getServiceAccountCreds();
}

async function getAccessToken() {
  const creds = getServiceAccountCreds();
  if (!creds) {
    const e = new Error("Google Sheets is not configured on this deployment — set GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL and GOOGLE_SHEETS_SERVICE_ACCOUNT_PRIVATE_KEY.");
    e.status = 400;
    throw e;
  }
  const privateKey = await importPKCS8(creds.key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(creds.email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await res.json();
  if (!res.ok) {
    const e = new Error(data.error_description || "Failed to authenticate with Google Sheets.");
    e.status = 502;
    throw e;
  }
  return data.access_token;
}

// Returns an array of plain objects keyed by the sheet's header row —
// mapping from spreadsheet column NAME (not position) to CRM field is
// resolved by the caller against lead_sync_sources.column_mapping.
export async function fetchSheetRows(spreadsheetId, sheetName) {
  const token = await getAccessToken();
  const range = encodeURIComponent(sheetName || "Sheet1");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    const e = new Error(data.error?.message || "Failed to read the spreadsheet — check the spreadsheet ID, sheet name, and that it's shared with the service account.");
    e.status = 502;
    throw e;
  }
  const [header, ...rows] = data.values || [];
  if (!header) return [];
  return rows.map((row) => Object.fromEntries(header.map((col, i) => [col, row[i] ?? ""])));
}
