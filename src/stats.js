/**
 * @typedef {({
 *  sheet : GoogleAppsScript.Spreadsheet.Sheet
 * })} statsConfig
 * 
 * @param {statsConfig} config 
 * 
 * @returns {string[][]}
 */
const infectionsByTestsByState = (
    {
        sheet
    } = {}
) => {

    const startRow = 2, startCol = 1, testColIndex = 17;

    const statsRows = sheet.getRange(
        startRow,
        startCol,
        sheet.getLastRow(),
        testColIndex + 1
    );

    const statsValues = statsRows.getValues();

    const currDateValue = new Date(new Date().toISOString().slice(0, 10)).valueOf();

    const recents = {};

    const data = statsValues
        .reduce((acc, curr) => {

            /** @type {[ number, string, number ]} */
            const [date, state, infections] = curr;

            const formattedToUTCdateString = date.toString().replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");

            const parsedDateValue = new Date(formattedToUTCdateString).valueOf();

            if ((recents[state] || 0) < parsedDateValue) {

                recents[state] = parsedDateValue;

                const tests = curr[testColIndex];
                const ratio = infections / tests;
                acc.set(state, ratio);
            }

            return acc;

        }, new Map());

    return [...data.values()].map(val => [val]);
};

/**
 * @summary updates infections to tests ratio
 * @returns {boolean}
 */
const updateInfectsionsByTests = () => {

    const infectToTests7DayColNum = 44;

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const statesSheet = ss.getSheetByName(CONFIG.rawStateStatsShName);

    try {
        const statesValues = infectionsByTestsByState({ sheet: statesSheet });

        const covidSheet = ss.getSheetByName(CONFIG.statsShName);

        covidSheet.getRange(3, infectToTests7DayColNum, statesValues.length, 1).setValues(statesValues);
    } catch (error) {
        console.warn(error);
        return false;
    }

    return true;
};