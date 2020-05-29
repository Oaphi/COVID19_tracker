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

    var candidate = getCandidateFromRow(usersSheet, state.start);

    var response = ui.alert('Mail will be sent starting from ' + candidate.name + ', confirm?', ui.ButtonSet.YES_NO);

    if (response === ui.Button.YES) {

        const quotaInfo = checkRemainingQuota();

        if (quotaInfo.status) {

            const shouldContinue = ui.alert(
                `Your Daily Quota`,
                `Daily quota remaining: ${quotaInfo.availablePercent}%.\nContinue?`,
                ui.ButtonSet.YES_NO
            );

            if(shouldContinue === ui.Button.NO) {
                console.log("Sendout cancelled");
                return false;
            }

            state.continue();

            console.log('Mail sent successfully');

            return true;
        }

        console.log("Mailing quota overflow");

    }

    console.log('Cancelled');
    return false;
}

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

    return ({
        remaining: quota,
        status: quota > 0,
        get availablePercent() {
            return parseInt((this.remaining / 2000) * 100);
        }
    });
};

/**
 * @summary launches the workflow, but does not send out the emails
 */
const sandboxApprove = () => {

    const isSandboxed = true;

    return doApprove(isSandboxed);
};