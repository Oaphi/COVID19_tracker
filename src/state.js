
/**
 * @summary persists settings about odds notice text
 * @param {string} propName
 * @param {{ inline : string, separate : string }} options
 */
const persistOddsNoticeText = (propName, { inline, separate }) => {

    const store = PropertiesService.getScriptProperties();

    const toPersist = JSON.stringify({ inline, separate });

    console.log(toPersist);

    store.setProperty(propName, toPersist);
};

/**
 * @summary gets and parses odds notice config from store
 * @returns {{ inline : string, separate : string }}
 */
const parseOddsNoticeConfig = () => {

    const store = PropertiesService.getScriptProperties();

    const { oddsNoticePropName } = CONFIG;

    const value = store.getProperty(oddsNoticePropName) || "{}";

    const { inline = "", separate = "" } = JSON.parse(value);

    return {
        inline,
        separate
    };
};

//no support for class props in GAS yet;
const StateStatics = {
    defStart: 2,
    defThreshold: 5,

    /** @type {State} */
    initializedState: null
};

var State = class {

    /**
     * @typedef {({
     *  callback : function (State, number) : any,
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
        start = StateStatics.defStart,
        storeName = "continuator",
        threshold = StateStatics.defThreshold,
        type = "production"
    } = {}) {

        this.callback = callback;

        this.processed = 0;

        this.previousFailures = 0;
        this.previousSuccesses = 0;
        this.succeeded = 0;
        this.failed = 0;

        this.type = type;

        this.start = +start;

        this.threshold = +threshold * 6e4;

        this.timezone = Session.getScriptTimeZone();

        this.storeName = storeName;

        this.startedAt = Date.now();
        this.lastTimeFailed = 0;
        this.lastTimeSucceeded = 0;
    }

    /**
     * @summary gets locale formatted start datetime
     * @returns {string}
     */
    get formattedStart() {
        const { startedAt } = this;
        return new Date(startedAt).toLocaleString();
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

        const {
            threshold,
            startedAt = Date.now()
        } = this;

        const current = Date.now();

        return current < (startedAt + threshold);
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
     * 
     * @returns {State}
     */
    continue() {

        this.startedAt = Date.now();

        if (!this.canContinue()) {

            console.log("Over the threshold, aborting");

            return this.saveFailure();
        }

        const { start, callback } = this;

        callback(this, start);

        return this;
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

        this.processed = 0;

        this.initialStart = StateStatics.defStart;
        this.start = StateStatics.defStart;

        this.threshold = StateStatics.defThreshold * 6e4;

        console.log(`Resetting state: ${JSON.stringify(this)}`);

        return this;
    }

    /**
     * @summary resets all state data (including persisted)
     * @returns {State}
     */
    fullReset() {

        console.log(`Performing full state reset`);

        this.reset();

        this.lastTimeFailed = 0;
        this.lastTimeSucceeded = 0;

        return this.save();
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
            timezone
        } = this;

        const toSave = {
            previousFailures: failed,
            previousSuccesses: succeeded,
            lastTimeFailed,
            lastTimeSucceeded,
            start,
            threshold,
            timezone
        };

        const prepared = JSON.stringify(toSave);

        console.log(`Saving current state: ${prepared}`);

        store.setProperty(storeName, prepared);

        return this;
    }

    /**
     * @summary sets threshold that stops execution
     * @param {number} minutes 
     * @returns {State}
     */
    setThreshold(minutes = 5) {
        this.threshold = minutes * 6e4;
        return this;
    }

};

/**
 * @type {function (stateConfig) : State}
 */
const boundGetState = (function (initConfig) {

    const { initializedState } = StateStatics;

    if (!initializedState) {
        StateStatics.initializedState = new State(initConfig).load();
    }

    return StateStatics.initializedState;
}).bind(State);

State.getState = boundGetState;

/**
 * @summary handles state reset
 * @returns {void}
 */
const resetPersistedState = () => {
    const state = new State();
    state.fullReset();
};