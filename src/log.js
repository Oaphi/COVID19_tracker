//log module 1.1 by yyk@mail.ru

var LOG_LEVELS = [1, 2];
var LOG_LENGTH = 1000;
var LOGGING = true;

insert_matrix_to_sheet = function (matrix, sheet, start_row, start_column) {
  var range;
  if (matrix.length) {
    sheet.insertRows(start_row, matrix.length);
    if (start_column === undefined) { start_column = 1; }
    range = sheet.getRange(start_row, start_column, matrix.length, matrix[0].length);
    range.setValues(matrix);
  }
};

function log(string, level) {
  var sheet, matrix, last, level_in;
  if (!LOGGING) { return; }
  if (level !== undefined) {
    level_in = LOG_LEVELS.indexOf(level) > -1;
  }
  else { level_in = true; }
  if (!level_in) { return; }
  sheet = SpreadsheetApp.getActive().getSheetByName('log');
  matrix = [[new Date(), Session.getEffectiveUser(), string]];
  insert_matrix_to_sheet(matrix, sheet, 1);
  last = sheet.getLastRow();
  if (last >= LOG_LENGTH) { sheet.deleteRow(last); }
}

function level_off(level) {
  return LOG_LEVELS.indexOf(level) === -1;
}

function loggy(string, level) {
  var sheet, matrix, last, level_in;
  if (!LOGGING) { return; }
  if (level !== undefined) {
    level_in = LOG_LEVELS.indexOf(level) > -1;
  }
  else { level_in = true; }
  if (!level_in) { return; }
  sheet = SpreadsheetApp.getActive().getSheetByName('log');
  matrix = [[new Date(), Session.getEffectiveUser(), string]];
  ssa.insert_matrix(matrix, sheet, 1);
  last = sheet.getLastRow();
  if (last >= LOG_LENGTH) { sheet.deleteRow(last); }
  sheet.getRange(1, 1).activate().getValue();
}
