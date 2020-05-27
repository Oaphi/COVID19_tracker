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
 *  first_name: string,
 *  last_name: string,
 *  name: string,
 *  email: string
 * })} Candidate
 * 
 * @param {number} row
 * @returns {Candidate}
 */
function getCandidateFromRow(row) {
  var values = SpreadsheetApp.getActiveSheet().getRange(row, 1, row, 3).getValues();
  var rec = values[0];

  var candidate =
  {
    first_name: rec[0],
    last_name: rec[1],
    email: rec[2]
  };

  candidate.name = candidate.first_name;

  return candidate;
}

/**
 * @returns {Date}
 */
function getcelldate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("Covid19");
  var cellDate = new Date(ws.getRange("A2").getValue().getTime());
  return cellDate;
}

/**
 * @summary fills template and sends out emails
 * @param {number} row 
 * @param {Candidate} candidate 
 * @returns {void}
 */
function handleApproval(row, candidate) {
  var templ = HtmlService
    .createTemplateFromFile('candidate-email');
  Logger.log('row:' + row);
  templ.candidate = candidate;
  var activeSheet = SpreadsheetApp.getActiveSheet();
  var Statee = activeSheet.getRange(row, 4).getValue();
  var userId = activeSheet.getRange(row, 1).getValue();
  templ.tables = LoadTable(Statee);
  templ.Statee = Statee;
  templ.twitterLink = LoadTwitter(Statee);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("Covid19");

  var data = ws.getRange(1, 2, 60).getValues();

  var roww;

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === Statee) { //[1] because column B
      roww = i + 1;
    }
  }


  var list1 = ws.getRange(roww, 1, 1, 28).getValues();
  var FullStatee = list1[0][2];

  var cellDate = getcelldate();

  templ.FullStatee = FullStatee;


  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];
  var fulldate = days[(cellDate).getDay()];

  templ.fulldate = fulldate;
  templ.emailId = userId;

  //TODO: same work (make scalable) starts here:

  var timeZone = Session.getScriptTimeZone();
  var message = templ.evaluate().getContent();
  var subjecte = FullStatee + " COVID-19 daily report: " + fulldate + Utilities.formatDate(cellDate, timeZone, ' M/d/YY');
  MailApp.sendEmail({
    name: "covidping.com",
    to: candidate.email,
    subject: subjecte,
    htmlBody: message
  });

  SpreadsheetApp.getActiveSheet().getRange(row, 5).setValue('Mail Sent');

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

/**
 * @summary fills template and sends out emails
 * @param {number} row 
 * @param {Candidate} candidate 
 * @returns {void}
 */
function handleApproval2(row, candidate) {

  var templ = HtmlService.createTemplateFromFile('candidate-email2');

  Logger.log('row:' + row);
  templ.candidate = candidate;



  var activeSheet = SpreadsheetApp.getActiveSheet();
  var Statee = activeSheet.getRange(row, 4).getValue();
  var userId = activeSheet.getRange(row, 1).getValue();
  //templ.tables = LoadTable(Statee);
  templ.Statee = Statee;
  templ.twitterLink = LoadTwitter(Statee);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("Covid19");

  var data = ws.getRange(1, 2, 60).getValues();

  var roww;

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === Statee) { //[1] because column B
      roww = i + 1;
    }
  }


  var list1 = ws.getRange(roww, 1, 1, 43).getValues();
  var list2 = ws.getRange(2, 1, 1, 43).getValues();
  var FullStatee = list1[0][2];

  var cellDate = getcelldate();

  templ.FullStatee = FullStatee;

  templ.stateTES0 = addCommas(list1[0][23]);
  templ.stateTES1val = GreenRed2(topercent(list1[0][24]))[1];
  templ.stateTES1clr = "color:" + GreenRed2(topercent(list1[0][24]))[0];
  templ.stateTES1cmp = addCommas(list1[0][25]);

  templ.stateTES2val = GreenRed2(topercent(list1[0][26]))[1];
  templ.stateTES2clr = "color:" + GreenRed2(topercent(list1[0][26]))[0];
  templ.stateTES2cmp = addCommas(list1[0][27]);

  templ.countryTES0 = addCommas(list2[0][23]);
  templ.countryTES1val = GreenRed2(topercent(list2[0][24]))[1];
  templ.countryTES1clr = "color:" + GreenRed2(topercent(list2[0][24]))[0];
  templ.countryTES1cmp = addCommas(list2[0][25]);

  templ.countryTES2val = GreenRed2(topercent(list2[0][26]))[1];
  templ.countryTES2clr = "color:" + GreenRed2(topercent(list2[0][26]))[0];
  templ.countryTES2cmp = addCommas(list2[0][27]);

  templ.TESstatement = list1[0][2] + " was " + ordinal_suffix_of(list1[0][37]) + " today: " + setDecimalPlaces(list1[0][36]) + " new tests per 1MM residents | " + addCommas(list1[0][32]) + " total";

  templ.stateTES2 = addCommas(list1[0][25]);

  /**
   * @typedef {({
   *    stateINF0,
   *    stateINF1clr,
   *    stateINF1cmp,
   *    stateINF1val
   * })} TemplateConfig
   */

  templ.stateINF0 = addCommas(list1[0][3]);
  templ.stateINF1val = RedGreen2(topercent(list1[0][4]))[1];
  templ.stateINF1clr = "color:" + RedGreen2(topercent(list1[0][4]))[0];
  templ.stateINF1cmp = addCommas(list1[0][5]);

  templ.stateINF2val = RedGreen2(topercent(list1[0][6]))[1];
  templ.stateINF2clr = "color:" + RedGreen2(topercent(list1[0][6]))[0];
  templ.stateINF2cmp = addCommas(list1[0][7]);

  templ.countryINF0 = addCommas(list2[0][3]);
  templ.countryINF1val = RedGreen2(topercent(list2[0][4]))[1];
  templ.countryINF1clr = "color:" + RedGreen2(topercent(list2[0][4]))[0];
  templ.countryINF1cmp = addCommas(list2[0][5]);

  templ.countryINF2val = GreenRed2(topercent(list2[0][6]))[1];
  templ.countryINF2clr = "color:" + RedGreen2(topercent(list2[0][6]))[0];
  templ.countryINF2cmp = addCommas(list2[0][7]);

  templ.INFstatement = list1[0][2] + " was " + ordinal_suffix_of(list1[0][39]) + " today: " + setDecimalPlaces(list1[0][38]) + " new infections per 1MM residents | " + addCommas(list1[0][28]) + " total";

  templ.stateINF2 = addCommas(list1[0][5]);

  templ.stateINF0 = addCommas(list1[0][3]);


  templ.stateDEA0 = addCommas(list1[0][13]);
  templ.stateDEA1val = RedGreen2(topercent(list1[0][14]))[1];
  templ.stateDEA1clr = "color:" + RedGreen2(topercent(list1[0][14]))[0];
  templ.stateDEA1cmp = addCommas(list1[0][15]);

  templ.stateDEA2val = RedGreen2(topercent(list1[0][16]))[1];
  templ.stateDEA2clr = "color:" + RedGreen2(topercent(list1[0][16]))[0];
  templ.stateDEA2cmp = addCommas(list1[0][17]);

  templ.countryDEA0 = addCommas(list2[0][13]);
  templ.countryDEA1val = RedGreen2(topercent(list2[0][14]))[1];
  templ.countryDEA1clr = "color:" + RedGreen2(topercent(list2[0][14]))[0];
  templ.countryDEA1cmp = addCommas(list2[0][15]);

  templ.countryDEA2val = RedGreen2(topercent(list2[0][16]))[1];
  templ.countryDEA2clr = "color:" + RedGreen2(topercent(list2[0][16]))[0];
  templ.countryDEA2cmp = addCommas(list2[0][17]);

  templ.DEAstatement = list1[0][2] + " was " + ordinal_suffix_of(list1[0][41]) + " today: " + setDecimalPlaces(list1[0][40]) + " new deaths per 1MM residents | " + addCommas(list1[0][30]) + " total";

  templ.stateDEA2 = addCommas(list1[0][15]);


  templ.countryTOTtes = addCommas(list2[0][32]);
  templ.countryTOTinf = addCommas(list2[0][28]);
  templ.countryTOTdea = addCommas(list2[0][30]);


  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];
  var fulldate = days[(cellDate).getDay()];

  templ.fulldate = fulldate;

  templ.emailId = userId;

  //current work scope starts here:

  var timeZone = Session.getScriptTimeZone();
  var message = templ.evaluate().getContent();
  var subjecte = FullStatee + " COVID-19 daily report: " + fulldate + Utilities.formatDate(cellDate, timeZone, ' M/d/YY');

  MailApp.sendEmail({
    name: "covidping.com",
    to: candidate.email,
    subject: subjecte,
    htmlBody: message
  });

  SpreadsheetApp.getActiveSheet().getRange(row, 5).setValue('Mail Sent');

}