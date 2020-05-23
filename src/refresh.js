/**
 * @summary refreshes COVID data
 * @returns {void}
 */
function Covid19Refresh() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var sheet1 = ss.getSheetByName("States");
    var sheet2 = ss.getSheetByName("Country");

    var Covid19sh = ss.getSheetByName("Covid19");

    var data1 = fetchAndParseContent("https://covidtracking.com/api/states/daily");
    
    Logger.log(data1[0]);

    var inputdata1 = [];

    for (let i = 0; i < data1.length; i++) {
        let inputrow = [
            data1[i].date,
            data1[i].state,
            data1[i].positive,
            data1[i].negative,
            data1[i].pending,
            data1[i].hospitalizedCurrently,
            data1[i].hospitalizedCumulative,
            data1[i].inIcuCurrently,
            data1[i].inIcuCumulative,
            data1[i].onVentilatorCurrently,
            data1[i].onVentilatorCumulative,
            data1[i].recovered,
            data1[i].hash,
            data1[i].dateChecked,
            data1[i].death,
            data1[i].hospitalized,
            data1[i].total,
            data1[i].totalTestResults,
            data1[i].posNeg,
            data1[i].fips,
            data1[i].deathIncrease,
            data1[i].hospitalizedIncrease,
            data1[i].negativeIncrease,
            data1[i].positiveIncrease,
            data1[i].totalTestResultsIncrease
        ];

        for (let ii = 0; ii < 5; ii++) {
            if (inputrow[ii + 20] < 0) {
                inputrow[ii + 20] = 0;
            }
        }

        inputdata1.push(inputrow);
    }

    var data2 = fetchAndParseContent("https://covidtracking.com/api/us/daily");
    
    Logger.log(data2[0]);

    var inputdata2 = [];

    for (let i = 0; i < data2.length; i++) {
        let inputrow = [
            data2[i].date,
            data2[i].states,
            data2[i].positive,
            data2[i].negative,
            data2[i].pending,
            data2[i].hospitalizedCurrently,
            data2[i].hospitalizedCumulative,
            data2[i].inIcuCurrently,
            data2[i].inIcuCumulative,
            data2[i].onVentilatorCurrently,
            data2[i].onVentilatorCumulative,
            data2[i].recovered,
            data2[i].hash,
            data2[i].dateChecked,
            data2[i].death,
            data2[i].hospitalized,
            data2[i].total,
            data2[i].totalTestResults,
            data2[i].posNeg,
            data2[i].deathIncrease,
            data2[i].hospitalizedIncrease,
            data2[i].negativeIncrease,
            data2[i].positiveIncrease,
            data2[i].totalTestResultsIncrease
        ];

        for (let ii = 0; ii < 5; ii++) {
            if (inputrow[ii + 19] < 0) {
                inputrow[ii + 19] = 0;
            }
        }
        inputdata2.push(inputrow);
    }

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