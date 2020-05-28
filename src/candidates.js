/**
 * @typedef {({
 *  records : (any[][])
 * })} getCandidatesConfig
 * 
 * @param {getCandidatesConfig} config
 * @returns {Candidate[]}
 */
function getCandidates({
  records
} = config) {

  return records.map(record => {

    const [id, subscribed, email, state, status] = record;

    const [name] = email.split("@");

    const [
      first_name,
      last_name = ""
    ] = name.split(".");

    return ({
      id,
      first_name,
      last_name,
      email,
      state,
      status,
      subscribed,
      get name() {
        return `${this.first_name} ${this.last_name}`;
      }
    });
  });

}

/**
 * @typedef {({
 *  first_name : string,
 *  id : (string | number),
 *  last_name : string,
 *  name : string,
 *  email : string,
 *  state : (string | undefined),
 *  status : (string | undefined),
 *  subscribed : Date
 * })} Candidate
 * 
 * @param {number} row
 * @returns {Candidate}
 */
function getCandidateFromRow(row) {

  const sheet = SpreadsheetApp.getActiveSheet();

  const values = sheet.getRange(row, 1, 1, 7).getValues();

  return getCandidates({
    sheet, 
    records: values
  })[0];
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Date}
 */
function getcelldate(
  sheet
) {
  return new Date(sheet.getRange("A2").getValue());
}