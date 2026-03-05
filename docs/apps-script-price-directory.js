/**
 * Google Apps Script: Price directory → JSON
 *
 * Paste this into your Google Sheet:
 *   Extensions → Apps Script → replace Code.gs with this code
 *
 * 1. Ensure your sheet has a header row and data rows.
 * 2. Deploy: Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 3. Copy the "Web app" URL (ends with /exec).
 * 4. In your app: create .env with:
 *      VITE_SHEETS_APP_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
 *
 * No API keys or credentials go in your repo—only the public URL.
 */

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  const output = ContentService.createTextOutput(JSON.stringify({ data: data }))
    .setMimeType(ContentService.MimeType.JSON);

  return output;
}
