/// <reference path="../triggers.d.ts" />

Triggers.use(PropertiesService);

/**
 * @summary generates main menu of the script
 * @param {GoogleAppsScript.Events.SheetsOnOpen} e event object
 * @returns {void}
 */
function onOpen() {
  Triggers.trackTriggers();

  try {
    const separator = { type: "separator" };

    MenuApp.buildMenu({
      title: "Send Email",
      items: [
        { title: "Approve", action: "safeApprove" },
        { title: "Approve Sandbox", action: "safeSandboxApprove" },
        { title: "Approval Dashboard", action: "promptApproval" },
        { title: "Approve Weekly", action: "startWeeklySendoutFlow" },
        separator,
        { title: "Display Users", action: "promptUserDashboard" },
        { title: "Display Info", action: "promptSpreadsheetStats" },
        separator,
        { title: "Configure Notice", action: "promptOddsNoticeSettings" },
        { title: "Open Settings", action: "promptGeneralSettings" },
        separator,
        {
          title: "Utilities",
          items: [
            { title: "Jump to row", action: "promptJumpTo" },
            { title: "Activate first row", action: "activateFirstRow" },
            { title: "Activate last row", action: "activateLastRow" },
            { title: "Delete rows", action: "promptDeleteRows" },
            { title: "Here to last row", action: "activateHereToLastRow" },
          ],
        },
        separator,
        { title: "Force refresh", action: "startDailyApprovalFlow" },
        { title: "Clear Status", action: "clearSendoutStatus" },
        { title: "Start Recalc", action: "installCalcStats" },
        { title: "Stop Recalc", action: "deleteCalcStats" },
        { title: "Reset", action: "resetPersistedState" },
        separator,
        { title: "Analytics", action: "promptAnalyticsPull" },
        { title: "Archive", action: "startWeeklyArchivalFlow" },
      ],
    });

    Triggers.getOrInstallTrigger({
      unique: true,
      callbackName: "startUserStatsUpdate",
      installerConfig: { minutely: 5 },
    });

    Triggers.getOrInstallTrigger({
      unique: true,
      callbackName: "startWeeklyArchivalFlow",
      installerConfig: {
        weeks: 1,
        weekDay: ScriptApp.WeekDay.MONDAY,
      },
    });

    Triggers.getOrInstallTrigger({
      unique: true,
      callbackName: "startDailyApprovalFlow",
      installerConfig: { minutely: 5 },
    });

    Triggers.getOrInstallTrigger({
      unique: true,
      callbackName: "resetDailyApprovalFlow",
      installerConfig: {
        days: 1,
        atHour: 0,
      },
    });

    Triggers.getOrInstallTrigger({
      unique: true,
      callbackName: "startDailyAnalyticsUpdate",
      installerConfig: {
        days: 1,
        atHour: 6,
      },
    });
  } catch (error) {
    console.warn(`failed to create menu: ${error}`);
  }
}

/**
 * @param {GoogleAppsScript.Events.DoGet}
 */
function doGet({ parameter: { approve, date } } = { parameter: {} }) {
  try {
    console.log({ approve, date });

    DialogApp.injectHtmlService(HtmlService);

    const {
      approval: { sealed },
    } = getGeneralSettings();

    return DialogApp.getHtmlOutput({
      ...addMDCDependencies(),
      paths: ["html"],
      templateName: "approve",
      templateVars: { approve, sendoutDate: date },
      outputOnly: true,
    });
  } catch (error) {
    console.warn(error);
  }
}

const startUserStatsUpdate = () => {
  const logger = new LogAccumulator("user stats");

  try {
    const sheet = getUsersSheet();

    const common = {
      logger,
      sheet,
      dict: getSubscribersByDate(),
    };

    const nameRng = sheet.getRange("Q2:Q");
    const names = nameRng.getValues();
    const userStateCodes = lookupCode(names);

    sheet.getRange(`D2:D${nameRng.getLastRow()}`).setValues(userStateCodes);

    const userOk = updateUserGrowth(common);
    const unsubOk = updateUnsubGrowth(common);

    const codes = getColumn({ sheet, column: 4, startRow: 2 }).getValues();
    const totals = getStateUserTotals(codes as string[][]);
    const rng = sheet.getRange(2, 15, totals.length, 2);
    rng.setValues(totals);

    const allOk = userOk && unsubOk;

    logger.log("user stats", allOk ? "log" : "error");
    logger.dumpAll();

    return allOk;
  } catch (error) {
    logger.log(error, "error");
    logger.dumpAll();

    return false;
  }
};

/**
 * @summary runs specified function with interval (sync)
 * @param {{
 *  until    ?: number,
 *  onFailure : Function,
 *  interval ?: number,
 *  current  ?: number,
 *  callback  : string
 * }} options
 *
 */
const runWithInterval = ({
  until = 36e5,
  interval = 1e3,
  callback,
  onFailure,
  current = 0,
}) => {
  const status = callback();

  if (!status) {
    return onFailure();
  }

  Utilities.sleep(interval);

  const updated = current + interval;

  return runWithInterval({ until, interval, callback, onFailure, updated });
};

/**
 * @summary launches analytics update each morning
 * @param {GoogleAppsScript.Events.TimeDrivenEvent} timeEvent
 * @returns {boolean}
 */
function startDailyAnalyticsUpdate(timeEvent = { date: new Date() }) {
  try {
    const onError = (e) => console.warn(e);

    const common = { onError };

    const {
      sheets: { tracking },
    } = CONFIG;

    const sheet = getOrInitSheet({ name: tracking });

    const didReset = resetAnalyticsData(common);

    const didPull = pullAnalyticsUsers({ sheet, ...common });

    if (!didPull || !didReset) {
      return false;
    }

    const { unique } = getUsers();

    const { analytics } = getGeneralSettings(common);

    const { usersPerChunk } = analytics;

    const userChunks = chunkify(unique, { size: usersPerChunk });

    const { length } = userChunks;

    let chunk = 0;

    return;

    runWithInterval({
      onFailure: () => {
        console.warn("failed to run");
      },
      interval: 3e3,
      callback: () => {
        const codes = updateAnalyticsData({ ...common, settings: analytics });

        if (codes.some((c) => c === 429)) {
          return false;
        }

        chunk += 1;

        return chunk < length;
      },
    });

    const didSort = sortAnalyticsData({ sheet, ...common });

    const didPercent = getDailyEngagement(common);

    return didSort && didPercent;
  } catch (error) {
    console.warn(error);
    return false;
  }
}

const archiveData = ({
  blobs = [],
  sheetName,
  logger = new LogAccumulator(),
  beforeDate,
  onError = (err) => console.warn(err),
}) => {
  try {
    const sheet = getOrInitSheet({ name: sheetName });
    const range = sheet.getDataRange();
    const values = range.getValues().slice(1);

    const rowIdx = values.findIndex(
      ([date]) => beforeDate >= datenumToValue(date)
    );

    if (rowIdx < 0) {
      logger.log("no data to archive");
      return blobs;
    }

    const toArchive = JSON.stringify(values.slice(rowIdx));
    blobs.push(Utilities.newBlob(toArchive, "text/plain", sheetName));

    const startRow = rowIdx + 1;
    sheet.deleteRows(startRow, sheet.getLastRow() - startRow + 1);
  } catch (error) {
    logger.log(error, "error");
    onError(error);
  }

  return blobs;
};

/**
 * @summary archives state and country data every week that is older than 6 months
 * @param {GoogleAppsScript.Events.TimeDrivenEvent} timeEvent
 */
function startWeeklyArchivalFlow(timeEvent = {}) {
  const logger = new LogAccumulator();

  const lock = PropertyLockService.getScriptLock();
  const hasLock = lock.tryLock(5e2);
  if (!hasLock) {
    return false;
  }

  try {
    const date = new Date();

    const {
      sheets: { states, country },
    } = CONFIG;

    const sixMonthsAgo = offset({
      date,
      period: "months",
      numberOf: 6,
    }).valueOf();

    const blobs = [];

    const commonParams = { blobs, logger, beforeDate: sixMonthsAgo };

    archiveData({ ...commonParams, sheetName: country });
    archiveData({ ...commonParams, sheetName: states });

    if (!blobs.length) {
      logger.log("no data will be archived, aborting");
      logger.dumpAll();
      lock.releaseLock();
      return true;
    }

    const {
      approval: { recipient },
    } = getGeneralSettings();

    const archive = Utilities.zip(blobs, `archive ${toISOdate(date)}.zip`);

    const preparedSend = makeGSuiteEmailSender({
      senderName: recipient,
      logAccumulator: logger,
    });

    const status = preparedSend([
      {
        subject: `Scheduled archive: ${date.toLocaleDateString()}`,
        to: recipient,
        attachments: [archive],
        message: "This is a scheduled message archiving old data",
      },
    ]);

    logger.log(`archive status: ${status ? "OK" : "FAIL"}`);
  } catch (error) {
    logger.log(error, "error");
    lock.releaseLock();
    return false;
  }

  logger.dumpAll();
  lock.releaseLock();
  return true;
}

type PossiblyManual<T> = Partial<T> & { manual?: boolean };

const dumpRelease = (logger: LogAccumulator, lock: typeof PropertyLock) => {
  lock.releaseLock();
  logger.dumpAll();
};

/**
 * @summary initiates daily approval flow
 */
function startDailyApprovalFlow(
  timeEvent: PossiblyManual<GoogleAppsScript.Events.TimeDrivenEvent> = {
    manual: true,
  }
): boolean {
  const logger = new LogAccumulator("DAILY UPDATE");

  const lock = PropertyLockService.getScriptLock();
  const hasLock = lock.tryLock(5e2);
  if (!hasLock) {
    logger.log(`someone else has the lock`);
    logger.dumpAll();
    return false;
  }

  try {
    const onError = console.warn;

    const { manual } = timeEvent;

    const date = gmtToEdt();
    const hour = date.getHours();

    logger.log(`trying to update at ${hour} HH`);

    const canProceed = Triggers.isInHourlyRange({
      start: 17,
      end: 23,
      hour,
    });

    if (!canProceed && !manual) {
      logger.log(`out of time range`);
      dumpRelease(logger, lock);
      return true;
    }

    const {
      approval: { recipient, dataFor, states },
    } = getGeneralSettings();

    if (!checkDailyTweet({ logger, date, onError })) {
      logger.log("tweet not published yet");
      dumpRelease(logger, lock);
      return true;
    }

    //successfully updated today
    if (dataFor >= toISOdate(date) && !manual) {
      logger.log("already updated");
      dumpRelease(logger, lock);
      return true;
    }

    const status = refresh({ onError });

    if (!status) {
      logger.log("failed to auto refresh", "error");
      dumpRelease(logger, lock);
      return false;
    }

    const cleared = clearSendoutStatus();

    if (!cleared) {
      logger.log("failed to clear status", "error");
      dumpRelease(logger, lock);
      return false;
    }

    const preparedSender = makeGSuiteEmailSender({ logAccumulator: logger });

    const email = {
      subject: "Refresh completed",
      message: `<p>Daily refresh completed at ${toScriptTimeString(date)}</p>`,
    };

    const statusNotif = preparedSender([
      { ...email, to: recipient },
      { ...email, to: Session.getEffectiveUser().getEmail() },
    ]);

    if (!statusNotif) {
      logger.log("failed to send refresh notification", "error");
    }

    const sentTestEmails = sendTestStateEmails({
      logger,
      sandbox: false,
      recipient,
      states,
    });

    if (!sentTestEmails) {
      logger.log("failed to send test state emails", "error");
    }

    sendApprovalEmail({ logger, recipient });

    dumpRelease(logger, lock);

    return true;
  } catch (error) {
    dumpRelease(logger, lock);
    return false;
  }
}

/**
 * @summary initiates daily reset of the approval flow
 * @param {GoogleAppsScript.Events.TimeDrivenEvent} timeEvent
 * @returns {boolean}
 */
function resetDailyApprovalFlow(timeEvent = { manual: true }) {
  try {
    const onError = console.warn;

    const { manual } = timeEvent;

    const canProceed = Triggers.isInHourlyRange({
      start: 0,
      end: 1,
      ...timeEvent,
    });

    if (!canProceed && !manual) {
      return true;
    }

    const settings = getGeneralSettings({ onError });

    const {
      approval: { sealed },
    } = settings;

    if (!sealed) {
      console.log("already unsealed");
      return true;
    }

    return updateSettings({
      path: "approval/sealed",
      update: false,
      settings,
      onError,
    });
  } catch (error) {
    console.warn(error);
    return false;
  }
}

/**
 * @summary installer function for an onChange trigger
 * @param {string} [funcName]
 * @returns {GoogleAppsScript.Script.Trigger?}
 */
const installOnChange = (funcName = "onChange") => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const id = ss.getId();

  const [trigger] = ScriptApp.getProjectTriggers().filter(
    (t) =>
      t.getEventType() === ScriptApp.EventType.ON_CHANGE &&
      t.getHandlerFunction() === funcName
  );

  if (trigger) {
    return null;
  }

  return ScriptApp.newTrigger(funcName).forSpreadsheet(id).onChange().create();
};

/**
 * @summary deleter of an onChange trigger
 * @param {string} [funcName]
 * @returns {void}
 */
const deleteOnChange = (funcName = "onChange") => {
  const trigger = ScriptApp.getProjectTriggers().find(
    (t) =>
      t.getEventType() === ScriptApp.EventType.ON_CHANGE &&
      t.getHandlerFunction() === funcName
  );

  trigger && ScriptApp.deleteTrigger(trigger);
};

/**
 * @summary change trigger recalculating stats
 * @param {{ onError : (err: Error) => void }}
 * @returns {boolean}
 */
const calculateStats = ({ onError = console.warn } = {}) => {
  const {
    sheets: { covid19, country: rawCountryShname, states: rawStatesShname },
  } = CONFIG;

  try {
    const hospStart = getIndexFromA1("I");
    const hospEnd = getIndexFromA1("M");

    const date = getcelldate(covid19);
    const before = yesterday(date);

    const dataColumn = "F";

    const countryToday = getCountryDailyIncrease(
      date,
      rawCountryShname,
      dataColumn
    );
    const countryYesterday = getCountryDailyIncrease(
      before,
      rawCountryShname,
      dataColumn
    );

    const statsSheet = getOrInitSheet({ name: covid19 });
    const source = statsSheet.getDataRange().getValues();

    const [country, ...states] = shrinkGrid({
      source,
      leave: { left: hospEnd + 1 },
      top: 1,
    });

    country[hospStart] = countryToday;
    country[hospStart + 1] = percentToPrevious(countryToday, countryYesterday);
    country[hospStart + 2] = countryYesterday;
    country[hospStart + 3] = percentToPrevious(countryToday, country[hospEnd]);

    const statesToday = getStateDailyIncrease(
      date,
      rawStatesShname,
      dataColumn
    );
    const statesYesterday = getStateDailyIncrease(
      before,
      rawStatesShname,
      dataColumn
    );

    const mappedStates = states.map((row, ri) => {
      try {
        const [stateToday] = statesToday[ri];
        const [stateYesterday] = statesYesterday[ri];
        const stateRow = states[ri];

        row[hospStart] = stateToday;
        row[hospStart + 1] = percentToPrevious(stateToday, stateYesterday);
        row[hospStart + 2] = stateYesterday;
        row[hospStart + 3] = percentToPrevious(stateToday, stateRow[hospEnd]);
      } catch (error) {
        //console.error(error);
      }

      return row;
    });

    const targetRng = statsSheet.getDataRange();

    const mapped = [country, ...mappedStates];

    const grid = shrinkGrid({
      source: mapped,
      left: hospStart,
    });

    adjustToGrid({
      range: targetRng,
      grid,
      move: {
        left: hospStart,
        top: 1,
      },
      setValues: true,
    });

    //update AR col (infections/tests):
    const infToTestCol = getIndexFromA1("AR");
    const infectionsToTests = getInfectsionsByTests(7);

    const fromInfToTest = adjustToGrid({
      range: targetRng,
      grid: infectionsToTests,
      move: {
        left: infToTestCol,
        top: 1,
      },
      setValues: true,
    });

    //update AW col (infections/tests/1d)
    const infToTes1dCol = getIndexFromA1("AW");
    const infToTests1d = getInfectsionsByTests(0);

    adjustToGrid({
      range: fromInfToTest,
      grid: infToTests1d,
      move: {
        left: infToTes1dCol - infToTestCol, //optimized : shifting from AR
      },
      setValues: true,
    });

    const NUM_STATES = 56;

    //update state ranking;
    const rankRng = statsSheet.getRange(3, infToTestCol + 1, NUM_STATES, 1);
    const ranked = rankRange(rankRng.getValues());

    adjustToGrid({
      range: rankRng.offset(0, 1),
      grid: ranked,
      setValues: true,
    });

    const dailyRankRng = statsSheet.getRange(
      3,
      infToTes1dCol + 1,
      NUM_STATES,
      1
    );
    const dailyRanked = rankRange(dailyRankRng.getValues());

    adjustToGrid({
      range: dailyRankRng.offset(0, 1),
      grid: dailyRanked,
      setValues: true,
    });

    const lastDate = getLastStatsDate();

    const diff = dateDiff(date, lastDate);

    //update per million columns (by state)
    const perMilRng = rankRng.offset(0, 2, 56, 3);
    const perMilVals = perMilRng.getValues();

    const [countryData, ...stateData] = getCovid19Stats();

    const thisWeekPerM = perMillion(
      false,
      stateData,
      dataColumn,
      diff,
      diff + 7
    );
    const lastWeekPerM = perMillion(
      false,
      stateData,
      dataColumn,
      diff + 7,
      diff + 13
    );

    const newMilVals = perMilVals.map((row, ri) => {
      const thisStateThisW = thisWeekPerM[ri][0];
      const thisStateLastW = lastWeekPerM[ri][0];

      row[0] = thisStateThisW;
      row[1] = percentToPrevious(thisStateThisW, thisStateLastW);
      row[2] = thisStateLastW;
      return row;
    });

    perMilRng.setValues(newMilVals);

    //update per million columns (by country)
    const perMilCountryRng = rankRng.offset(-1, 2, 1, 3);

    const thisWeekPerMcountry = perMillion(
      true,
      [countryData],
      dataColumn,
      diff,
      diff + 7
    )[0][0];
    const lastWeekPerMcountry = perMillion(
      true,
      [countryData],
      dataColumn,
      diff + 7,
      diff + 13
    )[0][0];

    const perMilCountryVals = [
      [
        thisWeekPerMcountry,
        percentToPrevious(thisWeekPerMcountry, lastWeekPerMcountry),
        lastWeekPerMcountry,
      ],
    ];

    perMilCountryRng.setValues(perMilCountryVals);

    return true;
  } catch (error) {
    onError(error);
    return false;
  }
};

const installCalcStats = () => installOnChange("calculateStats");
const deleteCalcStats = () => deleteOnChange("calculateStats");

const listTriggers = (opts = {}) => Triggers.listTriggers(opts);
