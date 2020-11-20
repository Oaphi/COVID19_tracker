import { indexRawStateData, indexRawUsData } from "./raw";

import { ApprovalConfig } from "./approval";

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
      logAccumulator.log(error, "error");
      return false;
    }
  });

  const status = results.every(Boolean);

  logAccumulator.log(
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

  const size = chunkSize || amazonChunkSize;

  const chunked = chunkify(emails, { size });

  const commonParams: Pick<
    GoogleAppsScript.URL_Fetch.URLFetchRequest,
    "method" | "url" | "muteHttpExceptions" | "contentType" | "headers"
  > = {
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

    logAccumulator.log(
      success
        ? `SES chunks: ${length} (max ${pluralizeCountable(
            length * size,
            "email"
          )})`
        : `Failure during send: (${responses.find(
            (r) => r.getResponseCode() !== 200
          )} status)`
    );

    return success;
  } catch (error) {
    logAccumulator.log(error, "error");
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
 * @param {{ sandboxed: boolean, max: number, usrs?: Candidate[] }} config
 * @param {GeneralSettings} settings
 */
const sendout = (
  userSheet: GoogleAppsScript.Spreadsheet.Sheet,
  covidStatsSheet: GoogleAppsScript.Spreadsheet.Sheet,
  { sandboxed, max, usrs },
  settings
) => (STATE: typeof State, startRow: number) => {
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
    sheets: { states, country },
  } = CONFIG;

  //impure by design, mutates candidates array!
  const addedInvalid = addCandidatesWhileInvalid({
    logger,
    invalid,
    retry,
    list: candidates,
    max,
    start: startRow,
    sheet: userSheet,
  });

  logger.log(`added ${pluralizeCountable(addedInvalid, "candidate")} extra`);

  const currentDate = getcelldate(covidStatsSheet);

  const rowIndicesSent = [];

  const stateNames = getStateNames();

  const conf = new ApprovalConfig({
    templateName,
    covidDataByState,
    currentDate,
    stateNames,
    totalUS,
  });

  conf.addLookup("us", getColLookupUS(logger));
  conf.addLookup("state", getColLookupState(logger));

  //set raw state data in case we need it
  conf.addRaw(indexRawStateData(states));
  conf.addRaw(indexRawUsData(country));
  

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
        logger,
        conf,
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
      logger.log(error, "error");

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

  const emailChunks = chunkify(conf.emails, {
    limits: [amazonQuota],
  });

  const [sendViaAmazon = [], sendViaGoogle = []] = emailChunks;

  logger
    .log(`via Amazon: ${sendViaAmazon.length}`)
    .log(`via G Suite: ${sendViaGoogle.length}`);

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

  logger.log("finished sending email");

  logger.dumpAll();

  STATE.log();

  updateSentStatus({
    startRow,
    rows: rowIndicesSent,
    sheet: userSheet,
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
    promptSandboxResult(conf.emails);
  }
};

declare interface TestDailyEmailOptions {
  states?: string[];
  sandbox?: boolean;
  recipient?: string;
  logger?: InstanceType<typeof LogAccumulator>;
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
      sheets: { covid19, states: rawStateShname, country: rawUSshname },
    } = CONFIG;

    const sheet = getSheet(covid19);

    const conf = new ApprovalConfig({
      templateName: main,
      covidDataByState: getStateStats(sheet),
      totalUS: getTotalByUS(sheet),
    });

    conf.addLookup("us", getColLookupUS(logger));
    conf.addLookup("state", getColLookupState(logger));

    //set raw state data in case we need it
    conf.addRaw(indexRawStateData(rawStateShname));
    conf.addRaw(indexRawUsData(rawUSshname));

    const noData = reportedNoData();

    const common = { email: recipient || savedRecipient };

    (states || savedStates).forEach((state: string) =>
      handleApproval(
        { ...common, state } as Candidate,
        logger,
        conf,
        sandbox,
        noData
      )
    );

    const preparedSend = makeGSuiteEmailSender({
      logAccumulator: logger,
      senderName: defaultSender,
    });

    const { emails } = conf;

    logger.dumpAll();

    return sandbox ? promptSandboxResult(emails) : preparedSend(emails);
  } catch (error) {
    logger.log(`failed to send test emails: ${error}`, "error");
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

declare interface EmailsInPartsOpts {
  sender: ReturnType<
    typeof makeAmazonEmailSender | typeof makeGSuiteEmailSender
  >;
  emails: EmailConfig[];
  logger: InstanceType<typeof LogAccumulator>;
  parts?: number;
  wait?: number;
}

/**
 * @summary gets total email size in Kb
 * @param emails
 */
const getTotalEmailSize = (emails: EmailConfig[]) =>
  emails.reduce((a, { message }) => a + byteSize(message), 0) / 1024;

/**
 * @summary sends emails split into parts and makes stops between calls
 */
const sendEmailsInParts = ({
  sender,
  emails,
  logger,
  parts = 2,
  wait = 1e3,
}: EmailsInPartsOpts) => {
  try {
    const splitted = partify({ source: emails, parts });

    logger.log(
      `sending ${parts} parts, total size: ${getTotalEmailSize(emails)} Kb`
    );

    return splitted.every((part) => {
      //don't bother sending if empty
      if (!part.length) {
        return true;
      }

      const status = sender(part);
      Utilities.sleep(wait);
      return status;
    });
  } catch (error) {
    logger.log(`failed to send in parts: ${error}`, "error");
    return false;
  }
};
