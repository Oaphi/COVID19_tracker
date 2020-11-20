/**
 * @summary wrapper around batch updates to Sheets API
 */
const setValuesAPI = (
  range: GoogleAppsScript.Spreadsheet.Range,
  values: (string | number | Date)[][],
  id = SpreadsheetApp.getActiveSpreadsheet().getId()
): boolean => {
  const req: GoogleAppsScript.Sheets.Schema.BatchUpdateValuesRequest = {
    includeValuesInResponse: false,
    valueInputOption: "RAW",
    data: [
      {
        range: fullA1(range),
        values,
        majorDimension: "ROWS", //optional, but specified for readability
      },
    ],
  };

  const token = ScriptApp.getOAuthToken();

  const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    muteHttpExceptions: true,
    payload: JSON.stringify(req),
    contentType: "application/json",
    headers: {
        Authorization: `Bearer ${token}`
    }
  };

  const version = "v4";

  const res = UrlFetchApp.fetch(
    `https://sheets.googleapis.com/${version}/spreadsheets/${id}/values:batchUpdate`,
    params
  );

  return res.getResponseCode() === 200;
};
