/**
 * @summary builds sendout success prompt
 * @param {State} state 
 * @returns {void}
 */
const promptSendoutStats = (state) => {

    const ui = SpreadsheetApp.getUi();

    const { timePassed, formattedStart, type } = state;

    const time = pluralizeCountable(parseInt(timePassed / 1e3), "second");

    const sendoutType = sentenceCase(type);

    const timingStats = `${sendoutType} sendout started at ${formattedStart} and took ${time}`;

    const { failed, succeeded, processed } = state;

    const amountStats = `Processed ${processed} records:<br>${succeeded} successfully<br>${pluralizeCountable(failed, "error")}`;

    const willRedirectPrompt = type === "sandbox" ?
        `<p>Parsed templates will be shown in ${pluralizeCountable(10, "second")}</p>` :
        "";

    const content = HtmlService.createHtmlOutput(`<p>${timingStats}</p><p>${amountStats}</p>${willRedirectPrompt}`);

    ui.showModalDialog(content, "Result");
};