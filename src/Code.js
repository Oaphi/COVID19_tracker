function ttttt() {

  Logger.log(Math.floor(1.08));
  Logger.log(Math.floor(1.88));
  Logger.log(Math.floor(-1.08));
  Logger.log(Math.floor(-1.88));
}

/**
 * 
 * @param {string} statee 
 * @returns {string}
 */
function LoadTable(statee) {


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
  var list2 = ws.getRange(2, 1, 1, 43).getValues();

  Logger.log(list1[0][5]);
  Logger.log(list2[0][5]);

  var tablebody1 = "";

  var tableHead1 = '<thead><tr><th width="25%"> </th> <th width="17%"> Today</th> <th width="29%"> Today vs. Yesterday</th>  <th width="29%"> Today vs. 7-day Avg.</th> </tr></thead>';

  tablebody1 = '<tr><td><strong> ' + list1[0][2] + '</strong></td><td align="center" ><strong> ' + addCommas(list1[0][23]) + '</strong></td><td align="center" ><strong>' + GreenRed(topercent(list1[0][24])) + "</strong> vs. " + addCommas(list1[0][25]) + '</td><td align="center"> <strong>' + GreenRed(topercent(list1[0][26])) + "</strong> vs. " + addCommas(list1[0][27]) + '</td></tr>';

  tablebodyr1 = '<tr><td><strong> ' + list2[0][2] + '</strong></td><td align="center" ><strong> ' + addCommas(list2[0][23]) + '</strong></td><td align="center"> <strong>' + GreenRed(topercent(list2[0][24])) + "</strong> vs. " + addCommas(list2[0][25]) + '</td><td align="center"> <strong>' + GreenRed(topercent(list2[0][26])) + "</strong> vs. " + addCommas(list2[0][27]) + '</td></tr>';

  var htmlListArray1 = '<div><font size="1"><b><font color="#000000">NEWLY REPORTED TESTS<font color="#1261A0">  +% increases in blue (good) &nbsp;</font></b><br></font></div><table cellspacing="0" cellpadding="0" dir="ltr" border="0" style=""><colgroup><col width="100"><col width="100"><col width="100"><col width="100"><col width="100"></colgroup>' + tableHead1 + '<tbody>' + tablebody1 + tablebodyr1 + '</tbody></table>';

  htmlListArray1 += "<div>" + list1[0][2] + " was " + ordinal_suffix_of(list1[0][37]) + " today: " + setDecimalPlaces(list1[0][36]) + " new tests per 1MM residents | " + addCommas(list1[0][32]) + " to date </div><br>";



  tablebody2 = '<tr><td><strong>  ' + list1[0][2] + '</strong></td><td align="center" ><strong> ' + addCommas(list1[0][3]) + '</strong></td><td align="center" ><strong>' + RedGreen(topercent(list1[0][4])) + "</strong> vs. " + addCommas(list1[0][5]) + '</td><td align="center" ><strong>' + RedGreen(topercent(list1[0][6])) + "</strong> vs. " + addCommas(list1[0][7]) + '</td></tr>';

  tablebodyr2 = '<tr><td><strong>   ' + list2[0][2] + '</strong></td><td align="center" ><strong> ' + addCommas(list2[0][3]) + '</strong></td><td align="center" ><strong>' + RedGreen(topercent(list2[0][4])) + "</strong> vs. " + addCommas(list2[0][5]) + '</td><td align="center" ><strong>' + RedGreen(topercent(list2[0][6])) + "</strong> vs. " + addCommas(list2[0][7]) + '</td></tr>';

  var htmlListArray2 = '<div><font size="1"><b><font color="#000000">NEWLY REPORTED INFECTIONS<font color="#EA452F">  +% increases in red (bad) &nbsp;</font></b><br></font></div><table cellspacing="0" cellpadding="0" dir="ltr" border="0" style=""><colgroup><col width="100"><col width="100"><col width="100"><col width="100"><col width="100"></colgroup>' + tableHead1 + '<tbody>' + tablebody2 + tablebodyr2 + '</tbody></table>';

  htmlListArray2 += "<div>" + list1[0][2] + " was " + ordinal_suffix_of(list1[0][39]) + " today: " + setDecimalPlaces(list1[0][38]) + " new infections per 1MM residents | " + addCommas(list1[0][28]) + " to date </div><br>";



  //tablebody3 =  '<tr><td><strong> ' + list1[0][2] +  '</strong></td><td align="center" ><strong> ' +   addCommas(list1[0][8]) + '</strong></td><td align="center" ><strong>' +   RedGreen(topercent(list1[0][9])) + "</strong> vs. " + addCommas(list1[0][10]) + '</td><td align="center" ><strong>' +   RedGreen(topercent(list1[0][11])) + "</strong> vs. " + addCommas(list1[0][12]) + '</td></tr>'; 

  //tablebodyr3 =  '<tr><td><strong> ' + list2[0][2] + '</strong></td><td align="center" ><strong> ' +   addCommas(list2[0][8]) + '</strong></td><td align="center" ><strong>' +   RedGreen(topercent(list2[0][9])) + "</strong> vs. " + addCommas(list2[0][10]) + '</td><td align="center" ><strong>' +   RedGreen(topercent(list2[0][11])) + "</strong> vs. " + addCommas(list2[0][12]) + '</td></tr>'; 

  //var htmlListArray3 = '<div><font size="1"><b><font color="#000000">NEW HOSPITALIZATIONS&nbsp;</font></b><br></font></div><table cellspacing="0" cellpadding="0" dir="ltr" border="0" style=""><colgroup><col width="100"><col width="100"><col width="100"><col width="100"><col width="100"></colgroup>' + tableHead1 + '<tbody>' + tablebody3 + tablebodyr3 + '</tbody></table>';
  //htmlListArray3 +=  "<div>" + list1[0][2] + " now accounts for " + addCommas(list1[0][24+5])  + " or " + topercent(list1[0][24+5]/list2[0][24+5]) + " of the US's " + addCommas(list2[0][24+5])  + " total hospitalizations.</div><br>"



  tablebody3 = '<tr><td><strong> ' + list1[0][2] + '</strong></td><td align="center" ><strong> ' + addCommas(list1[0][13]) + '</strong></td><td align="center" ><strong>' + RedGreen(topercent(list1[0][14])) + "</strong> vs. " + addCommas(list1[0][15]) + '</td><td align="center" ><strong>' + RedGreen(topercent(list1[0][16])) + "</strong> vs. " + addCommas(list1[0][17]) + '</td></tr>';

  tablebodyr3 = '<tr><td><strong> ' + list2[0][2] + '</strong></td><td align="center" ><strong> ' + addCommas(list2[0][13]) + '</strong></td><td align="center" ><strong>' + RedGreen(topercent(list2[0][14])) + "</strong> vs. " + addCommas(list2[0][15]) + '</td><td align="center" ><strong>' + RedGreen(topercent(list2[0][16])) + "</strong> vs. " + addCommas(list2[0][17]) + '</td></tr>';

  var htmlListArray3 = '<div><font size="1"><b><font color="#000000">NEWLY REPORTED DEATHS<font color="#EA452F">  +% increases in red (bad) &nbsp;</font></b><br></font></div><table cellspacing="0" cellpadding="0" dir="ltr" border="0" style=""><colgroup><col width="100"><col width="100"><col width="100"><col width="100"><col width="100"></colgroup>' + tableHead1 + '<tbody>' + tablebody3 + tablebodyr3 + '</tbody></table>';
  htmlListArray3 += "<div>" + list1[0][2] + " was " + ordinal_suffix_of(list1[0][41]) + " today: " + setDecimalPlaces(list1[0][40]) + " new deaths per 1MM residents | " + addCommas(list1[0][30]) + " to date </div><br>";

  //tablebody5 =  '<tr><td><strong> ' + list1[0][2] +  '</strong></td><td align="center" ><strong> ' +   addCommas(list1[0][15]) + '</strong></td><td align="center" >' +   GreenRed(topercent(list1[0][16])) + " vs. " + addCommas(list1[0][21]) + '</td><td align="center" >' +   GreenRed(topercent(list1[0][18])) + " vs. " + addCommas(list1[0][21]) + '</td></tr>'; 

  //tablebodyr5 =  '<tr><td><strong> ' + list2[0][2] + '</strong></td><td align="center" ><strong> ' +   addCommas(list2[0][15]) + '</strong></td><td align="center" >' +   GreenRed(topercent(list2[0][16])) + " vs. " + addCommas(list1[0][21]) + '</td><td align="center" >' +   GreenRed(topercent(list2[0][18])) + " vs. " + addCommas(list1[0][21]) + '</td></tr>'; 

  //var htmlListArray5 = '<div><font size="1"><b><font color="#000000">NEW RECOVERIES&nbsp;</font></b><br></font></div><table cellspacing="0" cellpadding="0" dir="ltr" border="0" style=""><colgroup><col width="100"><col width="100"><col width="100"><col width="100"><col width="100"></colgroup>' + tableHead1 + '<tbody>' + tablebody5 + tablebodyr5 + '</tbody></table>';
  //htmlListArray5 +=  "<div>" + list1[0][2] + " now accounts for " + addCommas(list1[0][26+5])  + " or " + topercent(list1[0][26+5]/list2[0][26+5]) + " of the US's " + addCommas(list2[0][26+5])  + " total recoveries.</div><br>"  

  htmlListArrays = '<font size="1" style="font-size:x-small;font-family: Calibri;">' + htmlListArray1 + htmlListArray2 + htmlListArray3 + '</font>';
  return htmlListArrays;
}

/**
 * @typedef {({
 *  records : (any[][])
 *  sheet : (GoogleAppsScript.Spreadsheet.Sheet | undefined)
 * })} getCandidatesConfig
 * 
 * @param {getCandidatesConfig} config
 * @returns {Candidate[]}
 */
function getCandidates({
  sheet = SpreadsheetApp.getActiveSheet(),
  records
} = config) {

  return records.map(record => {

    const [id, subscribed, email, state, status] = record;

    const [name] = email.split("@");

    const [
      first_name,
      last_name = ""
    ] = name.split(".");

    return ({
      id,
      first_name,
      last_name,
      email,
      state,
      status,
      subscribed,
      get name() {
        return `${this.first_name} ${this.last_name}`;
      }
    });
  });

}

/**
 * @typedef {({
 *  first_name : string,
 *  id : (string | number),
 *  last_name : string,
 *  name : string,
 *  email : string,
 *  state : (string | undefined),
 *  status : (string | undefined),
 *  subscribed : Date
 * })} Candidate
 * 
 * @param {number} row
 * @returns {Candidate}
 */
function getCandidateFromRow(row) {

  const sheet = SpreadsheetApp.getActiveSheet();

  const values = sheet.getRange(row, 1, 1, 7).getValues();

  return getCandidates({
    sheet, 
    records: values
  })[0];
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Date}
 */
function getcelldate(
  sheet
) {
  return new Date(sheet.getRange("A2").getValue());
}

/**
 * @summary appends ordinal suffix
 * @param {number} i 
 * @returns {string}
 */
function ordinal_suffix_of(i) {
  var j = i % 10,
    k = i % 100;

  if (j === 1 && k !== 11) {
    return i + "st";
  }

  if (j === 2 && k !== 12) {
    return i + "nd";
  }

  if (j === 3 && k !== 13) {
    return i + "rd";
  }

  return i + "th";
}