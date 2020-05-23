/**
 * @summary generates main menu of the script
 * @param {GoogleAppsScript.Events.SheetsOnOpen} e event object
 * @returns {void}
 */
function onOpen(e) {
    var ui = SpreadsheetApp.getUi();

    ui.createMenu('Covid19_Send_Email')
        .addItem('Approve', 'doApprove')
        .addToUi();

    ui.createMenu('Refresh_Data')
        .addItem('Refresh', 'Covid19Refresh')
        .addToUi();
}