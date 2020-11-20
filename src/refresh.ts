/**
 * @summary refreshes COVID data
 * @param {{
 *  onError? : (err : Error) => void
 * }}
 * @returns {boolean}
 */
function refresh({
    onError = console.warn
} = {}) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const {
        links: { country: countryAPIuri, states: statesAPIuri },
        properties: { general },
        sheets: { states, country, covid19 }
    } = CONFIG;

    try {

        const sheet1 = ss.getSheetByName(states);
        const sheet2 = ss.getSheetByName(country);
        const Covid19sh = ss.getSheetByName(covid19);

        const [data1, data2] = fetchAlljson([statesAPIuri, countryAPIuri]);

        const updateResults = {
            states: { date: data1[0].date },
            country: { date: data2[0].date }
        };

        /** @type {any[][]} */
        const inputdata1 = data1.map(data => {

            const {
                date, total, state,
                recovered, positive,
                pending, negative, hospitalized,
                hash, fips, death, totalTestResults, posNeg,
                hospitalizedCurrently, hospitalizedCumulative,
                totalTestsPeopleViral, deathIncrease, positiveCasesViral
            } = data;

            const inputrow = [
                date,
                state,
                positive,
                negative,
                pending,
                hospitalizedCurrently,
                hospitalizedCumulative,
                data.inIcuCurrently,
                data.inIcuCumulative,
                data.onVentilatorCurrently,
                data.onVentilatorCumulative,
                recovered,
                hash,
                data.dateChecked,
                death,
                hospitalized,
                total,
                totalTestResults,
                posNeg,
                fips,
                deathIncrease,
                data.hospitalizedIncrease,
                data.negativeIncrease,
                data.positiveIncrease,
                data.totalTestResultsIncrease,
                positiveCasesViral,
                totalTestsPeopleViral
            ];

            for (let ii = 0; ii < 5; ii++) {
                const offset20 = ii + 20;

                if (inputrow[offset20] < 0) {
                    inputrow[offset20] = 0;
                }
            }

            return inputrow;
        });

        /** @type {any[][]} */
        const inputdata2 = data2.map(data => {

            const {
                date, dateChecked, total,
                states, recovered, positive,
                pending, negative, hospitalized,
                hash, death, totalTestResults, posNeg,
                hospitalizedCurrently, hospitalizedCumulative,
                 deathIncrease
            } = data;

            let inputrow = [
                date,
                states,
                positive,
                negative,
                pending,
                hospitalizedCurrently,
                hospitalizedCumulative,
                data.inIcuCurrently,
                data.inIcuCumulative,
                data.onVentilatorCurrently,
                data.onVentilatorCumulative,
                recovered,
                hash,
                dateChecked,
                death,
                hospitalized,
                total,
                totalTestResults,
                posNeg,
                deathIncrease,
                data.hospitalizedIncrease,
                data.negativeIncrease,
                data.positiveIncrease,
                data.totalTestResultsIncrease,
            ];

            for (let ii = 0; ii < 5; ii++) {
                const offset19 = ii + 19;

                if (inputrow[offset19] < 0) {
                    inputrow[offset19] = 0;
                }
            }

            return inputrow;
        });

        const range1 = sheet1.getRange(2, 1, data1.length, inputdata1[0].length);
        const range2 = sheet2.getRange(2, 1, data2.length, inputdata2[0].length);

        range1.setValues(inputdata1);
        range2.setValues(inputdata2);

        const updatedDate = new Date(datenumToValue(updateResults.states.date));

        const dataForStatus = updateSettings({
            property: general,
            settings: getGeneralSettings(),
            path: "approval/dataFor",
            update: toISOdate(updatedDate),
            onError
        });

        const validDates = getValidDateChoices({ onError });

        const dateStatus = setValidDateChoices({
            validDates,
            valueIndex: 0,
            onError
        });

        const date = new Date();

        Covid19sh.getRange(3, 1).setValue(`Last Updated : ${date}`);

        const recalcStatus = calculateStats({ onError });

        const allOK = dataForStatus && dateStatus && recalcStatus;

        allOK || onError({ dataForStatus, dateStatus, recalcStatus });

        return allOK;

    } catch (error) {
        onError(error);
        return false;
    }
}