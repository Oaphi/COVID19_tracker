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
 * @summary gets total statistics by US
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 
 * @returns {(string | number)[]}
 */
const getTotalByUS = (sheet) => {
    return (sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues())[0];
};

/**
 * @typedef {({
 *  commonTemplate : (GoogleAppsScript.HTML.HtmlTemplate | undefined),
 *  commonTemplateValues : Object.<string, string>,
 *  covidDataByState : Object.<string, (number | string)[]>,
 *  currentDate : Date,
 *  currentWeekday : string,
 *  emails : object[],
 *  spreadsheet : (GoogleAppsScript.Spreadsheet.Spreadsheet),
 *  sheet : (GoogleAppsScript.Spreadsheet.Sheet),
 *  timezone : (string),
 *  totalUS : (string | number)[][]
 * })} approvalConfig
 * 
 * @summary fills template and sends out emails
 * @param {Candidate} candidate 
 * @param {approvalConfig} config
 * @param {boolean} sandboxed
 * @returns {void}
 */
function handleApproval2(
    candidate,
    {
        emails,
        commonTemplateValues,
        commonTemplate,
        totalUS,
        covidDataByState,
        currentDate,
        timezone = Session.getScriptTimeZone(),
        currentWeekday
    } = config,
    sandboxed
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

    const countryTestsPercent1 = getOrInitProp(
        commonTemplateValues,
        "countryTestsPercent1",
        () => topercent(totalUS[24])
    );
    commonTemplate.countryTES1val = GreenRed2(countryTestsPercent1)[1];
    commonTemplate.countryTES1clr = "color:" + GreenRed2(countryTestsPercent1)[0];

    const countryTestsPercent2 = getOrInitProp(
        commonTemplateValues,
        "countryTestsPercent2",
        () => topercent(totalUS[26])
    );
    commonTemplate.countryTES2val = GreenRed2(countryTestsPercent2)[1];
    commonTemplate.countryTES2clr = "color:" + GreenRed2(countryTestsPercent2)[0];

    const countryInfectionsPercent1 = getOrInitProp(
        commonTemplateValues,
        "countryInfectionsPercent1",
        () => topercent(totalUS[4])
    );
    commonTemplate.countryINF1val = RedGreen2(countryInfectionsPercent1)[1];
    commonTemplate.countryINF1clr = "color:" + RedGreen2(countryInfectionsPercent1)[0];

    const countryInfectionsPercent2 = getOrInitProp(
        commonTemplateValues,
        "countryInfectionsPercent2",
        () => topercent(totalUS[6])
    );
    commonTemplate.countryINF2val = GreenRed2(countryInfectionsPercent2)[1];
    commonTemplate.countryINF2clr = "color:" + RedGreen2(countryInfectionsPercent2)[0];

    const countryDeathspercent1 = getOrInitProp(
        commonTemplateValues,
        "countryDeathspercent1",
        () => topercent(totalUS[14])
    );
    commonTemplate.countryDEA1val = RedGreen2(countryDeathspercent1)[1];
    commonTemplate.countryDEA1clr = "color:" + RedGreen2(countryDeathspercent1)[0];

    const countryDeathsPercent2 = getOrInitProp(
        commonTemplateValues,
        "countryDeathsPercent2",
        () => RedGreen2(
            topercent(totalUS[16])
        )
    );
    commonTemplate.countryDEA2val = countryDeathsPercent2[1];
    commonTemplate.countryDEA2clr = "color:" + countryDeathsPercent2[0];

    const countryRatioInfectedToTests = getOrInitProp(
        commonTemplateValues,
        "countryRatioInfectedToTests",
        () => topercent(totalUS[43])
    );
    commonTemplate.countryRatioInfectedToTests = countryRatioInfectedToTests;

    const stateInfectionsPercent1 = topercent(userStateData[4]);
    commonTemplate.stateINF1val = RedGreen2(stateInfectionsPercent1)[1];
    commonTemplate.stateINF1clr = "color:" + RedGreen2(stateInfectionsPercent1)[0];

    const stateInfectionsPercent2 = topercent(userStateData[6]);
    commonTemplate.stateINF2val = RedGreen2(stateInfectionsPercent2)[1];
    commonTemplate.stateINF2clr = "color:" + RedGreen2(stateInfectionsPercent2)[0];

    const stateTestPercent1 = topercent(userStateData[24]);
    commonTemplate.stateTES1val = GreenRed2(stateTestPercent1)[1];
    commonTemplate.stateTES1clr = "color:" + GreenRed2(stateTestPercent1)[0];

    const stateTestPercent2 = topercent(userStateData[26]);
    commonTemplate.stateTES2val = GreenRed2(stateTestPercent2)[1];
    commonTemplate.stateTES2clr = "color:" + GreenRed2(stateTestPercent2)[0];

    commonTemplate.TESstatement = buildStatement(
        state,
        userStateData[37],
        userStateData[36],
        "tests",
        userStateData[32]
    );

    commonTemplate.INFstatement = buildStatement(
        state,
        userStateData[39],
        userStateData[38],
        "infections",
        userStateData[28]
    );

    commonTemplate.DEAstatement = buildStatement(
        state,
        userStateData[41],
        userStateData[40],
        "deaths",
        userStateData[30]
    );

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

    const stateRatioInfectedToTests = userStateData[43];
    commonTemplate.stateRatioInfectedToTests = topercent(stateRatioInfectedToTests);

    const stateInfectedToTestedRank = userStateData[44];
    commonTemplate.stateInfectedToTestedRank = stateInfectedToTestedRank;

    commonTemplate.INF2statement = buildRatioStatement(
        state,
        stateInfectedToTestedRank,
        commonTemplate.stateRatioInfectedToTests
    );
    
    const subject = `${FullStatee} COVID-19 daily report: ${currentWeekday}` + formattedDate;

    const localeDate = currentDate.toLocaleDateString();

    commonTemplate.analyticsEmailOpen = trackEmailOpen(sandboxed, candidate, {
        el: FullStatee,
        ev: currentDate.valueOf(),
        dp: `/email/${state}/${localeDate}`
    });

    var message = commonTemplate.evaluate().getContent();

    if (sandboxed) {
        emails.push({
            to: candidate.email,
            subject,
            message
        });
        return;
    }

    sendEmail({
        to: candidate.email,
        subject,
        html: message
    });
}

/**
 * @typedef {({
 *  to : string,
 *  subject : string,
 *  message : string
 * })} emailConfig
 * 
 * @param {emailConfig[]} emails
 * @returns {void}
 */
const handleSandbox = (emails) => {

    const html = emails.map(email => {
        const { to, subject, message } = email;
        return `<h2>To: ${to}</h2><h3>Subject: ${subject}</h3>${message}`;
    }).join("");

    const ui = SpreadsheetApp.getUi();

    const output = HtmlService.createHtmlOutput(html);

    const modalConfig = ({
        width: 800,
        get height() {
            return this.width * 1.25;
        }
    });

    output
        .setWidth(modalConfig.width)
        .setHeight(modalConfig.height);

    ui.showModalDialog(output, "Sandbox");
};

/**
 * @summary handles sendout errors
 * @param {Error} error 
 * @param {Candidate} candidate
 * @returns {boolean}
 */
const handleError = (error, candidate) => {

    const ui = SpreadsheetApp.getUi();

    const { message } = error;

    const {
        email,
        state
    } = candidate;

    const shouldContinue = ui.alert(
        "Sendout error",
        `Failed to send the data for ${state} to ${email}\n\nReason: ${message}`,
        ui.ButtonSet.OK_CANCEL
    );

    return shouldContinue === ui.Button.CANCEL;
};