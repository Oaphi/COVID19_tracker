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

var Benchmarker = class {

  /**
   * @summary ends benchmark
   * @returns {Benchmarker}
   */
  static end() {
    Benchmarker.ended = Date.now();
    Benchmarker.running = false;
    return Benchmarker;
  }

  /**
   * @summary starts benchmark
   * @returns {Benchmarker}
   */
  static start() {
    Benchmarker.reset();
    Benchmarker.started = Date.now();
    Benchmarker.running = true;
    return Benchmarker;
  }

  /**
   * @summary resets benchmark
   * @returns {Benchmarker}
   */
  static reset() {
    Benchmarker.started = 0;
    Benchmarker.ended = 0;
    return Benchmarker;
  }

  /**
   * @summary returns difference between start and end
   * @param {"milliseconds"|"seconds"|"minutes"} fraction 
   * @returns {number}
   */
  static took(fraction = "milliseconds") {
    const { fractions, started, ended } = Benchmarker;
    const divisor = fractions[fraction];
    return (ended - started) / divisor;
  }

};

Benchmarker.running = false;
Benchmarker.ended = 0;
Benchmarker.started = 0;
Benchmarker.fractions = {
  "milliseconds": 1,
  "seconds": 1000,
  "minutes": 60
};