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
        console.warn(`Failed to send email to ${to}:\n\n${error}`);
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

        const records = sheet.getRange(startRow, START_COL, sheet.getLastRow(), END_COL).getValues();

        const candidates = getCandidates({
            startRow,
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

                handleApproval2(candidate, approvalConfig, sandboxed);

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

        if (sandboxed) {
            handleSandbox(approvalConfig.emails);
        }

        updateSentStatus({
            rows: rowIndicesSent,
            sheet
        });

        STATE.processed === candidates.length ? STATE.allDone() : STATE.save();
    };