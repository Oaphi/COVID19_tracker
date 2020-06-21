/**
 * @summary generates main menu of the script
 * @param {GoogleAppsScript.Events.SheetsOnOpen} e event object
 * @returns {void}
 */
function onOpen() {

    getOrInstallInfectionsByTests();

    const ui = SpreadsheetApp.getUi();

    const safeMode = ui.createMenu("Safe Mode")
        .addItem("Production", "safeApprove")
        .addItem("Sandbox", "safeSandboxApprove");

    ui.createMenu('Covid19_Send_Email')
        .addItem('Approve', 'doApprove')
        .addItem("Sandbox", "sandboxApprove")
        .addSeparator()
        .addSubMenu(safeMode)
        .addSeparator()
        .addItem("Reset", "resetPersistedState")
        .addToUi();

    ui.createMenu('Refresh_Data')
        .addItem('Refresh', 'Covid19Refresh')
        .addToUi();
}


/**
 * @summary gets or installs a trigger
 * @param {string} callbackName
 * @param {GoogleAppsScript.Script.EventType} type
 * @param {function} installer
 */
const getOrIntallTrigger = (callbackName, type, installer) =>

    /**
     * @returns {?GoogleAppsScript.Script.Trigger}
     */
    () => {

        console.log(`Checking for triggered ${callbackName} function`);

        const ss = SpreadsheetApp.getActiveSpreadsheet();

        const triggers = ScriptApp.getUserTriggers(ss);

        const found = triggers
            .filter(trigger => trigger.getEventType() === type && trigger.getHandlerFunction() === callbackName);

        const [trigger] = found;

        !trigger && installer();

        return trigger;
    };

/**
 * @summary installs a trigger
 * @param {string} callbackName 
 * @param {GoogleAppsScript.Script.EventType} type
 */
const insallTrigger = (callbackName, type) =>

    () => {

        console.log(`Installing triggered ${callbackName} function`);

        const ss = SpreadsheetApp.getActiveSpreadsheet();

        const builder = ScriptApp.newTrigger(callbackName);

        const spreadBuilder = builder.forSpreadsheet(ss);

        /** @type {Map.<string, function(GoogleAppsScript.Script.SpreadsheetTriggerBuilder) } */
        const typeMap = new Map();

        const { EventType } = ScriptApp;

        typeMap
            .set(EventType.ON_CHANGE, (builder) => builder.onChange())
            .set(EventType.ON_EDIT, (builder) => builder.onEdit())
            .set(EventType.ON_OPEN, (builder) => builder.onOpen());

        const typed = typeMap.get(type)(spreadBuilder);

        typed.create();
    };

/**
 * @summary partiallly applied installer for infections by tests ratio
 */
const installInfectionsByTests = insallTrigger(
    "updateInfectsionsByTests",
    ScriptApp.EventType.ON_CHANGE
);

/**
 * @summary partiallly applied getter-installer for infections by tests ratio
 */
const getOrInstallInfectionsByTests = getOrIntallTrigger(
    "updateInfectsionsByTests",
    ScriptApp.EventType.ON_CHANGE,
    installInfectionsByTests
);