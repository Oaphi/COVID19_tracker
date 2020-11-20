var LogAccumulator = class {

  constructor(prefix = "") {
    this.prefix = prefix;

    /** @type {Map.<String,Error>} */
    this.errors = new Map();

    /** @type {Map.<String,Object>} */
    this.logs = new Map();

  }

  formatLog(stamp, log) {
    const { prefix } = this;
    return `${prefix ? `[${prefix}] ` : ""}${new Date(stamp).toLocaleString()} | ${log}`;
  }

  /**
   * @summary adds log to list of logs
   * @param {object|Error} log 
   * @param {("log"|"error")} [type]
   * @returns {LogAccumulator}
   */
  add(log, type = "log") {
    const { errors, logs } = this;

    const now = Date.now();

    type === "log" && logs.set(now, log);
    type === "error" && errors.set(now, log);

    return this;
  }

  /**
   * @summary dumps log
   * @param {("log"|"error")} [type]
   * @returns {LogAccumulator}
   */
  dump(type = "log") {
    const { errors, logs } = this;

    const logged = type === "log" ? logs : errors;
    const toDump = [...logged.entries()];

    if (!toDump.length) {
      return this;
    }

    const dump = toDump
      .map(([stamp, log]) => this.formatLog(stamp, log))
      .join("\n");

    console.log(dump);

    return this;
  }

  /**
   * @summary dumps all logs
   * @returns {LogAccumulator}
   */
  dumpAll() {
    this.dump("error");
    this.dump("log");
    return this;
  }

  /**
   * @summary gets logs joined
   * @param {("log"|"error")} type 
   * @returns {string}
   */
  get(type = "log") {
    const { errors, logs } = this;

    const logged = type === "log" ? logs : errors;
    const logEntries = [...logged.entries()];

    return logEntries
      .map(([stamp, log]) => this.formatLog(stamp, log))
      .join("\n");
  }

  /**
   * @summary gets all log levels
   * @returns {string[]}
   */
  getAll() {
    const { errors, logs } = this;
    return [...errors.entries(), ...logs.entries()]
      .map(([stamp, log]) => this.formatLog(stamp, log));
  }
};

var Benchmarker = class {

  /**
   * @summary ends benchmark
   * @returns {Benchmarker}
   */
  static end() {
    Benchmarker.ended = Date.now();
    Benchmarker.running = false;
    return Benchmarker;
  }

  /**
   * @summary gets current running time
   * @returns {number}
   */
  static current() {
    const { fractions, started, running } = Benchmarker;

    if (!running) {
      return 0;
    }

    const divisor = fractions.milliseconds;
    return (Date.now() - started) / divisor;
  }

  /**
   * @summary starts benchmark
   * @returns {Benchmarker}
   */
  static start() {
    Benchmarker.reset();
    Benchmarker.started = Date.now();
    Benchmarker.running = true;
    return Benchmarker;
  }

  /**
   * @summary resets benchmark
   * @returns {Benchmarker}
   */
  static reset() {
    Benchmarker.started = 0;
    Benchmarker.ended = 0;
    Benchmarker.running = false;
    return Benchmarker;
  }

  /**
   * @summary returns difference between start and end
   * @param {"milliseconds"|"seconds"|"minutes"} fraction 
   * @returns {number}
   */
  static took(fraction = "milliseconds") {
    const { fractions, started, ended } = Benchmarker;
    const divisor = fractions[fraction];
    return (ended - started) / divisor;
  }

};

Benchmarker.running = false;
Benchmarker.ended = 0;
Benchmarker.started = 0;
Benchmarker.fractions = {
  "milliseconds": 1,
  "seconds": 1000,
  "minutes": 60
};