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

/**
 * @summary builds prompt with odd notice settings
 */
const promptOddsNoticeSettings = () => {

    const { oddsNoticePropName } = CONFIG;

    const { inline, separate } = parseOddsNoticeConfig();

    const ui = SpreadsheetApp.getUi();

    const markup = `
        <!DOCTYPE html>
        <html>
            <head>
                <link href="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css" rel="stylesheet">
                <script src="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js"></script>
            </head>

            <body>
                <form name="settings">
                    <div class="mdc-layout-grid">
                        <div class="mdc-layout-grid__inner">
                            <div class="mdc-layout-grid__cell--span-12">
                                <label class="mdc-text-field mdc-text-field--outlined mdc-text-field--textarea">
                                    <span class="mdc-text-field__resizer">
                                        <textarea id="inline" class="mdc-text-field__input" aria-labelledby="inline-label" rows="8"
                                        cols="40" maxlength="140">${inline}</textarea>
                                    </span>
                                    <span class="mdc-notched-outline">
                                        <span class="mdc-notched-outline__leading"></span>
                                        <span class="mdc-notched-outline__notch">
                                        <span class="mdc-floating-label" id="inline-label">Inline Notice</span>
                                        </span>
                                        <span class="mdc-notched-outline__trailing"></span>
                                    </span>
                                </label>
                            </div>
                            <div class="mdc-layout-grid__cell--span-12">
                                <label class="mdc-text-field mdc-text-field--outlined mdc-text-field--textarea">
                                    <span class="mdc-text-field__resizer">
                                        <textarea id="separate" class="mdc-text-field__input" aria-labelledby="separate-label" rows="8"
                                        cols="40" maxlength="140">${separate}</textarea>
                                    </span>
                                    <span class="mdc-notched-outline">
                                        <span class="mdc-notched-outline__leading"></span>
                                        <span class="mdc-notched-outline__notch">
                                        <span class="mdc-floating-label" id="separate-label">Separate Notice</span>
                                        </span>
                                        <span class="mdc-notched-outline__trailing"></span>
                                    </span>
                                </label>
                            </div>
                            <div class="mdc-layout-grid__cell--span-12">
                                <button type="button" id="submit" class="mdc-button mdc-button--outlined">
                                    <div class="mdc-button__ripple"></div>
                                    <span class="mdc-button__label">Save</span>
                                </button>
                                <button type="button" id="clear" class="mdc-button mdc-button--outlined">
                                    <div class="mdc-button__ripple"></div>
                                    <span class="mdc-button__label">Clear</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                <script>
                    console.log(google.script.run);

                    const { ripple, textField } = mdc;

                    const { MDCTextField } = textField;

                    const { MDCRipple } = ripple;

                    const textFields = Array.from(document.querySelectorAll(".mdc-text-field"));
                    const texButtons = Array.from(document.querySelectorAll(".mdc-button"));

                    const wokeFields = textFields.map(component => new MDCTextField(component));
                    const wokeButtons = texButtons.map(component => new MDCRipple(component));

                    const [ submit ] = wokeButtons.filter(c => c.root.id === "submit");

                    submit.root.addEventListener("click", (event) => {
                        event.preventDefault();

                        const [ inline, separate ] = wokeFields.map(f => f.value);

                        google.script.run
                        .withSuccessHandler(() => {
                            console.log("saved notice settings");
                        })
                        .withFailureHandler(error => {
                            console.log(error);
                        })
                        .persistOddsNoticeText("${oddsNoticePropName}", { inline, separate });
                    });

                    const [ clear ] = wokeButtons.filter(c => c.root.id === "clear");

                    clear.root.addEventListener("click", (event) => {
                        event.preventDefault();

                        wokeFields.forEach(field => {
                            console.log(field);
                            field.value = "";
                        });
                    });

                </script>
            </body>
        </html>`;

    const content = HtmlService.createHtmlOutput(markup);

    content
        .setWidth(CONFIG.dialogSize.width)
        .setHeight(CONFIG.dialogSize.height);

    ui.showModalDialog(content, "Notice Settings");
};