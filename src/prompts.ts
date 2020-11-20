/// <reference types="../dialog" />
DialogApp.injectHtmlService(HtmlService);

/**
 * @summary builds sendout success prompt
 * @param {State} state
 * @param {LogAccumulator} [logger]
 * @returns {void}
 */
const promptSendoutStats = (state, logger = new LogAccumulator()) => {
  const {
    emails: {
      sandbox: { wait },
    },
  } = CONFIG;

  const { timePassed, formattedStart, type } = state;

  const time = pluralizeCountable(parseInt(timePassed / 1e3), "second");

  const sendoutType = sentenceCase(type);

  const timingStats = `${sendoutType} sendout started at ${formattedStart} and took ${time}`;

  const { failed, succeeded, processed } = state;

  const amountStats = `Processed ${processed} records:<br>${succeeded} successfully<br>${pluralizeCountable(
    failed,
    "error"
  )}`;

  const willRedirectPrompt =
    type === "sandbox"
      ? `<p>Parsed templates will be shown in ${pluralizeCountable(
          wait / 1e3,
          "second"
        )}</p>`
      : "";

  const logs = logger.getAll();

  const preparedLogs = `<ul style="list-style:none;padding:0">${logs
    .map((l) => `<li>${l}</li>`)
    .join("")}</ul>`;

  const content = `<p>${timingStats}</p><p>${amountStats}</p>${willRedirectPrompt}${preparedLogs}`;

  DialogApp.showModal({
    markup: content,
    title: "Result",
    width: 800,
  });
};

/**
 * @typedef {{
 *  delay : number,
 *  text : string,
 *  title : string
 * }} toastConfig
 *
 * @param {toastConfig}
 */
const toastStatus = ({ text, title, delay = 5 }) => {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast(text, title, delay);
    SpreadsheetApp.flush();
  } catch (error) {
    console.log(error);
  }
};

/**
 * @typedef {object} ModalConfig
 * @property {number} [width]
 * @property {number} [height]
 * @property {string} markup
 * @property {string} title
 *
 * @param {ModalConfig} param0
 */
const showModal = ({ width, height, markup, title }) => {
  try {
    const ui = SpreadsheetApp.getUi();

    const content = HtmlService.createHtmlOutput(markup);

    width && content.setWidth(width);
    height && content.setHeight(height);

    ui.showModalDialog(content, title);
  } catch (error) {
    console.warn(`failed to open modal ${error}`);
  }
};

/**
 * @summary builds general settings prompt
 */
const promptGeneralSettings = () => {
  const {
    dialogSize: {
      generalSettings: { height, title, width },
    },
    properties: { general: property, analytics: analyticsProperty },
  } = CONFIG;

  const stateNames = getStateNames();
  const trackingSettings = getTrackingSettings();
  const settings = getGeneralSettings();
  const identities = getAmazonIdentities(settings);
  const quotas = getAmazonQuotas(settings);

  console.log(settings);

  const asyncGAPI = HtmlService.createHtmlOutputFromFile(
    "html/asyncGAPI"
  ).getContent();
  const mdcUtils = HtmlService.createHtmlOutputFromFile(
    "html/mdcUtils"
  ).getContent();
  const statesValidation = HtmlService.createHtmlOutputFromFile(
    "html/statesValidation"
  ).getContent();
  const template = HtmlService.createTemplateFromFile("html/generalSettings");

  Object.assign(
    template,
    {
      quotas,
      stateNames,
      settings,
      trackingSettings,
      property,
      analyticsProperty,
      identities,
    },
    { mdcUtils, asyncGAPI, statesValidation }
  );

  const markup = template.evaluate().getContent();

  showModal({ title, markup, height, width });
};

/**
 * @summary prompts current subject
 * @param {{
 *  user : Candidate,
 *  prefix : string,
 *  state : string,
 *  stateNamesMap : Object.<string,string>
 * }}
 * @returns {string}
 */
const promptCurrentSubject = ({
  user,
  state,
  stateNamesMap = getStateCodeToNameMap(),
  prefix = "",
}) => {
  const {
    sheets: { covid19 },
  } = CONFIG;

  const currDate = getcelldate(covid19);
  const currDay = getDayOfWeek(currDate);

  const formattedDate = toScriptDateString(currDate, false);

  const stateCode = stateNamesMap[state] || "US";

  return `${prefix}${stateCode} COVID-19 daily report: ${currDay} ${formattedDate}`;
};

/**
 * @summary prompts duplicate users
 */
const promptUserDashboard = ({ onError = console.warn } = {}) => {
  try {
    DialogApp.injectHtmlService(HtmlService);

    const records = getUserRecords();

    const { all, duplicate, unique, invalid } = getUsers(records);

    const subscribers = getUniqueSubscribers(records);

    duplicate.sort((a, b) => (a.email > b.email ? 1 : -1));

    const percentDupes = ((duplicate.length * 100) / all.length).toFixed(2);

    const unsent = getUnsent();

    DialogApp.showModal({
      ...addMDCDependencies(),
      height: 8e2,
      title: "Users",
      templateName: "userDashboard",
      paths: ["html"],
      templateVars: {
        all,
        duplicate,
        percentDupes,
        subscribers,
        unique,
        unsent,
        invalid,
      },
    });
  } catch (error) {
    onError(error);
  }
};

/**
 * @summary prompts sending from candidate (for use in dialogs)
 * @param {Candidate} candidate
 * @param {boolean} [isSafeMode]
 * @returns {string}
 */
const promptStartingFrom = (
  { index, name, state } = candidate,
  isSafeMode = true
) => {
  const safePrompt = isSafeMode ? "in safe mode" : "";

  return `Starting ${safePrompt} from user ${name} (row ${index}), state ${state}`;
};

/**
 * @summary builds amazon status prompt
 * @param {GeneralSettings} [settings]
 * @returns {string}
 */
const promptAmazonStatus = (settings = getGeneralSettings()) => {
  return checkAmazonStatus(settings) ? "Amazon is online" : "Amazon is offline";
};

/**
 * @summary builds prompt visualizing how many emails will be sent via what service
 * @param {GeneralSettings} settings
 * @returns {string}
 */
const promptAmountViaServices = (settings) => {
  const nameMap = new Map([
    [
      "amazon",
      { name: "Amazon SES", quotas: checkAmazonRemainingQuota(settings) },
    ],
    ["gsuite", { name: "G Suite", quotas: checkRemainingQuota(settings) }],
  ]);

  const { emails } = settings;

  console.log(emails);

  return Object.entries(emails)
    .map(([key, config]) => {
      const { limit, rate = "-" } = config;

      const {
        name,
        quotas: { safePercent, safeRemaining, remaining, status },
      } = nameMap.get(key);

      const canSend = status ? "OK" : "NO";

      const safeRemains =
        safeRemaining !== remaining
          ? `${safeRemaining} (overflow ${remaining})`
          : remaining;

      const emailQuota = pluralizeCountable(limit, "email");    

      return `${canSend} | ${safePercent}% via ${name}: ${safeRemains} of ${emailQuota} (${rate} per second)`;
    })
    .join("\n");
};

/**
 * @summary gets no data state prompt
 */
const getStateNoDataPrompt = (state: string) =>
  createTemplateRow(
    `<b>Please note: ${state} did not report any new data today.</b>`
  );

/**
 * @summary builds states with no data prompt
 * @param {{
 *  stats : (string | number)[],
 *  sort : boolean|true
 * }}
 * @returns {string}
 */
const getNoDataPromptText = ({
  stats = getCovid19Stats(),
  sort = true,
} = {}) => {
  const noData = reportedNoData(stats);

  sort && noData.sort();

  const { length } = noData;

  if (!length) {
    return "";
  }

  const wasWere = length > 1 ? "were" : "was";
  const stateForm = length === 1 ? "state" : "states";
  const lastJoiner = length > 2 ? ", and " : " and ";

  const noDataJoined =
    length === 1
      ? noData[0]
      : `${noData.slice(0, -1).join(", ")}${lastJoiner}${noData.slice(-1)[0]}`;

  return `${noDataJoined} ${wasWere} the only ${stateForm} that did not report any new data today.`;
};

/**
 * @typedef {{
 *  email : string,
 *  code : string,
 *  state : string,
 *  viewed : number,
 *  uid : string
 * }} EmailTrackingRecord
 *
 * @summary builds email tracking dashboard
 */
const promptEmailTracking = () => {
  const data = getEmailTrackingState();

  const {
    analytics: {
      dashboard: { rowsPerTable, segmentWidth, segmentHeight },
    },
  } = CONFIG;

  for (const date in data) {
    data[date] = chunkify(data[date], { size: rowsPerTable });
  }

  const current = toISOdate(Date.now());

  const output = HtmlService.createTemplateFromFile("html/tracking.html");

  const headers = ["Id", "Email", "Code", "State Name", "Total", "Times Open"];

  Object.assign(output, { current, data, headers, rowsPerTable });

  const markup = output.evaluate().getContent();

  const { length } = Object.keys(data);

  const numSegments = length < headers.length ? headers.length + 2 : length;

  showModal({
    title: `Tracking analytics`,
    width: segmentWidth * numSegments,
    markup,
    height: segmentHeight * (rowsPerTable + 2),
  });
};

type DialogDependencies = Pick<
  GoogleAppsScript.Dialog.ModalDialogOptions,
  "styles" | "dependencies"
>;

/**
 * @summary utility for quickly assigning common MDC dependencies
 */
const addMDCDependencies = (
  config: Partial<GoogleAppsScript.Dialog.ModalDialogOptions> = {}
): DialogDependencies =>
  Object.assign(config, {
    styles: [
      {
        name: "mdcWeb",
        type: DialogApp.DependencyType.EXTERNAL,
        src:
          "https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css",
      },
      {
        name: "mdcIcons",
        type: DialogApp.DependencyType.EXTERNAL,
        src: "https://fonts.googleapis.com/icon?family=Material+Icons",
      },
    ],
    dependencies: [
      { name: "asyncGAPI", type: DialogApp.DependencyType.INTERNAL },
      { name: "mdcUtils", type: DialogApp.DependencyType.INTERNAL },
    ],
  });

const promptJumpTo = () => {
  const ui = SpreadsheetApp.getUi();

  const res = ui.prompt("Jump to cell", ui.ButtonSet.OK);

  const sel = res.getSelectedButton();

  if (sel !== ui.Button.OK) {
    return;
  }

  const a1 = res.getResponseText();

  const col = getIndexFromA1(a1);
  const row = getIndexFromA1(a1, "row");

  jumpTo({ row, col, skipFrozen: true });
};

/**
 * @summary builds sandbox result dashboard
 * @param {emailConfig[]} emails
 * @returns {void}
 */
const promptSandboxResult = (emails) => {
  DialogApp.injectHtmlService(HtmlService);

  const config = addMDCDependencies({
    paths: ["html"],
    title: "Sandbox",
    templateVars: { emails },
    templateName: "sandboxDashboard",
    height: 800,
    width: 1e3,
  });

  return DialogApp.showModal(config);
};

/**
 * @summary builds analytics pull prompt
 * @returns {void}
 */
const promptAnalyticsPull = () => {
  DialogApp.injectHtmlService(HtmlService);

  const users = getUsers();

  const {
    dialogSize: { analyticsPull },
  } = CONFIG;

  const config = addMDCDependencies({
    ...analyticsPull,
    templateVars: { users },
    paths: ["html"],
    dependencies: [
      { name: "asyncGAPI", type: DialogApp.DependencyType.INTERNAL },
    ],
    templateName: "analyticsPull",
    title: "Analytics Pull",
  });

  return DialogApp.showSidebar(config);
};

const promptBusyApproving = ({ title = "Try again later" } = {}) => {
  DialogApp.injectHtmlService(HtmlService);

  const {
    dialogSize: { lockFailure },
  } = CONFIG;

  const config = addMDCDependencies({
    ...lockFailure,
    paths: ["html"],
    fileName: "approvalBusy",
    dependencies: [
      { name: "asyncGAPI", type: DialogApp.DependencyType.INTERNAL },
    ],
    title,
  });

  return DialogApp.showModal(config);
};

declare interface DailyApproveEmailOptions {
  date: Date;
}

/**
 * @summary makes daily approval email content
 */
const makeDailyApproveEmail = ({ date }: DailyApproveEmailOptions) => {
  const uri = ScriptApp.getService().getUrl();

  const template = HtmlService.createTemplateFromFile(
    "html/approvalEmail.html"
  );

  const { spreadsheets: { users } } = CONFIG;

  template.uri = uri;
  template.date = date;
  template.nodata = getNoDataPromptText();
  template.usersURL = buildSSurl(users);

  return template.evaluate().getContent();
};

/**
 * @summary builds a quota overflow prompt
 * @param {string} [email]
 * @returns {boolean}
 */
const promptQuotaLimit = (email = getUserEmail()) => {
  DialogApp.injectHtmlService(HtmlService);

  return DialogApp.showModal({
    title: "Quota exhausted",
    markup: `You reached the quota limit for the account: ${email}`,
  });
};

const promptApproval = ({ onError = (err) => console.warn(err) } = {}) => {
  const config = addMDCDependencies({
    paths: ["html"],
    templateName: "approvalDashboard",
    dependencies: [
      { name: "asyncGAPI", type: DialogApp.DependencyType.INTERNAL },
    ],
    title: "Approval",
    height: 500,
  });

  return DialogApp.showModal(config);
};

/**
 * @summary builds prompt with odd notice settings
 */
const promptOddsNoticeSettings = () => {
  const {
    properties: { notice: property },
    sheets: { covid19 },
  } = CONFIG;

  const currDate = getcelldate(covid19);

  const currDay = getDayOfWeek(currDate);

  const formattedDate = toScriptDateString(currDate, false);

  const oddsSettings = getOddsNoticeSettings();
  const stateNames = getStateNames();

  const ui = SpreadsheetApp.getUi();

  const noData = getNoDataPromptText();

  const asyncGAPI = HtmlService.createHtmlOutputFromFile(
    "html/asyncGAPI"
  ).getContent();
  const mdcUtils = HtmlService.createHtmlOutputFromFile(
    "html/mdcUtils"
  ).getContent();
  const stateUtils = HtmlService.createHtmlOutputFromFile(
    "html/statesValidation"
  ).getContent();
  const template = HtmlService.createTemplateFromFile("html/oddsNotice");

  Object.assign(
    template,
    {
      stateUtils,
      mdcUtils,
      asyncGAPI,
      noData,
      property,
      formattedDate,
      currDay,
      stateNames,
    },
    oddsSettings
  );

  const markup = template.evaluate().getContent();

  const content = HtmlService.createHtmlOutput(markup);

  const {
    dialogSize: {
      oddsNotice: { height, width },
    },
  } = CONFIG;

  content.setWidth(width).setHeight(height);

  ui.showModalDialog(content, "Notice Settings");
};

DialogApp.injectHtmlService(HtmlService);

const promptSpreadsheetStats = ({
  onError = (err) => console.warn(err),
} = {}) => {
  try {
    const config = addMDCDependencies({
      paths: ["html"],
      fileName: "spreadsheetStats",
      dependencies: [
        { name: "asyncGAPI", type: DialogApp.DependencyType.INTERNAL },
      ],
      title: "Stats",
    });

    return DialogApp.showModal(config);
  } catch (error) {
    onError(error);
  }
};

/**
 * @summary prompts row deletion and deletes rows specified
 */
const promptDeleteRows = () => {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt("Start from, num rows");
  const [from, num] = res.getResponseText().split(/,\s?/);
  const sh = SpreadsheetApp.getActiveSheet();
  sh.deleteRows(from, num);
};
