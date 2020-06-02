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

    const amountStats = `Processed ${processed} records:\n${succeeded} successfully\n${pluralizeCountable(failed, "error")}`;

    const content = HtmlService.createHtmlOutput(`${timingStats}\n\n${amountStats}`).getContent();

    ui.alert("Result", content, ui.ButtonSet.OK);
};