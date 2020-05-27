/**
 * @typedef {({
 *  html : string,
 *  name : string,
 *  subject : string,
 *  to : string
 * })} EmailSendoutConfig
 * 
 * @param {EmailSendoutConfig} config
 * @returns {boolean}
 */
const sendEmail = ({
    name = "covidping.com",
    to,
    subject,
    html
} = {}) => {

    try {

        MailApp.sendEmail({
            name,
            to,
            subject,
            htmlBody: html
        });

        return true;
    }
    catch (error) {
        console.log(`Failed to send email to ${to}:\n\n${error}`);
        return false;
    }

};

/**
 * 
 * @param {string} [email] 
 * @param {string} [state] 
 * @param {string} [status] 
 */
const validForSending = (email, state, status) => {
    return email && state && (status !== "Mail Sent");
};

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 
 * @param {GoogleAppsScript.Spreadsheet.Sheet} covidStatsSheet
 */
const sendout = (sheet, covidStatsSheet) =>

    /**
     * @param {State} STATE
     * @param {number} startAt
     */
    (STATE, startAt) => {

        const START_COL = 1, END_COL = 7;

        const totalUS = getTotalByUS(covidStatsSheet);

        const covidDataByState = {};

        const numUsefulColumns = 41;
        
        covidStatsSheet
            .getRange(3, 1, covidStatsSheet.getLastRow(), numUsefulColumns)
            .getValues()
            .forEach((stateData) => {
                covidDataByState[stateData[1]] = stateData;
            });

        const records = sheet.getRange(startAt, START_COL, sheet.getLastRow(), END_COL).getValues();
        
        const candidates = getCandidates({
            records,
            sheet
        });

        const currentDate = getcelldate(covidStatsSheet);

        const currentWeekday = getDayOfWeek(currentDate);

        const rowIndicesSent = [];

        /** @type {approvalConfig} */
        const approvalConfig = {
            emails: [],
            commonTemplateValues: {},
            commonTemplate: HtmlService.createTemplateFromFile('candidate-email2'),
            covidDataByState,
            currentDate,
            currentWeekday,
            sheet,
            timezone: STATE.timezone,
            totalUS
        };

        let rowIndex = startAt - 1;

        for (const candidate of candidates) {
            rowIndex++;

            const { email, state, status } = candidate;

            if (!validForSending(email, state, status)) {
                STATE.count();
                continue;
            }

            if (!STATE.canContinue()) {
                break;
            }

            handleApproval2(candidate, approvalConfig);

            rowIndicesSent.push(rowIndex);

            STATE.count();
        }

        const html = approvalConfig.emails.map(email => email.html).join("");
        const fd = DriveApp.getRootFolder();
        const folder = fd.createFolder("test_covid_email");
        const file = folder.createFile( "test_file", html, MimeType.HTML);

        updateSentStatus({
            rows: rowIndicesSent,
            sheet
        });

        STATE.processed === candidates.length ? STATE.allDone() : STATE.save();
    };

/**
 * @summary builds confirmation popup
 * @returns {boolean}
 */
function doApprove() {

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    const covidStatsSheet = spreadsheet.getSheetByName("Covid19");

    const usersSheet = spreadsheet.getSheetByName("Users");

    var ui = SpreadsheetApp.getUi();

    const state = State
        .getState({
            callback: sendout(usersSheet, covidStatsSheet)
        });

    var candidate = getCandidateFromRow(state.start);

    var response = ui.alert('Mail will be sent starting from ' + candidate.name + ', confirm?', ui.ButtonSet.YES_NO);

    if (response === ui.Button.YES) {

        state.continue();

        Logger.log('Mail sent successfully');

        return true;
    }

    Logger.log('Cancelled');
    return false;
}

function deleteSP() {
    const store = PropertiesService.getScriptProperties();
    store.deleteProperty("continuator");
    store.deleteProperty("test_covid_email")
}

function testSP() {
    const store = PropertiesService.getScriptProperties();
    const prop = store.getProperty("continuator");
    console.log({ prop });
}