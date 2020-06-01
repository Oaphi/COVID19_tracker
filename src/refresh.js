/**
 * @summary refreshes COVID data
 * @returns {void}
 */
function Covid19Refresh() {

    getOrInstallInfectionsByTests();

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    var sheet1 = ss.getSheetByName(CONFIG.rawStateStatsShName);
    var sheet2 = ss.getSheetByName(CONFIG.rawCountryStatsShName);
    var Covid19sh = ss.getSheetByName(CONFIG.statsShName);

    var data1 = fetchAndParseContent("https://covidtracking.com/api/states/daily");
    
    console.log(data1[0]);

    var inputdata1 = data1.map(data => {

        const { date, state, positive } = data;

        const inputrow = [
            date,
            state,
            positive,
            data.negative,
            data.pending,
            data.hospitalizedCurrently,
            data.hospitalizedCumulative,
            data.inIcuCurrently,
            data.inIcuCumulative,
            data.onVentilatorCurrently,
            data.onVentilatorCumulative,
            data.recovered,
            data.hash,
            data.dateChecked,
            data.death,
            data.hospitalized,
            data.total,
            data.totalTestResults,
            data.posNeg,
            data.fips,
            data.deathIncrease,
            data.hospitalizedIncrease,
            data.negativeIncrease,
            data.positiveIncrease,
            data.totalTestResultsIncrease
        ];

        for (let ii = 0; ii < 5; ii++) {
            const offset20 = ii + 20;

            if (inputrow[offset20] < 0) {
                inputrow[offset20] = 0;
            }
        }

        return inputrow;
    });

    var data2 = fetchAndParseContent("https://covidtracking.com/api/us/daily");
    
    console.log(data2[0]);

    var inputdata2 = data2.map(data => {

        const { date, states, positive, negative } = data;

        let inputrow = [
            date,
            states,
            positive,
            negative,
            data.pending,
            data.hospitalizedCurrently,
            data.hospitalizedCumulative,
            data.inIcuCurrently,
            data.inIcuCumulative,
            data.onVentilatorCurrently,
            data.onVentilatorCumulative,
            data.recovered,
            data.hash,
            data.dateChecked,
            data.death,
            data.hospitalized,
            data.total,
            data.totalTestResults,
            data.posNeg,
            data.deathIncrease,
            data.hospitalizedIncrease,
            data.negativeIncrease,
            data.positiveIncrease,
            data.totalTestResultsIncrease
        ];

        for (let ii = 0; ii < 5; ii++) {
            const offset19 = ii + 19;

            if (inputrow[offset19] < 0) {
                inputrow[offset19] = 0;
            }
        }
        
        return inputrow;
    });

    var range1 = sheet1.getRange(2, 1, data1.length, 25);
    range1.setValues(inputdata1);

    var range2 = sheet2.getRange(2, 1, data2.length, 24);
    range2.setValues(inputdata2);

    Covid19sh.getRange(3, 1).setValue("Last Updated : " + new Date());
}

/**
 * @returns {void}
 */
function Covid19Refresh_BACKUP() {

    getOrInstallInfectionsByTests();

    var aUrl = "https://covidtracking.com/api/states/daily";
    var ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1Jmy7IqSugeZnHq5oAZV4Mq9w6UfrCbQ9PaLziseG2ME/edit?usp=sharing");
    var ws = ss.getSheetByName("LiveStates");
    ws.getRange(1, 1).setValue('=ImportJSON("' + aUrl + '")');

    var aUrl1 = "https://covidtracking.com/api/us/daily";
    var ws1 = ss.getSheetByName("LiveCountry");
    ws1.getRange(1, 1).setValue('=ImportJSON("' + aUrl1 + '")');

    Utilities.sleep(500);


    var ss1 = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1-UXzdnxM8FE3MAmPFI2CcFOf1KNWSgN5V-68rlBQsSY/edit?usp=sharing");
    var copySheet = ss.getSheetByName("LiveStates");
    var pasteSheet = ss1.getSheetByName("States");
    var Covid19sh = ss1.getSheetByName("Covid19");

    // get source range
    var source01 = copySheet.getRange(1, 1, copySheet.getLastRow() - 1, 12).getValues();
    var source02 = copySheet.getRange(1, 15, copySheet.getLastRow() - 1, copySheet.getLastColumn() - 14).getValues();
    // get destination range
    pasteSheet.getRange(1, 1, copySheet.getLastRow() - 1, 12).setValues(source01);
    pasteSheet.getRange(1, 13, copySheet.getLastRow() - 1, copySheet.getLastColumn() - 14).setValues(source02);


    var copySheet1 = ss.getSheetByName("LiveCountry");
    var pasteSheet1 = ss1.getSheetByName("Country");

    // get source range
    var source1 = copySheet1.getRange(1, 1, copySheet1.getLastRow(), copySheet1.getLastColumn()).getValues();
    // get destination range
    pasteSheet1.getRange(1, 1, copySheet1.getLastRow(), copySheet1.getLastColumn()).setValues(source1);


    Covid19sh.getRange(3, 1).setValue("Last Updated : " + new Date());
    Logger.log("Done");
}