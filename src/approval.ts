import { rawDataRecord } from "./raw";

import { State } from "./state";

import { boolTryDecorator } from "./utils";

class ApprovalConfig {
  template: GoogleAppsScript.HTML.HtmlTemplate;

  stateNames: string[];

  emails: EmailConfig[] = [];

  columnLookup: Partial<
    Record<"us" | "state", ReturnType<typeof getColLookupUS>>
  > = {};

  weekday: string;

  totalUS: number[];

  raw: rawDataRecord = {};

  //accumulated templates and variables
  accumulated: { [x: string] : string } = {};

  timezone: string;

  currentDate: Date;

  /**
   * @param {ApprovalSettings}
   */
  constructor({
    templateName,
    covidDataByState,
    currentDate = new Date(),
    emails = [],
    indices = getIndices(),
    stateNames = getStateNames(),
    timezone = Session.getScriptTimeZone(),
    totalUS,
  } = {}) {
    this.stateNames = stateNames;

    this.covidDataByState = covidDataByState;

    this.currentDate = currentDate;

    this.emails.push(...emails);

    this.indices = indices;

    this.notices = getOddsNoticeSettings();

    this.template = HtmlService.createTemplateFromFile(
      `html/templates/${templateName}`
    );

    this.timezone = timezone;

    this.totalUS = totalUS;

    this.weekday = getDayOfWeek(currentDate);
  }

  get subjectPrefix() {
    const {
      notices: { subjectPrefix },
    } = this;
    return subjectPrefix;
  }

  get empty() {
    const { emails } = this;
    return emails.length === 0;
  }

  addLookup(type: "us" | "state", lookup: ReturnType<typeof getColLookupUS>) {
    this.columnLookup[type] = lookup;
  }

  addRaw(raw: rawDataRecord) {
    for (const key in raw) {
      this.raw[key] = raw[key];
    }
  }
}

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
function doApprove({ sandboxed = false, safe = false } = {}) {
  const lock = PropertyLockService.getScriptLock();
  const hasLock = lock.tryLock(5e2);
  if (!hasLock) {
    return promptBusyApproving();
  }

  const logger = new LogAccumulator("daily send");

  const settings = getGeneralSettings();

  const { allLeft, status } = checkAllServiceQuotas(settings);

  const config = { sandboxed, safe };
  safe && (config.max = allLeft);

  const userEmail = getUserEmail();

  const { statsShName, userShName } = CONFIG;
  const covidStatsSheet = getSheet(statsShName);
  const usersSheet = getSheet(userShName);

  const ui = SpreadsheetApp.getUi();

  const selectedUserRow = getCurrentlySelectedCandidate(usersSheet);

  const appState = State.getState({
    threshold: 15,
    start: selectedUserRow,
    callback: sendout(usersSheet, covidStatsSheet, config, settings),
    type: sandboxed ? "sandbox" : "production",
  });

  selectedUserRow && appState.overrideStart(selectedUserRow);

  const candidate = getCandidateFromRow(
    usersSheet,
    selectedUserRow || appState.start
  );

  if (!candidate) {
    lock.releaseLock();

    showModal({
      markup: `The selected row ${selectedUserRow} does not contain a user`,
      title: "No user selected",
    });

    return false;
  }

  if (!status) {
    lock.releaseLock();

    promptQuotaLimit(userEmail);
    return false;
  }

  const numSendable = `Can send ${pluralizeCountable(allLeft, "email")}`;

  const userPrompt = promptStartingFrom(candidate, safe);

  const {
    previousFailures,
    previousSuccesses,
    lastTimeFailed,
    lastTimeSucceeded,
  } = appState;

  const pluralFailure = pluralizeCountable(previousFailures, "problem");
  const pluralSuccess = pluralizeCountable(previousSuccesses, "email");

  const lastError = lastTimeFailed
    ? `Last issue: ${new Date(
        lastTimeFailed
      ).toLocaleString()} (${pluralFailure} found)`
    : "No issues";

  const lastSuccess = lastTimeSucceeded
    ? `Last success: ${new Date(
        lastTimeSucceeded
      ).toLocaleString()} (${pluralSuccess} sent)`
    : "Nothing succeeded";

  const {
    inline,
    separate,
    subjectPrefix,
    applySeparateTo,
  } = getOddsNoticeSettings();

  //sample subject prompt
  const subject = promptCurrentSubject({
    prefix: subjectPrefix,
    state: candidate.state,
  });

  const viaServicesPrompt = promptAmountViaServices(settings);

  const {
    emails: {
      amazon: { overrideSafe },
    },
  } = settings;

  const saved = overrideSafe
    ? `WARNING: safety is off, ignoring # of emails sent`
    : "";

  const pingPrompt = promptAmazonStatus(settings);

  const shouldContinue = ui.alert(
    `${sandboxed ? "Sandbox " : ""}Overview`,
    `${numSendable}
            ${viaServicesPrompt}

            ${userPrompt}

            ${lastError}
            ${lastSuccess}
            
            ${pingPrompt}
            ${saved}

            Current subject:
            "${subject}"

            Inline notice: 
            "${inline}"

            Separate notice: 
            "${separate}"
            Applied to: ${applySeparateTo.join(", ") || "all states"}

            Continue?`,
    ui.ButtonSet.YES_NO
  );

  if (shouldContinue === ui.Button.NO || shouldContinue === ui.Button.CLOSE) {
    console.log("Sendout cancelled");
    lock.releaseLock();
    return false;
  }

  const result = boolTryDecorator<boolean>(logger, (as) => as.continue(), appState);

  dumpRelease(logger, lock);

  return result;
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
 * @summary launches the workflow, but does not send out the emails
 */
const sandboxApprove = () => {
  const config = {
    sandboxed: true,
  };

  return doApprove(config);
};

const safeSandboxApprove = () => {
  return doApprove({
    safe: true,
    sandboxed: true,
  });
};

/**
 * @summary launches the workflow, but stops as soon as quota is reached
 */
const safeApprove = () => {
  const config = {
    safe: true,
  };

  return doApprove(config);
};

export {
  ApprovalConfig
}