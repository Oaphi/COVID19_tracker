const getLastStatsDate = () => {
  const { rawCountryStatsShName } = CONFIG;
  const sheet = getOrInitSheet({ name: rawCountryStatsShName });
  return datenumToValue(sheet.getRange("A2").getValue());
};

/**
 * @summary counts by date
 */
const countByDate = ({
  acc = {},
  grid,
  col = 0,
}: {
  acc?: object;
  grid: any[][];
  col?: number;
}) => {
  grid.forEach((row: any[]) => {
    const val = row[col];
    if (!val) {
      return;
    }

    try {
      const date = toISOdate(val);
      acc[date] = (acc[date] || 0) + 1;
    } catch (e) {
      //invalid date, noop
    }
  });

  return acc;
};

/**
 * @summary convenience function for getting user sheet
 */
const getUsersSheet = () => {
  const {
    sheets: { users },
  } = CONFIG;
  return getOrInitSheet({ name: users });
};

/**
 * @summary updates subscriber daily growth
 */
const updateUserGrowth = ({
  sheet = getUsersSheet(),
  sortDown = recordOnDateSorter(),
  logger = new LogAccumulator(),
  dict = getSubscribersByDate(),
} = {}) => {
  try {
    const scol = getIndexFromA1("H");

    const range = sheet.getRange(2, scol + 1, sheet.getLastRow(), 2);

    const grid = Object.entries(dict).sort(sortDown);

    grid.unshift(["Total", sumOn(grid, 1)]);

    adjustToGrid({
      grid,
      range,
      setValues: true,
    });

    return true;
  } catch (error) {
    logger.log(error, "error");
    return false;
  }
};

/**
 * @summary updates unsubscriber (manual + auto) daily growth
 */
const updateUnsubGrowth = ({
  sheet = getUsersSheet(),
  sortDown = recordOnDateSorter(),
  logger = new LogAccumulator(),
  dict = getSubscribersByDate(),
} = {}) => {
  try {
    const scol = getIndexFromA1("J");

    const rng = sheet.getRange(2, scol + 1, sheet.getLastRow(), 2);

    const vals = rng.getValues();

    const unsubs = {};

    countByDate({ grid: vals, acc: unsubs });
    countByDate({ grid: vals, acc: unsubs, col: 1 });

    const sorted = Object.entries(dict).sort(sortDown);

    const grid = sorted.map(([date, num]) => {
      const iso = unsubs[toISOdate(date)] || 0;
      return [iso, num - iso];
    });

    //add unsubscriber totals
    grid.unshift(
      grid.reduce(
        ([accNum = 0, accDiff = 0], [num = 0, diff = 0]) => [
          accNum + num,
          accDiff + diff,
        ],
        [0, 0]
      )
    );

    adjustToGrid({
      grid,
      move: { left: 2 },
      range: rng,
      setValues: true,
    });

    return true;
  } catch (error) {
    logger.log(error, "error");
    return false;
  }
};

/**
 * @summary gets stats from COVID-19 sheet
 * @returns {(string|number)[][]}
 */
const getCovid19Stats = ({ sheet } = {}) => {
  const {
    sheets: { covid19 },
  } = CONFIG;

  const statSheet = sheet || getOrInitSheet({ name: covid19 });
  const source = statSheet.getDataRange().getValues();

  return shrinkGrid({ source, top: 1 });
};

const getStatsHtmlServiceSafe = () => JSON.stringify(getCovid19Stats());

/**
 * @summary get statistics by state code
 * @returns {Object.<string, (string | number)[][]>}
 */
const getStateStats = (sheet: GoogleAppsScript.Spreadsheet.Sheet) => {
  const covidDataByState = {};

  const rng = sheet.getRange(
    3,
    1,
    sheet.getLastRow() - 2,
    sheet.getLastColumn()
  );

  const vls = rng.getValues();

  vls.forEach((stateData) => {
    covidDataByState[stateData[1]] = stateData;
  });

  return covidDataByState;
};

/**
 * @summary gets US stats from the sheet specified
 */
const getUSstats = (sheet: GoogleAppsScript.Spreadsheet.Sheet) =>
  sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues();

/**
 * @summary gets total statistics by US
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {(string | number)[]}
 */
const getTotalByUS = (sheet) => {
  return sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
};

const toPercentRatio = ([dt, dv]) => [
  toIntOrFloatPercent(dv !== 0 ? dt / dv : 0),
];

/**
 * @typedef {({
 *  sheet : GoogleAppsScript.Spreadsheet.Sheet,
 *  daysAgo?: number
 * })} StatsOptions
 *
 * @param {StatsOptions} config
 *
 * @returns {string[][]}
 */
const infectionsByTestsByState = ({ sheet, daysAgo = 7 }) => {
  const start = 2,
    column = 1,
    infectsColIndex = 23,
    testColIndex = 24;

  const statsRows = sheet.getRange(
    start,
    column,
    sheet.getLastRow(),
    testColIndex + 1
  );

  const statsValues = statsRows.getValues();

  const currDateValue = new Date(toISOdate(Date.now())).valueOf();

  const nDaysAgo = offset({
    date: currDateValue,
    numberOf: daysAgo,
    period: "days",
  }).valueOf();

  console.log(new Date(nDaysAgo));

  let reachedDateLimit = false;

  const data = statsValues.reduce(
    (acc, curr: [number, string, ...number[]]) => {
      if (reachedDateLimit) {
        return acc;
      }

      const [date, state] = curr;

      const parsedDateValue = datenumToValue(date);

      if (parsedDateValue >= nDaysAgo) {
        const infections = curr[infectsColIndex] || 0;
        const tests = curr[testColIndex] || 0;

        const [prevInfects = 0, prevTests = 0] = acc[state] || [];

        acc[state] = [prevInfects + infections, prevTests + tests];
        return acc;
      }

      reachedDateLimit = true;
      return acc;
    },
    {}
  );

  return Object.values(data).map(toPercentRatio);
};

/**
 * @param {StatsOptions} config
 * @returns {string[][]}
 */
const infectionsByTestsByCountry = ({ sheet, daysAgo = 7 } = {}) => {
  const startRow = 2,
    startCol = 1,
    infectsColIndex = 22,
    testColIndex = 23;

  const statsRows = sheet.getRange(
    startRow,
    startCol,
    sheet.getLastRow(),
    testColIndex + 1
  );

  const values = statsRows.getValues();

  const currDateValue = new Date(toISOdate(Date.now())).valueOf();

  const stats = [0, 0];

  for (const row of values) {
    const [date] = row;

    const parsedDateValue = datenumToValue(date);

    const dateOffset = offset({
      date: currDateValue,
      numberOf: daysAgo || 1,
      period: "days",
    });

    if (parsedDateValue < dateOffset) {
      break;
    }

    const infections = row[infectsColIndex];
    const tests = row[testColIndex];

    stats[0] += infections;
    stats[1] += tests;
  }

  return [stats].map(toPercentRatio);
};

/**
 * @summary gets states that reported no data
 * @param {(string|number)[][]} [stateData]
 * @returns {string[]}
 */
const reportedNoData = (stateData = getCovid19Stats()) => {
  const codesToSkip = ["AS", "GU", "MP", "PR", "VI"]; //skipping US territories;

  const infectionsIdx = getIndexFromA1("D");
  const deathsIdx = getIndexFromA1("N");
  const testsIdx = getIndexFromA1("X");

  const {
    Covid19: {
      ColumnIndices: { StateCode },
    },
  } = getIndices();

  return stateData
    .filter((stateRow) => {
      const code = stateRow[StateCode];

      const infections = stateRow[infectionsIdx];
      const deaths = stateRow[deathsIdx];
      const tests = stateRow[testsIdx];

      const skip = codesToSkip.includes(code);

      return !skip && AND(infections === 0, deaths === 0, tests === 0);
    })
    .map((stateRow) => stateRow[StateCode]);
};

/**
 * @summary gets state names list
 */
const getStateNames = (): UserRecord["3"][] => {
  const {
    Covid19: {
      ColumnIndices: { StateCode },
    },
  } = getIndices();

  const data = shrinkGrid({
    source: getCovid19Stats(),
    top: 1,
  });

  return data.map((row: UserRecord) => row[StateCode]);
};

const getStateCodeToNameMap = () => {
  const data = shrinkGrid({
    source: getCovid19Stats(),
    leave: {
      left: 3,
    },
    left: 1,
    top: 1,
  });

  const statesMap = {};

  data.forEach(([code, name]) => (statesMap[code] = name));

  return statesMap;
};

/**
 * @summary gets date choices for data validation in the stats sheet
 * @param {{ onError ?: (err : Error) => void }}
 * @returns {string[][]}
 */
const getValidDateChoices = ({ onError = (err) => console.warn(err) } = {}) => {
  const {
    sheets: { country },
  } = CONFIG;

  try {
    const sheet = getOrInitSheet({ name: country });
    const dateCol = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1);
    const values = dateCol.getValues();

    return values.map(([date]) => toISOdate(datenumToValue(date)));
  } catch (error) {
    onError(error);
    return [];
  }
};

/**
 * @summary sets valid dates data validation
 * @param {{
 *  validDates ?: string[][],
 *  onError ?: (err : Error) => void
 * }}
 * @returns {boolean}
 */
const setValidDateChoices = ({
  valueIndex,
  validDates = getValidDateChoices(),
  onError = (err) => console.warn(err),
} = {}) => {
  const {
    sheets: { covid19 },
  } = CONFIG;

  try {
    const dateCell = "A2";

    const sheet = getOrInitSheet({ name: covid19 });
    const rng = sheet.getRange(dateCell);

    rng.clearDataValidations();

    const validation = SpreadsheetApp.newDataValidation();
    validation.requireValueInList(validDates);
    rng.setDataValidation(validation);

    if (valueIndex !== void 0) {
      rng.setValue(validDates[valueIndex]);
    }

    return true;
  } catch (error) {
    onError(error);
    return false;
  }
};

/**
 * @summary looks up state code
 * @param {string[][]} stateNames full name lookup
 */
const lookupCode = (stateNames: string[][]): string[][] => {
  const {
    sheets: { covid19 },
  } = CONFIG;

  const sh = getSheet(covid19);

  const states: Record<string, string> = Object.fromEntries(
    flipCols(sh.getSheetValues(2, 2, 57, 2))
  );

  const oddities = {
    "District Of Columbia": "DC",
    "Northern Mariana Islands": "MP",
  };

  return stateNames.map(([fullName]) => [
    states[fullName] || oddities[fullName],
  ]);
};
