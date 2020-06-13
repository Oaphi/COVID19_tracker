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

    const startRow = 2, startCol = 1, infectsColIndex = 23, testColIndex = 24;

    const statsRows = sheet.getRange(
        startRow,
        startCol,
        sheet.getLastRow(),
        testColIndex + 1
    );

    const statsValues = statsRows.getValues();

    const currDateValue = new Date(new Date().toISOString().slice(0, 10)).valueOf();
    const sevenDaysAgo = (currDateValue - 7 * 864e5);

    let reachedDateLimit = false;

    const data = statsValues
        .reduce((acc, curr) => {

            if(reachedDateLimit) {
                return acc;
            }

            /** @type {[ number, string, number ]} */
            const [date, state] = curr;

            const parsedDateValue = datenumToValue(date);

            if (parsedDateValue >= sevenDaysAgo) {

                const infections = curr[infectsColIndex];
                const tests = curr[testColIndex];

                const [
                    prevInfects = 0,
                    prevTests = 0
                ] = acc.get(state) || [];

                return acc.set(state, [prevInfects + infections, prevTests + tests]);
            }

            reachedDateLimit = true;
            return acc;

        }, new Map());
    
    return [...data.values()]
        .map(val => {
            const [infections, tests] = val;
            return [tests !== 0 ? infections / tests : 0];
        });
};

/**
 * @param {statsConfig} config
 * @returns {string[][]}
 */
const infectionsByTestsByCountry = ({
    sheet
} = {}) => {

    const startRow = 2, startCol = 1, infectsColIndex = 22, testColIndex = 23;

    const statsRows = sheet.getRange(
        startRow,
        startCol,
        sheet.getLastRow(),
        testColIndex + 1
    );

    const statsValues = statsRows.getValues();

    const currDateValue = new Date(new Date().toISOString().slice(0, 10)).valueOf();

    let reachedDateLimit = false;

    const data = statsValues
        .reduce((acc, curr) => {

            if(reachedDateLimit) {
                return acc;
            }

            /** @type {[ number, string, number ]} */
            const [date] = curr;
            
            const parsedDateValue = datenumToValue(date);

            const sevenDaysAgo = (currDateValue - 7 * 864e5);

            if (parsedDateValue >= sevenDaysAgo) {

                const infections = curr[infectsColIndex];
                const tests = curr[testColIndex];

                const [
                    prevInfects = 0,
                    prevTests = 0
                ] = acc;

                return [
                    prevInfects + infections,
                    prevTests + tests
                ];
            }

            reachedDateLimit = true;
            return acc;

        }, []);
    
    return [data]
        .map(val => {
            const [infections, tests] = val;
            return [tests !== 0 ? infections / tests : 0];
        });

};

/**
 * @summary updates infections to tests ratio
 * @returns {boolean}
 */
const updateInfectsionsByTests = () => {

    const lock = LockService.getDocumentLock();
    if(!lock.tryLock(1)) {
        return true;
    }

    const infectToTests7DayColNum = 44;

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const countrySheet = ss.getSheetByName(CONFIG.rawCountryStatsShName);

    const statesSheet = ss.getSheetByName(CONFIG.rawStateStatsShName);

    try {

        const countryValues = infectionsByTestsByCountry({ sheet: countrySheet });

        const statesValues = infectionsByTestsByState({ sheet: statesSheet });

        const covidSheet = ss.getSheetByName(CONFIG.statsShName);

        covidSheet
            .getRange(2, infectToTests7DayColNum, 1, 1)
            .setValues(countryValues);

        covidSheet
            .getRange(3, infectToTests7DayColNum, statesValues.length, 1)
            .setValues(statesValues);

    } catch (error) {
        console.warn(error);
        return false;
    }

    return true;
};