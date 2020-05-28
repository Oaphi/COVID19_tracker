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
 * @param {boolean} sandboxed
 */
const sendout = (sheet, covidStatsSheet, sandboxed) =>

    /**
     * @param {State} STATE
     * @param {number} startAt
     */
    (STATE, startAt) => {

        const START_COL = 1, END_COL = 7;

        const totalUS = getTotalByUS(covidStatsSheet);

        const covidDataByState = {};

        const numUsefulColumns = 42;

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

            try {
                handleApproval2(candidate, approvalConfig, sandboxed);
            }
            catch (error) {
                console.log(error);
                STATE.save();
            }

            rowIndicesSent.push(rowIndex);

            STATE.count();
        }

        if (sandboxed) {
            handleSandbox(approvalConfig.emails);
        }

        updateSentStatus({
            rows: rowIndicesSent,
            sheet
        });

        STATE.processed === candidates.length ? STATE.allDone() : STATE.save();
    };

/**
 * @summary builds confirmation popup
 * @param {boolean} [sandboxed]
 * @returns {boolean}
 */
function doApprove(sandboxed = false) {

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    const covidStatsSheet = spreadsheet.getSheetByName("Covid19");

    const usersSheet = spreadsheet.getSheetByName("Users");

    var ui = SpreadsheetApp.getUi();

    const state = State
        .getState({
            callback: sendout(usersSheet, covidStatsSheet, sandboxed)
        });

    var candidate = getCandidateFromRow( usersSheet, state.start);

    var response = ui.alert('Mail will be sent starting from ' + candidate.name + ', confirm?', ui.ButtonSet.YES_NO);

    if (response === ui.Button.YES) {

        state.continue();

        console.log('Mail sent successfully');

        return true;
    }

    console.log('Cancelled');
    return false;
}

/**
 * @summary launches the workflow, but does not send out the emails
 */
const sandboxApprove = () => {

    const isSandboxed = true;

    return doApprove(isSandboxed);
};