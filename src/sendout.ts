/**
 * @summary makes a sender utility via G Suite
 */
const makeGSuiteEmailSender = ({
  logAccumulator = new LogAccumulator(),
  senderName,
}: {
  logAccumulator?: LogAccumulator;
  senderName: string;
}) => (emails: EmailConfig[]) => {
  const results = emails.map(({ to, subject, message, attachments }) => {
    try {
      const params = {
        name: senderName,
        to,
        subject,
        htmlBody: message,
      };

      attachments && (params.attachments = attachments);

      MailApp.sendEmail(params);

      return true;
    } catch (error) {
      logAccumulator.add(error, "error");
      return false;
    }
  });

  const status = results.every(Boolean);

  logAccumulator.add(
    `sent ${pluralizeCountable(emails.length, "email")} via G Suite`
  );

  return status;
};

/**
 * @typedef {{
 *  asPrimary : boolean,
 *  ec2uri : string,
 *  logAccumulator : LogAccumulator,
 *  senderName : string,
 *  rate : number
 * }} AmazonSendoutConfig
 *
 * @param {AmazonSendoutConfig}
 */
const makeAmazonEmailSender = ({
  rate,
  asPrimary,
  ec2uri,
  logAccumulator = new LogAccumulator(),
  senderName,
  chunkSize,
}) => (emails: EmailConfig[] = []): boolean => {
  const {
    emails: { amazonChunkSize },
  } = CONFIG;

  const token = ScriptApp.getIdentityToken();

  const chunked = chunkify(emails, { size: chunkSize || amazonChunkSize });

  const commonParams: Partial<GoogleAppsScript.URL_Fetch.URLFetchRequest> = {
    method: "post",
    url: ec2uri,
    muteHttpExceptions: true,
    contentType: "application/json",
    headers: { Authorization: `Bearer ${token}` },
  };

  const requests: GoogleAppsScript.URL_Fetch.URLFetchRequest[] = chunked.map(
    (chunk) => ({
      payload: JSON.stringify({
        asPrimary,
        emails: chunk,
        senderName,
        rate,
      }),
      ...commonParams,
    })
  );

  try {
    const responses = UrlFetchApp.fetchAll(requests);

    const success = responses.every((r) => r.getResponseCode() === 200);

    const { length } = requests;

    logAccumulator.add(
      success
        ? `Chunks via Amazon SES: ${length} (max ${pluralizeCountable(
            length * amazonChunkSize,
            "email"
          )})`
        : `Failure during send: (${responses.find(
            (r) => r.getResponseCode() !== 200
          )} status)`
    );

    return success;
  } catch (error) {
    logAccumulator.add(error, "error");
    return false;
  }
};

/**
 * @summary validates record for sending
 * @param {string} [email]
 * @param {string} [state]
 * @param {string} [status]
 * @returns {boolean}
 */
const validForSending = (email, state, status) =>
  email && state && status === "";

/**
 * @summary filters out invalid records
 * @param {string[]}
 * @returns {boolean}
 */
const removeInvalidRecords = ([, , email, state, sendoutStatus]) => {
  const {
    emails: { status },
  } = CONFIG;
  return state !== "#N/A" && email && status !== sendoutStatus;
};

/**
 * @typedef {({
 *  startRow : (number | 1),
 *  rows : number[],
 *  sheet : (GoogleAppsScript.Spreadsheet.Spreadsheet | undefined),
 *  statusColumn : (number | 5)
 * })} statusUpdateParams
 *
 * @summary updates mail sent status
 * @param {statusUpdateParams} config
 * @returns {boolean}
 */
const updateSentStatus = ({
  startRow = 1,
  rows,
  statusColumn = 5,
  sheet = SpreadsheetApp.getActiveSheet(),
} = config) => {
  const {
    emails: { status },
  } = CONFIG;

  try {
    const consequentialRows = splitIntoConseq(rows);

    consequentialRows.forEach((sequence) => {
      const { length } = sequence;
      const [index] = sequence;

      const statusRange = sheet.getRange(
        startRow + index,
        statusColumn,
        length,
        1
      );

      const statusArr = [];

      statusArr.length = length;

      statusRange.setValues(statusArr.fill([status]));
    });

    SpreadsheetApp.flush();

    return true;
  } catch (error) {
    console.warn(`failed to set sendout status: ${error}`);
    return false;
  }
};

const sendToUnsentOnly = () => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const { statsShName, userShName } = CONFIG;
  const covidStatsSheet = spreadsheet.getSheetByName(statsShName);
  const usersSheet = spreadsheet.getSheetByName(userShName);

  const settings = getGeneralSettings();

  const users = getUnsent();

  console.log(users.length);

  const config = { max: users.length, usrs: users, sandboxed: true };

  const callback = sendout(usersSheet, covidStatsSheet, config, settings);

  const appState = State.getState({
    threshold: 15,
    start: users[0].index,
    callback,
    type: "production",
  });

  appState.continue();
};

/**
 * @summary prepares sendout callback
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet user sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} covidStatsSheet
 * @param {{ sandboxed: boolean, max: number, usrs?: Candidate[] }} config
 * @param {GeneralSettings} settings
 */
const sendout = (sheet, covidStatsSheet, { sandboxed, max, usrs }, settings) =>

  (STATE: typeof State, startRow: number) => {
    const logger = new LogAccumulator("sendout");

    const totalUS = getTotalByUS(covidStatsSheet);

    const covidDataByState = getStateStats(covidStatsSheet);

    const tr = getUserRecords({ start: startRow - 1, max }); //index 0-based

    //TODO: rework flow if list of users is provided
    let { unique: candidates, invalid } = usrs
      ? { unique: usrs, invalid: 0 }
      : getUsers(tr);

    let {
      emails: {
        retryRecords: retry,
        templates: { main: templateName },
      },
    } = CONFIG;

    //impure by design, mutates candidates array!
    const addedInvalid = addCandidatesWhileInvalid({
      logger,
      invalid,
      retry,
      list: candidates,
      max,
      start: startRow,
      sheet,
    });

    logger.add(`added ${pluralizeCountable(addedInvalid, "candidate")} extra`);

    const currentDate = getcelldate(covidStatsSheet);

    const rowIndicesSent = [];

    const stateNames = getStateNames();

    const sendoutConfig = new ApprovalConfig({
      templateName,
      covidDataByState,
      currentDate,
      stateNames,
      timezone: STATE.timezone,
      totalUS,
    });

    const stateStats = getCovid19Stats();
    const noDataStates = reportedNoData(stateStats);

    for (const candidate of candidates) {
      const { email, state, status, index } = candidate;

      if (!validForSending(email, state, status)) {
        STATE.addStartIfNoFailures();
        continue;
      }

      if (!STATE.canContinue()) {
        break;
      }

      try {
        const result = handleApproval(
          candidate,
          sendoutConfig,
          sandboxed,
          noDataStates
        );

        if (!result) {
          STATE.countFailed().saveFailure();
          continue;
        }

        rowIndicesSent.push(index);

        STATE.countSucceeded().incrementStartIfNoFailures();
      } catch (error) {
        logger.add(error, "error");

        STATE.countFailed().saveFailure();

        const isCancelled = handleError(error, candidate);

        if (isCancelled) {
          break;
        }
      }
    }

    const {
      emails: {
        amazon: { lambda, quota: amazonQuota, identity, senderName, rate },
      },
    } = settings;

    const emailChunks = chunkify(sendoutConfig.emails, {
      limits: [amazonQuota],
    });

    const [sendViaAmazon = [], sendViaGoogle = []] = emailChunks;

    logger
      .add(`via Amazon: ${sendViaAmazon.length}`)
      .add(`via G Suite: ${sendViaGoogle.length}`);

    const sendGSuiteWithErrorAccumulation = makeGSuiteEmailSender({
      logAccumulator: logger,
      senderName,
    });

    const sendSESwithErrorAccumulation = makeAmazonEmailSender({
      logAccumulator: logger,
      ec2uri: lambda + "/send",
      asPrimary: identity === "primary",
      senderName,
      rate,
    });

    if (!sandboxed) {
      sendSESwithErrorAccumulation(sendViaAmazon);
      sendGSuiteWithErrorAccumulation(sendViaGoogle);
    }

    logger.add("finished sending email");

    logger.dumpAll();

    STATE.log();

    updateSentStatus({
      startRow,
      rows: rowIndicesSent,
      sheet,
    });

    promptSendoutStats(STATE, logger);

    STATE.processed === candidates.length ? STATE.allDone() : STATE.save();

    const {
      emails: {
        sandbox: { wait },
      },
    } = CONFIG;

    if (sandboxed && STATE.succeeded > 0) {
      Utilities.sleep(wait);
      promptSandboxResult(sendoutConfig.emails);
    }
  };

declare interface TestDailyEmailOptions {
  states?: string[];
  sandbox?: boolean;
  recipient?: string;
  logger?: LogAccumulator;
}

/**
 * @summary sends test emails
 * @param {{ sandbox : (boolean|false) }}
 */
const sendTestStateEmails = ({
  states,
  sandbox = false,
  recipient,
  logger = new LogAccumulator("test daily mail"),
}: TestDailyEmailOptions = {}): boolean => {
  try {
    const {
      approval: { states: savedStates = [], recipient: savedRecipient },
    } = getGeneralSettings();

    const {
      emails: {
        templates: { main },
        defaultSender,
      },
      sheets: { covid19 },
    } = CONFIG;

    const sheet = getOrInitSheet({ name: covid19 });

    const sendConfig = new ApprovalConfig({
      templateName: main,
      covidDataByState: getStateStats(sheet),
      totalUS: getTotalByUS(sheet),
    });

    const noData = reportedNoData();

    const common = { email: recipient || savedRecipient };

    (states || savedStates).forEach((state) =>
      handleApproval(
        { ...common, state } as Candidate,
        sendConfig,
        sandbox,
        noData
      )
    );

    const preparedSend = makeGSuiteEmailSender({
      logAccumulator: logger,
      senderName: defaultSender,
    });

    const { emails } = sendConfig;

    return sandbox ? promptSandboxResult(emails) : preparedSend(emails);
  } catch (error) {
    logger.add(`failed to send test emails: ${error}`, "error");
    logger.dumpAll();
    return false;
  }
};

/**
 * @summary clears sendout status labels
 * @returns {boolean}
 */
const clearSendoutStatus = () => {
  const { userShName } = CONFIG;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(userShName);
    const rng = sh.getRange(2, 5, sh.getLastRow(), 1);
    rng.clearContent();

    setDuplicateUserLabels();

    return true;
  } catch (error) {
    console.warn(`failed to clear sendout state: ${error}`);
    return false;
  }
};

/**
 * @summary sends out daily review email for approval
 */
const sendApprovalEmail = ({ logger = new LogAccumulator(), recipient }) => {
  const emailSender = makeGSuiteEmailSender({
    senderName: "secondary",
    logAccumulator: logger,
  });

  const {
    sheets: { covid19 },
  } = CONFIG;

  const currDate = getcelldate(covid19);

  const message = makeDailyApproveEmail({ date: currDate });

  return emailSender([
    {
      to: recipient,
      subject: `Approve for ${currDate.toLocaleDateString()}`,
      message,
    },
  ]);
};
