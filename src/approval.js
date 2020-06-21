/**
 * @summary builds confirmation popup
 * 
 * @param {{
 *  safe : (boolean|undefined),
 *  sandboxed : (boolean|undefined),
 *  max : number
 * }} config
 * 
 * @returns {boolean}
 */
function doApprove({
    sandboxed = false,
    safe = false
} = {}) {
    const quotaInfo = checkRemainingQuota();

    const config = { sandboxed, safe };
    safe && (config.max = quotaInfo.remaining);

    const userEmail = getUserEmail();

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    const { statsShName, userShName } = CONFIG;
    const covidStatsSheet = spreadsheet.getSheetByName(statsShName);
    const usersSheet = spreadsheet.getSheetByName(userShName);

    const ui = SpreadsheetApp.getUi();

    const selectedUserRow = getCurrentlySelectedCandidate(usersSheet);

    const state = State
        .getState({
            start: selectedUserRow,
            callback: sendout(usersSheet, covidStatsSheet, config),
            type: sandboxed ? "sandbox" : "production"
        });

    selectedUserRow && state.overrideStart(selectedUserRow);

    const candidate = getCandidateFromRow(usersSheet, selectedUserRow || state.start);
    
    const safePrompt = safe ? "in safe mode" : "";

    const response = ui.alert(
        `Starting ${safePrompt} from user ${candidate.name}, state ${candidate.state}, confirm?`,
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {

        const {
            availablePercent,
            remaining,
            status
        } = quotaInfo;

        if (status) {

            const pluralEmail = pluralizeCountable(remaining, "email");

            const numSendable = `\n\nYou will be able to send ${pluralEmail}`;

            const {
                previousFailures,
                previousSuccesses,
                lastTimeFailed,
                lastTimeSucceeded
            } = state;

            const pluralFailure = pluralizeCountable(previousFailures, "problem");
            const pluralSuccess = pluralizeCountable(previousSuccesses, "email");

            const lastError = lastTimeFailed ? `\nLast problem: ${new Date(lastTimeFailed).toLocaleString()} (${pluralFailure} found)` : "";

            const lastSuccess = lastTimeSucceeded ? `\nLast success: ${new Date(lastTimeSucceeded).toLocaleString()} (${pluralSuccess} sent)` : "";

            const lastRan = lastError || lastSuccess ? `\n${lastError}${lastSuccess}\n` : "\n";

            const shouldContinue = ui.alert(
                `Your Daily Quota`,
                `Daily quota remaining: ${availablePercent}%.${numSendable}${lastRan}\nContinue?`,
                ui.ButtonSet.YES_NO
            );

            if (shouldContinue === ui.Button.NO || shouldContinue === ui.Button.CLOSE) {
                console.log("Sendout cancelled");
                return false;
            }

            state.continue();

            console.log('Mail sent successfully');

            return true;
        }

        ui.alert(`You reached the quota limit for the account:\n\n${userEmail}`);
        console.log("Mailing quota overflow");
        return false;
    }

    console.log('Sendout unconfirmed');
    return false;
}

/**
 * @summary gets row index if selected an email to start from
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 
 * @returns {(number | undefined)}
 */
const getCurrentlySelectedCandidate = (sheet) => {

    const activeCell = sheet.getActiveCell();

    const emailListColumn = 3;

    if (activeCell.getColumn() === emailListColumn) {
        return activeCell.getRow();
    }
};

/**
 * @typedef {({
 *  availablePercent : number,
 *  status : boolean,
 *  remaining : number
 * })} quotaResult
 * 
 * @summary checks remaining quota
 * @returns {quotaResult}
 */
const checkRemainingQuota = () => {

    const quota = MailApp.getRemainingDailyQuota();

    const maxUniqueEmails = 1500;

    return ({
        remaining: quota,
        status: quota > 0,
        get availablePercent() {
            return Math.round((this.remaining / maxUniqueEmails) * 100);
        }
    });
};

/**
 * @summary launches the workflow, but does not send out the emails
 */
const sandboxApprove = () => {

    const config = {
        sandboxed: true
    };

    return doApprove(config);
};

const safeSandboxApprove = () => {
    return doApprove({
        safe: true,
        sandboxed: true
    });
};

/**
 * @summary launches the workflow, but stops as soon as quota is reached
 */
const safeApprove = () => {

    const config = {
        safe: true
    };

    return doApprove(config);
};