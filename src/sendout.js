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
 * @param {{sandboxed:boolean,safe:boolean, max:number}} config
 */
const sendout = (sheet, covidStatsSheet, { safe, sandboxed, max }) =>

    /**
     * @param {State} STATE
     * @param {number} startRow
     */
    (STATE, startRow) => {

        const START_COL = 1, END_COL = 7;

        const totalUS = getTotalByUS(covidStatsSheet);

        const covidDataByState = {};

        covidStatsSheet
            .getRange(3, 1, covidStatsSheet.getLastRow(), covidStatsSheet.getLastColumn())
            .getValues()
            .forEach((stateData) => {
                covidDataByState[stateData[1]] = stateData;
            });

        const records = sheet.getRange(startRow, START_COL, max || sheet.getLastRow() - 1, END_COL).getValues();

        const candidates = getCandidates({ startRow, records, sheet });

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
            indices: getIndices(),
            sheet,
            timezone: STATE.timezone,
            totalUS
        };

        let rowIndex = startRow - 1;

        for (const candidate of candidates) {
            rowIndex++;

            const { email, state, status } = candidate;

            if (!validForSending(email, state, status)) {
                STATE.incrementStartIfNoFailures();
                continue;
            }

            if (!STATE.canContinue()) {
                break;
            }

            try {

                const result = handleApproval2(candidate, approvalConfig, sandboxed);

                if (!result) {
                    STATE.countFailed().saveFailure();
                    continue;
                }

                rowIndicesSent.push(rowIndex);

                STATE
                    .countSucceeded()
                    .incrementStartIfNoFailures();

            }
            catch (error) {

                STATE
                    .countFailed()
                    .saveFailure();

                const isCancelled = handleError(error, candidate);

                if (isCancelled) {
                    break;
                }
            }


        }

        updateSentStatus({
            rows: rowIndicesSent,
            sheet
        });

        STATE.processed === candidates.length ? STATE.allDone() : STATE.save();

        promptSendoutStats(STATE);

        if (sandboxed && STATE.succeeded > 0) {
            Utilities.sleep(1e4); //wait 10 seconds before new dialog
            handleSandbox(approvalConfig.emails);
        }
    };