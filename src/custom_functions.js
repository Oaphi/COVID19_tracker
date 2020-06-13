/**
 * @typedef {object} IndicesRef
 * @property {object} ColumnIndices
 * @property {ojbect} RowIndices
 */

/** 
 * 0-based column indices
 * @type {Object.<string, IndicesRef>}
 */
const SheetIndices = {
    StateStats: {
        ColumnIndices: {
            StatDate: 0,
            StateCode: 1
        }
    },
    Covid19: {
        ColumnIndices: {
            StateCode: 1,
            Population: 42,
            Hospitalized: {
                Increase: 21
            }
        }
    }
};

/**
 * Counts metric by N millions of people
 * @param {boolean} isTotalByCountry set to true when used as US total
 * @param {Date} date reference to current date cell
 * @param {(number|string)[][]} stateData reference to COVID19 sheet data
 * @param {number[][]} statValues reference to column with per state statistics
 * @param {string} statColumn column with metric data A1 reference
 * @param {number} periodStartOffset period offset, in days
 * @param {number} numMillions number of millions to count against
 * @return {number[][]}
 * @customfunction
 */
function metricPerMillions(
    isTotalByCountry,
    date,
    stateData,
    statValues,
    statColumn,
    numMillions = 1,
    periodEndOffset = 0,
    periodStartOffset = 6
) {
    const currDateMs = date.valueOf();

    const currDateValue = (currDateMs - 864e5 * periodEndOffset);
    const nDaysAgoValue = (currDateMs - 864e5 * periodStartOffset);

    const { Covid19, StateStats } = SheetIndices;

    const metricsColIdx = getIndexFromA1(statColumn);

    const result = stateData
        .map((columnValues) => {
            const population = columnValues[Covid19.ColumnIndices.Population];
            const stateCode = columnValues[Covid19.ColumnIndices.StateCode];

            const relativePopulation = population / (1e6 * numMillions);

            const stateStatsForNdays = statValues
                .slice(1)
                .reduce((acc, cur) => {
                    const statStateCode = cur[StateStats.ColumnIndices.StateCode];
                    const statDate = cur[StateStats.ColumnIndices.StatDate];

                    const sameState = isTotalByCountry || statStateCode === stateCode;

                    const dateMs = datenumToValue(statDate);

                    const inOffset = dateMs >= nDaysAgoValue && dateMs <= currDateValue;

                    return sameState && inOffset ? acc + cur[metricsColIdx] : acc;
                }, 0);

            return [stateStatsForNdays / relativePopulation];
        });

    return result;
}