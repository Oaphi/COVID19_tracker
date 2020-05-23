/**
 * @summary builds a Twitter widget
 * @param {string} statee 
 * @returns {string}
 */
function LoadTwitter(statee) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName("Covid19");

    var data = ws.getRange(1, 2, 60).getValues();

    var roww;

    for (var i = 0; i < data.length; i++) {
        if (data[i][0] === statee) { //[1] because column B
            roww = i + 1;
        }
    }

    var list1 = ws.getRange(roww, 1, 1, 43).getValues();
    var timeZone = Session.getScriptTimeZone();

    var tweet = "https://twitter.com/intent/tweet?text=";
    tweet += list1[0][2] + "%27s 24-hour COVID-19 %23%27s as of 5%3A30pm EST" + Utilities.formatDate(getcelldate(), timeZone, ' M/d/YY') + ", via covidping.com%3A%0A%0A";
    tweet += "New tests%3A " + addCommas(list1[0][23]) + " %28" + addSign(topercent(list1[0][26])) + " vs. 7day avg%29%0A%0A";
    tweet += "New infections%3A " + addCommas(list1[0][3]) + " %28" + addSign(topercent(list1[0][6])) + " vs. 7day avg%29%0A%0A";
    tweet += "New deaths%3A " + addCommas(list1[0][13]) + " %28" + addSign(topercent(list1[0][16])) + " vs. 7day avg%29";

    return tweet;
}