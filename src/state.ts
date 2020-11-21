/**
 * @summary gets valid identities from Amazon
 * @param {GeneralSettings} settings
 * @returns {{
 *  primary ?: string,
 *  secondary ?: string[]
 * }}
 */
const getAmazonIdentities = (settings = getGeneralSettings()) => {
  const {
    emails: {
      amazon: { lambda },
    },
  } = settings;

  if (!lambda) {
    console.log(`no lambda to get identities`);
    return {};
  }

  try {
    const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      muteHttpExceptions: true,
      headers: {
        Authorization: `Bearer ${ScriptApp.getIdentityToken()}`,
      },
    };

    const response = UrlFetchApp.fetch(lambda + "/identities", params);
    const success = isSuccess(response);
    return success ? JSON.parse(response.getContentText()) : {};
  } catch (error) {
    console.warn(`failed to get identities ${error}`);
    return {};
  }
};

/**
 * @typedef {{
 *  attempted: number,
 *  bounced: number,
 *  complained: number,
 *  rejected: number
 * }} SendTotals
 *
 * @param {{
 *  settings : GeneralSettings,
 *  onError ?: (err: Error) => void
 * }}
 * @returns {SendTotals}
 */
const getAmazonStats = ({
  onError = (err) => console.warn(err),
  settings = getGeneralSettings(),
} = {}) => {
  const statDefaults = {
    attempted: 0,
    bounced: 0,
    complained: 0,
    rejected: 0,
  };

  try {
    const {
      emails: {
        amazon: { lambda },
      },
    } = settings;

    const params = wrapIdentityAuth({ muteHttpExceptions: true });
    const response = UrlFetchApp.fetch(`${lambda}/stats`, params);
    const success = isSuccess(response);

    return success ? JSON.parse(response.getContentText()) : statDefaults;
  } catch (error) {
    onError(error);
    return statDefaults;
  }
};

/**
 * @summary parses email tracking statistics
 * @returns {{
 *  [ string ] : EmailTrackingRecord[]
 * }}
 */
const getEmailTrackingState = () => {
  const {
    sheets: { tracking: name },
  } = CONFIG;

  const dataSheet = getOrInitSheet({ name });

  const values = dataSheet.getDataRange().getValues();

  const [headers, ...data] = values;

  const dates = {};

  const sliced = data.slice(3);

  headers.forEach((d, i) => {
    try {
      const str = toISOdate(d);

      const statRecords = sliced.map(
        ([uid, date, email, code, state, total, ...sendouts]) => ({
          uid,
          email,
          date,
          code,
          state,
          total,
          viewed: sendouts[i],
        })
      );

      const date = dates[str] || (dates[str] = []);
      date.push(...statRecords);
    } catch (error) {
      console.warn(`failed to parse stat data: ${error}`);
    }
  });

  return dates;
};

//no support for class props in GAS yet;
const StateStatics = {
  defStart: 1,
  defThreshold: 6,

  /** @type {State} */
  initializedState: null,
};

var State = class {
  start: number;

  callback: <T>(state: InstanceType<typeof State>, start: number) => T;

  /**
   * @typedef {({
   *  callback : function (State, number) : any,
   *  logger : function (string) : void,
   *  start : (number | undefined),
   *  storeName : (string | undefined),
   *  threshold : (number | undefined),
   *  type : ("production" | "sandbox")
   * })} stateConfig
   *
   * @param {stateConfig} arg0
   */
  constructor({
    callback = (state) => state,
    logger = console.log,
    start = StateStatics.defStart,
    storeName = "continuator",
    threshold = StateStatics.defThreshold,
    type = "production",
  } = {}) {
    this.callback = callback;

    this.processed = 0;

    this.previousFailures = 0;
    this.previousSuccesses = 0;
    this.succeeded = 0;
    this.failed = 0;

    this.logger = logger;

    this.type = type;

    this.start = +start;

    this.threshold = +threshold * 6e4;

    this.storeName = storeName;

    this.startedAt = Date.now();
    this.lastTimeFailed = 0;
    this.lastTimeSucceeded = 0;
  }

  /**
   * @summary gets locale formatted start datetime
   */
  get formattedStart(): string {
    const { startedAt } = this;
    return new Date(startedAt).toLocaleString();
  }

  /**
   * @summary gets formatted passed time (in seconds)
   */
  get formattedPassed(): string {
    const { timePassed } = this;
    return Math.floor(timePassed / 1e3);
  }

  /**
   * @summary gets number of ms passed
   * @returns {number}
   */
  get timePassed() {
    const { startedAt } = this;
    return Date.now() - startedAt;
  }

  /**
   * @summary dumps a log of itself
   * @returns {State}
   */
  log() {
    const {
      formattedStart,
      formattedPassed,
      failed,
      processed,
      succeeded,
      logger,
    } = this;

    return logger(`started at ${formattedStart}, 
        took ${pluralizeCountable(formattedPassed, "second")}, 
        succeeded ${succeeded}, 
        failed ${failed}
        processed ${processed}`);
  }

  /**
   * @summary signals all done and resets everything
   * @returns {State}
   */
  allDone() {
    const store = PropertiesService.getScriptProperties();

    store.deleteProperty(this.storeName);

    this.reset();

    console.log("All done, saving state");

    return this.saveSuccess();
  }

  /**
   * @summary checks if can continue working
   * @returns {boolean}
   */
  canContinue() {
    const { threshold, startedAt = Date.now() } = this;

    const current = Date.now();

    return current < startedAt + threshold;
  }

  /**
   * @summary launches the execution if under threshold
   *
   * @description
   * When called, checks if can continue
   *      if not
   *          persists failure info and exits
   *      else
   *          runs callback
   *          increments start on success
   */
  continue(): this | ReturnType<InstanceType<typeof State>["callback"]> {
    const { start, callback } = this;

    if (typeof callback !== "function") {
      return this;
    }

    this.startedAt = Date.now();

    if (!this.canContinue()) {
      console.log("Over the threshold, aborting");

      return this.saveFailure();
    }

    return callback(this, start);
  }

  countFailed() {
    this.failed += 1;
    return this;
  }

  countSucceeded() {
    this.succeeded += 1;
    return this;
  }

  /**
   * @summary increments processed items counter
   * @param {number} [step]
   * @returns {State}
   */
  countProcessed(step = 1) {
    this.processed += step;
    return this;
  }

  /**
   * @summary increments start but does not count as processed
   * @param {number} [step]
   * @returns {State}
   */
  addStartIfNoFailures(step = 1) {
    this.failed || (this.start += step);
    return this;
  }

  /**
   * @summary increments starting position only if never failed
   * @param {number} [step]
   * @returns {State}
   */
  incrementStartIfNoFailures(step = 1) {
    this.failed || (this.start += step);
    return this.countProcessed();
  }

  /**
   * @summary persists failure info
   * @returns {State}
   */
  saveFailure() {
    this.lastTimeSucceeded = 0;
    this.lastTimeFailed = Date.now();
    console.log(`Saving failure at ${this.lastTimeFailed}`);
    return this.save();
  }

  /**
   * @summary persists success info
   * @returns {State}
   */
  saveSuccess() {
    this.lastTimeFailed = 0;
    this.lastTimeSucceeded = Date.now();
    console.log(`Saving success at ${this.lastTimeSucceeded}`);
    return this.save();
  }

  /**
   * @summary loads the persisted state
   * @returns {State}
   */
  load() {
    const store = PropertiesService.getScriptProperties();

    const { storeName } = this;

    const saved = store.getProperty(storeName) || "{}";

    const parsed = JSON.parse(saved);

    for (const key in parsed) {
      const value = parsed[key];

      //skip persisted start if user decided to start later
      if (key === "start" && value < this[key]) {
        continue;
      }

      this[key] = parsed[key];
    }

    console.log(`Loading state: ${JSON.stringify(this)}`);

    return this;
  }

  /**
   * @summary overrides starting index
   * @param {number} newStart
   * @returns {State}
   */
  overrideStart(newStart) {
    this.start = parseInt(newStart);
    console.log(`Overridden start: ${newStart}`);
    return this;
  }

  /**
   * @summary resets state configuration to defaults
   * @returns {State}
   */
  reset() {
    try {
      this.processed = 0;

      this.initialStart = StateStatics.defStart;
      this.start = StateStatics.defStart;

      this.threshold = StateStatics.defThreshold * 6e4;

      const lock = PropertyLockService.getScriptLock();
      lock.releaseLock();
    } catch (error) {
      console.warn(error);
    }

    return this;
  }

  /**
   * @summary resets all state data (including persisted)
   * @returns {boolean}
   */
  fullReset() {
    try {
      console.log(`Performing full state reset`);

      this.reset();

      this.lastTimeFailed = 0;
      this.lastTimeSucceeded = 0;

      this.save();

      return true;
    } catch (error) {
      console.warn(error);
      return false;
    }
  }

  /**
   * @summary persists state config
   * @returns {State}
   */
  save() {
    const store = PropertiesService.getScriptProperties();

    const {
      failed,
      succeeded,
      storeName,
      start,
      lastTimeFailed,
      lastTimeSucceeded,
      threshold,
    } = this;

    const toSave = {
      previousFailures: failed,
      previousSuccesses: succeeded,
      lastTimeFailed,
      lastTimeSucceeded,
      start,
      threshold,
    };

    const prepared = JSON.stringify(toSave);

    console.log(`Saving current state: ${prepared}`);

    store.setProperty(storeName, prepared);

    return this;
  }

  /**
   * @summary sets threshold that stops execution
   */
  setThreshold(minutes = 5) {
    this.threshold = minutes * 6e4;
    return this;
  }
};

/**
 * @type {function (stateConfig) : State}
 */
const boundGetState = function (initConfig) {
  const { initializedState } = StateStatics;

  if (!initializedState) {
    StateStatics.initializedState = new State(initConfig).load();
  }

  return StateStatics.initializedState;
}.bind(State);

State.getState = boundGetState;

/**
 * @summary handles state reset
 * @returns {boolean}
 */
const resetPersistedState = () => new State().fullReset();

export { State };
