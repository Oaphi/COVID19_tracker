/**
 * @typedef {object} IndicesRef
 * @property {object} ColumnIndices
 * @property {ojbect} RowIndices
 */

/** 
 * 0-based column indices
 */
const SheetIndices = {
    StateStats: {
        ColumnIndices: {
            StatDate: 0,
            StateCode: 1,
            Positive: 2,
            Negative: 3,
            Pending: 4,
            HospitalizedCurrent: 5,
            HospitalizedTotal: 6,
            OnVentilatorCurrent: 9,
            OnVentilatorTotal: 10,
            Recovered: 11,
            Hash: 12,
            Deaths: 14,
            Hospitalized: 15,
            Total: 16,
            TotalTestResults: 17,
            PositiveToNegative: 18,
            Fips: 19,
            DeathsIncrease: 20,
            HospitalizedIncrease: 21,
            NegativeIncrease: 22,
            PositiveIncrease: 23,
            TotalTestsIncrease: 24
        }
    },
    Covid19: {
        ColumnIndices: {
            StateCode: 1,
            StateName: 2,
            Infections: 3,
            Infection1DayChange: 4,
            InfectionYesterday: 5,
            Infection7DayChange: 6,
            InfectionsTotalTo7DayAvg: 7,
            Hospital1DayChange: 9,
            HospitalYesterday: 10,
            HospitalsTotalTo7DayAvg: 11,
            Deaths: 12,
            Death1DayChange : 13,
            DeathYesterday: 14,
            Death7DayChange: 15,
            Population: 42,
            Hospitalized: {
                Increase: 21
            }
        }
    }
};

/**
 * @summary gets either new or cached column indices
 * @returns {SheetIndices}
 */
function getIndices() {
    const { indices } = this;
    
    if(!indices) {
        this.indices = SheetIndices;
        return SheetIndices;
    }

    return SheetIndices;
}

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

/**
 * Returns percent of change over last week
 * @param {number[][]} dividends 
 * @param {number[][]} divisors 
 * @return {string}
 * @customfunction
 */
const percentToPreviousWeek = (dividends, divisors) => {
    return dividends.map(([dividend], rowIdx) => {
        const [divisor] = divisors[rowIdx];
        
        if(!divisor) {
            return "+N/A%";
        }

        return topercent((dividend - divisor) / (divisor || 1));
    });
};