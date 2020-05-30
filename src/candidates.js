/**
 * @typedef {({
 *  startRow : (number | undefined),
 *  sheet : (GoogleAppsScript.Spreadsheet.Sheet | undefined),
 *  records : (any[][])
 * })} getCandidatesConfig
 * 
 * @param {getCandidatesConfig} config
 * @returns {Candidate[]}
 */
function getCandidates({
  sheet,
  records,
  startRow
} = config) {

  const uuids = [];

  const candidates = records.map(record => {

    const [
      id,
      subscribed,
      email,
      state,
      status
    ] = record;
    
    getUuidUntilUnique({ id, uuids });

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

  const UUID_COLUMN = 1;
  const uuidRange = sheet.getRange(startRow, UUID_COLUMN, records.length, 1);
  uuidRange.setValues(uuids.map(id => [id]));

  return candidates;
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
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} startRow
 * @returns {Candidate}
 */
function getCandidateFromRow(sheet, startRow) {

  const records = sheet.getRange(startRow, 1, 1, 7).getValues();

  return getCandidates({
    startRow,
    sheet,
    records
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