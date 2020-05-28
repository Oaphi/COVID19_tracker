//no support for class props in GAS yet;
const StateStatics = {
    defStart : 2,
    defThreshold: 5,

    /** @type {State} */
    initializedState : null
};

var State = class {

    /**
     * @typedef {({
     *  callback : function,
     *  start : (number | undefined),
     *  storeName : (string | undefined),
     *  threshold : (number | undefined)
     * })} stateConfig
     * 
     * @param {stateConfig} config 
     */
    constructor({
        callback,
        start = StateStatics.defStart,
        storeName = "continuator",
        threshold = StateStatics.defThreshold
    } = config) {

        this.callback = callback;

        this.processed = 0;

        this.start = +start;

        this.threshold = +threshold * 6e4;

        this.timezone = Session.getScriptTimeZone();

        this.storeName = storeName;

        this.startedAt = Date.now();
    }

    /**
     * @summary gets or initializes state
     * @param {stateConfig} [initConfig] 
     * @returns {State}
     */
    static getState(initConfig) {

        const { initializedState } = StateStatics;

        if (!initializedState) {
            StateStatics.initializedState = new State(initConfig).load();
        }

        return StateStatics.initializedState;
    }

    /**
     * @summary signals all done and resets everything
     * @returns {State}
     */
    allDone() {

        const store = PropertiesService.getScriptProperties();

        store.deleteProperty(this.storeName);

        this.reset();

        console.log("All finished");

        return this;
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
     * @returns {State}
     */
    continue() {

        if (!this.canContinue()) {

            this.save();

            console.log("Over the threshold, aborting");

            this.reset();

            return this;
        }

        const { start, callback } = this;

        console.log({start});

        callback(this, start);

        return this;
    }

    /**
     * @summary increments counter
     * @param {number} step 
     * @returns {State}
     */
    count(step = 1) {

        this.start += step;

        this.processed += 1;

        return this;
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
            this[key] = parsed[key];
        }

        console.log(this);

        return this;
    }

    /**
     * @summary resets state configuration to defaults
     * @returns {State}
     */
    reset() {

        delete this.startedAt;

        this.processed = 0;

        this.start = StateStatics.defStart;

        this.threshold = StateStatics.defThreshold;

        return this;
    }

    /**
     * @summary persists state config
     * @returns {State}
     */
    save() {
        const store = PropertiesService.getScriptProperties();

        const { 
            storeName, 
            start, 
            threshold, 
            timezone 
        } = this;

        const toSave = {
            start,
            threshold,
            timezone
        };

        const prepared = JSON.stringify(toSave);

        store.setProperty(storeName, prepared);

        console.log(`Saved current state: ${prepared}`);

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

}