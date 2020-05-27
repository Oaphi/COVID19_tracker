/**
 * @summary fills template and sends out emails
 * @param {number} row 
 * @param {Candidate} candidate 
 * @returns {void}
 */
function handleApproval(row, candidate) {

    var templ = HtmlService.createTemplateFromFile('candidate-email');

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

    var cellDate = getcelldate(ws);

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

    var timeZone = Session.getScriptTimeZone();
    var message = templ.evaluate().getContent();
    var subject = FullStatee + " COVID-19 daily report: " + fulldate + Utilities.formatDate(cellDate, timeZone, ' M/d/YY');

    // sendEmail({
    //   to: candidate.email,
    //   subject,
    //   html: message
    // });

    updateSentStatus({
        rows: [row],
        sheet: activeSheet
    });
}

/**
 * @typedef {({
 *  rows : number[],
 *  sheet : (GoogleAppsScript.Spreadsheet.Spreadsheet | undefined),
 *  status : (string | "Mail Sent"),
 *  statusColumn : (number | 5)
 * })} statusUpdateParams
 * 
 * @summary updates mail sent status
 * @param {statusUpdateParams} config
 * @returns {boolean}
 */
const updateSentStatus = ({
    rows,
    status = "Mail Sent",
    statusColumn = 5,
    sheet = SpreadsheetApp.getActiveSheet()
} = config) => {

    const consequentialRows = splitIntoConseq(rows);

    consequentialRows.forEach(sequence => {

        const { length } = sequence;

        const statusRange = sheet.getRange(sequence[0], statusColumn, length, 1);

        const statusArr = [];

        statusArr.length = length;

        statusRange.setValues(statusArr.fill([status]));
    });
};

/**
 * 
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 
 * @returns {(string | number)[]}
 */
const getTotalByUS = (sheet) => {
    return (sheet.getRange(2, 1, 1, 43).getValues())[0];
};

/**
 * @typedef {({
 *  commonTemplate : (GoogleAppsScript.HTML.HtmlTemplate | undefined),
 *  commonTemplateValues : Object.<string, string>,
 *  covidDataByState : Object.<string, (number | string)[]>,
 *  currentDate : Date,
 *  currentWeekday : string,
 *  spreadsheet : (GoogleAppsScript.Spreadsheet.Spreadsheet),
 *  sheet : (GoogleAppsScript.Spreadsheet.Sheet),
 *  timezone : (string),
 *  totalUS : (string | number)[][]
 * })} approvalConfig
 * 
 * @summary fills template and sends out emails
 * @param {Candidate} candidate 
 * @param {approvalConfig} config
 * @returns {void}
 */
function handleApproval2(
    candidate,
    {
        emails,
        commonTemplateValues,
        commonTemplate = HtmlService.createTemplateFromFile('candidate-email2'),
        totalUS,
        covidDataByState,
        currentDate,
        timezone = Session.getScriptTimeZone(),
        currentWeekday
    } = config
) {

    const {
        id,
        state
    } = candidate;

    const userStateData = covidDataByState[state];

    commonTemplate.countryTES0 = getOrInitProp(commonTemplateValues, "countryTES0", () => addCommas(totalUS[23]));
    commonTemplate.countryINF0 = getOrInitProp(commonTemplateValues, "countryINF0", () => addCommas(totalUS[3]));
    commonTemplate.countryINF1cmp = getOrInitProp(commonTemplateValues, "countryINF1cmp", () => addCommas(totalUS[5]));
    commonTemplate.countryINF2cmp = getOrInitProp(commonTemplateValues, "countryINF2cmp", () => addCommas(totalUS[7]));
    commonTemplate.countryDEA0 = getOrInitProp(commonTemplateValues, "countryDEA0", () => addCommas(totalUS[13]));
    commonTemplate.countryDEA1cmp = getOrInitProp(commonTemplateValues, "countryDEA1cmp", () => addCommas(totalUS[15]));
    commonTemplate.countryDEA2cmp = getOrInitProp(commonTemplateValues, "countryDEA2cmp", () => addCommas(totalUS[17]));
    commonTemplate.countryTES1cmp = getOrInitProp(commonTemplateValues, "countryTES1cmp", () => addCommas(totalUS[25]));
    commonTemplate.countryTES2cmp = getOrInitProp(commonTemplateValues, "countryTES2cmp", () => addCommas(totalUS[27]));
    commonTemplate.countryTOTinf = getOrInitProp(commonTemplateValues, "countryTOTinf", () => addCommas(totalUS[28]));
    commonTemplate.countryTOTdea = getOrInitProp(commonTemplateValues, "countryTOTdea", () => addCommas(totalUS[30]));
    commonTemplate.countryTOTtes = getOrInitProp(commonTemplateValues, "countryTOTtes", () => addCommas(totalUS[32]));


    var FullStatee = userStateData[2];

    const formattedDate = getOrInitProp(
        commonTemplateValues,
        "formattedDate",
        () => Utilities.formatDate(currentDate, timezone, ' M/d/YY')
    );

    commonTemplate.emailId = id;
    commonTemplate.fulldate = currentWeekday;
    commonTemplate.FullStatee = FullStatee;
    commonTemplate.Statee = state;
    commonTemplate.twitterLink = LoadTwitter(userStateData, formattedDate);

    const countryTestsPercent1 = getOrInitProp(commonTemplateValues, "countryTestsPercent1", () => topercent(totalUS[24]));
    commonTemplate.countryTES1val = GreenRed2(countryTestsPercent1)[1];
    commonTemplate.countryTES1clr = "color:" + GreenRed2(countryTestsPercent1)[0];

    const countryTestsPercent2 = getOrInitProp(commonTemplateValues, "countryTestsPercent2", () => topercent(totalUS[26]));
    commonTemplate.countryTES2val = GreenRed2(countryTestsPercent2)[1];
    commonTemplate.countryTES2clr = "color:" + GreenRed2(countryTestsPercent2)[0];

    const countryInfectionsPercent1 = getOrInitProp(commonTemplateValues, "countryInfectionsPercent1", () => topercent(totalUS[4]));
    commonTemplate.countryINF1val = RedGreen2(countryInfectionsPercent1)[1];
    commonTemplate.countryINF1clr = "color:" + RedGreen2(countryInfectionsPercent1)[0];

    const countryInfectionsPercent2 = getOrInitProp(commonTemplateValues, "countryInfectionsPercent2", () => topercent(totalUS[6]));
    commonTemplate.countryINF2val = GreenRed2(countryInfectionsPercent2)[1];
    commonTemplate.countryINF2clr = "color:" + RedGreen2(countryInfectionsPercent2)[0];

    const countryDeathspercent1 = getOrInitProp(commonTemplateValues, "countryDeathspercent1", () => topercent(totalUS[14]));
    commonTemplate.countryDEA1val = RedGreen2(countryDeathspercent1)[1];
    commonTemplate.countryDEA1clr = "color:" + RedGreen2(countryDeathspercent1)[0];

    commonTemplate.stateTES1val = GreenRed2(topercent(userStateData[24]))[1];
    commonTemplate.stateTES1clr = "color:" + GreenRed2(topercent(userStateData[24]))[0];

    commonTemplate.stateTES2val = GreenRed2(topercent(userStateData[26]))[1];
    commonTemplate.stateTES2clr = "color:" + GreenRed2(topercent(userStateData[26]))[0];

    const stateInfectionsPercent1 = topercent(userStateData[4]);
    commonTemplate.stateINF1val = RedGreen2(stateInfectionsPercent1)[1];
    commonTemplate.stateINF1clr = "color:" + RedGreen2(stateInfectionsPercent1)[0];

    commonTemplate.stateINF2val = RedGreen2(topercent(userStateData[6]))[1];
    commonTemplate.stateINF2clr = "color:" + RedGreen2(topercent(userStateData[6]))[0];

    commonTemplate.TESstatement = buildStatement(FullStatee, userStateData[37], userStateData[36], "tests", userStateData[32]);
    commonTemplate.INFstatement = buildStatement(FullStatee, userStateData[39], userStateData[38], "infections", userStateData[28]);
    commonTemplate.DEAstatement = buildStatement(FullStatee, userStateData[41], userStateData[40], "deaths", userStateData[30]);

    commonTemplate.stateINF0 = addCommas(userStateData[3]);

    commonTemplate.stateINF1cmp = addCommas(userStateData[5]);

    commonTemplate.stateINF2 = addCommas(userStateData[5]);
    commonTemplate.stateINF2cmp = addCommas(userStateData[7]);

    commonTemplate.stateDEA0 = addCommas(userStateData[13]);
    commonTemplate.stateDEA1cmp = addCommas(userStateData[15]);

    commonTemplate.stateDEA2 = addCommas(userStateData[15]);
    commonTemplate.stateDEA2cmp = addCommas(userStateData[17]);

    commonTemplate.stateTES0 = addCommas(userStateData[23]);

    commonTemplate.stateTES1cmp = addCommas(userStateData[25]);

    commonTemplate.stateTES2 = addCommas(userStateData[25]);
    commonTemplate.stateTES2cmp = addCommas(userStateData[27]);

    const stateDeathspercent1 = topercent(userStateData[14]);
    commonTemplate.stateDEA1val = RedGreen2(stateDeathspercent1)[1];
    commonTemplate.stateDEA1clr = "color:" + RedGreen2(stateDeathspercent1)[0];

    const stateDeathspercent2 = topercent(userStateData[16]);
    commonTemplate.stateDEA2val = RedGreen2(stateDeathspercent2)[1];
    commonTemplate.stateDEA2clr = "color:" + RedGreen2(stateDeathspercent2)[0];


    commonTemplate.countryDEA2val = RedGreen2(topercent(totalUS[16]))[1];
    commonTemplate.countryDEA2clr = "color:" + RedGreen2(topercent(totalUS[16]))[0];

    var message = commonTemplate.evaluate().getContent();

    var subject = FullStatee + " COVID-19 daily report: " + currentWeekday + formattedDate;

    emails.push({
        to : candidate.email,
        subject,
        html: message
    });

    // sendEmail({
    //   to: "o.a.philippov@gmail.com",
    //   subject,
    //   html: message
    // });
}