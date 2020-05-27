/**
 * @summary builds confirmation popup
 * @returns {boolean}
 */
function doApprove() {
    var cell = SpreadsheetApp.getActiveSheet().getActiveCell();
    var row = cell.getRow();


    var candidate = getCandidateFromRow(row);
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert('Mail will be send from  ' + candidate.name + '?', ui.ButtonSet.YES_NO);


    if (response === ui.Button.YES) {

        var ws = SpreadsheetApp.getActiveSheet();
        var eamilcount = ws.getRange(1, 3, ws.getLastRow(), 3).getValues();

        for (var i = row - 1; i < eamilcount.length; i++) {

            if (eamilcount[i][0] === "" || eamilcount[i][1] === "" || eamilcount[i][2] === "Mail Sent") {
                //no op?
                return;
            }
            else {
                candidate = getCandidateFromRow(i + 1);
                handleApproval2(i + 1, candidate);
            }
        }

        Logger.log('Mail sent successfully');

        return true;
    }

    Logger.log('Cancelled');
    return false;
}