/**
 * Counts metric by N millions of people
 * @param {boolean} isTotalByCountry set to true when used as US total
 * @param {Date} date reference to current date cell
 * @param {(number|string)[][]} stateData reference to COVID19 sheet data
 * @param {string} statColumn column with metric data A1 reference
 * @param {number} periodEndOffset date range closest offset from now
 * @param {number} periodStartOffset date range closest offset from now
 * @param {number} comparedTo metric to compare to (e.g.) population
 * @return {number[][]}
 * @customfunction
 */
function perMillion(
  isTotalByCountry,
  stateData,
  statColumn,
  periodEndOffset = 0,
  periodStartOffset = 7,
  comparedTo = 1e6
) {
  try {
    const source = getRawData(isTotalByCountry);

    const {
      Covid19: { ColumnIndices },
    } = SheetIndices;

    const metricsColIdx = getIndexFromA1(statColumn);

    const dataSet = shrinkGrid({ source, top: 1 });

    const dateChunked = chunkify(dataSet, {
      size: isTotalByCountry ? 1 : 56,
    }).slice(periodEndOffset, periodStartOffset);

    return stateData.map((row, stateIndex) => {
      let change = 0;

      dateChunked.reduce((acc, curr) => {
        change +=
          acc[stateIndex][metricsColIdx] - curr[stateIndex][metricsColIdx];
        return curr;
      });

      const population = row[ColumnIndices.Population];
      const relativePopulation = population / comparedTo;
      return [change / relativePopulation];
    });
  } catch (error) {
    console.warn(`failed to count metric per million ${error}`);
    return stateData.map(() => ["N/A"]);
  }
}

/**
 * Returns percent of change over last week
 * @param {number[][]} dividends
 * @param {number[][]} divisors
 * @return {string}
 * @customfunction
 */
const getPercentGrid = (dividends, divisors) => {
  return dividends.map(([dividend], rowIdx) => {
    const [divisor] = divisors[rowIdx];
    return topercent((dividend - divisor) / (Math.abs(divisor) || 1));
  });
};

const percentToPrevious = (dividend, divisor) =>
  topercent((dividend - divisor) / (Math.abs(divisor) || 1));

/**
 * @typedef {{
 *  current : number,
 *  end : number,
 *  start : number
 * }} isBetweenConfig
 *
 * @param {isBetweenConfig}
 * @returns {boolean}
 */
const isTimestampBetween = ({ current, start, end }) =>
  current >= start && current <= end;

/**
 * @summary gets daily change of a stat (country total)
 * @param {Date} date reference to current date cell
 * @param {string} sheetName reference to column with per state statistics
 * @param {string} statColumn column with metric data A1 reference
 * @param {number} [size]
 * @return {number}
 * @customfunction
 */
const getCountryDailyIncrease = (date, sheetName, statColumn, size = 1) => {
  const end = date.valueOf();
  const start = end - 864e5;

  const metricsColIdx = getIndexFromA1(statColumn);

  try {
    const source = getOrInitSheet({ name: sheetName })
      .getDataRange()
      .getValues();

    const dataSet = shrinkGrid({
      source,
      top: 1,
      right: 8,
    }).filter(([dateCol]) =>
      isTimestampBetween({ current: datenumToValue(dateCol), end, start })
    );

    const chunked = chunkify(dataSet, { size });

    let totalDiff = 0;

    chunked.reduce((today, yesterday) => {
      today.forEach(
        (state, s) =>
          (totalDiff += state[metricsColIdx] - yesterday[s][metricsColIdx])
      );
      return yesterday;
    });

    return totalDiff;
  } catch (error) {
    console.warn(`failed to calc country daily increase ${error}`);
    return 0;
  }
};

/**
 * @summary gets daily change of a stat (by state)
 * @param {Date} date reference to current date cell
 * @param {string} sheetName reference to column with per state statistics
 * @param {string} statColumn column with metric data A1 reference
 * @param {number} [size]
 * @return {number[][]}
 * @customfunction
 */
const getStateDailyIncrease = (date, sheetName, statColumn, size = 56) => {
  const end = date.valueOf();
  const start = end - 864e5;

  const metricsColIdx = getIndexFromA1(statColumn);

  let totalDiff = [];

  try {
    const source = getOrInitSheet({ name: sheetName })
      .getDataRange()
      .getValues();

    const dataSet = shrinkGrid({
      source,
      top: 1,
      right: 8,
    }).filter(([dateCol]) =>
      isTimestampBetween({ current: datenumToValue(dateCol), end, start })
    );

    const chunked = chunkify(dataSet, { size });

    chunked.reduce((today, yesterday) => {
      today.forEach((state, s) => {
        totalDiff[s] =
          (totalDiff[s] || 0) +
          state[metricsColIdx] -
          yesterday[s][metricsColIdx];
      });
      return yesterday;
    });
  } catch (error) {
    console.warn(`failed to calc state daily increase ${error}`);
  }

  return totalDiff.map((el) => [el]);
};

/**
 * @summary ranks a range by first column
 * @param {number[][]} range
 * @param {(1|0)} [ascending]
 * @return {number[][]}
 * @customfunction
 */
const rankRange = (values, ascending = 0): number[][] => {
  try {
    const rows = values.slice().sort((a, b) => {
      const aParsed = parseFloat(a[0]);
      const bParsed = parseFloat(b[0]);
      return ascending ? aParsed - bParsed : bParsed - aParsed;
    });

    return values.map((row) => {
      return [rows.findIndex((r) => r[0] === row[0]) + 1];
    });
  } catch (error) {
    console.warn(`failed to rank column: ${error}`);
    return [[]];
  }
};

/**
 * @summary updates infections to tests ratio
 * @param {number} [daysAgo]
 * @return {number[][]}
 * @customfunction
 */
const getInfectsionsByTests = (daysAgo = 7) => {
  try {
    const { rawCountryStatsShName, rawStateStatsShName } = CONFIG;

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const countrySheet = ss.getSheetByName(rawCountryStatsShName);
    const statesSheet = ss.getSheetByName(rawStateStatsShName);

    const countryValues = infectionsByTestsByCountry({
      sheet: countrySheet,
      daysAgo,
    });
    const statesValues = infectionsByTestsByState({
      sheet: statesSheet,
      daysAgo,
    });

    return [...countryValues, ...statesValues];
  } catch (error) {
    console.warn(`failed to update inf/test ratio: ${error}`);
    return [];
  }
};

/**
 * @param {string} ref A1 reference of top left cell
 * @return {[[""], ...number[][]]}
 * @customfunction
 */
const rowSum = (ref: string): [[""], ...number[][]] => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const init = ss.getRange(ref);

  const numRows = ss.getLastRow() - init.getRow() + 1;
  const numcols = ss.getLastColumn() - init.getColumn() + 1;

  if (numcols === 0) {
    return [[""]];
  }

  const rng = init.offset(0, 0, numRows, numcols);

  const vls = rng.getValues();

  const summed = vls.map((row) => [sum(row)]);

  return [[""], ...summed];
};

const flipCols = (grid: any[][], a = 0, b = 1) =>
  grid.map((row) => {
    const tmp = row[b];
    row[b] = row[a];
    row[a] = tmp;
    return row;
  });