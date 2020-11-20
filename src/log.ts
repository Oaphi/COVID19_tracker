type Loggable = string | Error | Array<any> | object;

type LogLevel = "error" | "log" | "warning";

var LogAccumulator = class {
  prefix: string = "";

  errors: Map<number, Loggable>;
  logs: Map<number, Loggable>;
  warnings: Map<number, Loggable>;

  constructor(prefix = "") {
    this.prefix = prefix;

    this.errors = new Map();
    this.warnings = new Map();
    this.logs = new Map();
  }

  formatLog(stamp: MaybeDate, log: Loggable) {
    const { prefix } = this;
    return `${prefix ? `[${prefix}] ` : ""}${new Date(
      stamp
    ).toLocaleString()} | ${log}`;
  }

  log(log: Loggable, type: LogLevel = "log") {
    const { errors, logs } = this;

    const now = Date.now();

    type === "log" && logs.set(now, JSON.stringify(log));
    type === "error" && errors.set(now, log as Error);
  }

  warn(log: Loggable) {
    this.log(log, "warning");
  }

  dump(type: LogLevel = "log") {
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
  }

  dumpAll() {
    this.dump("error");
    this.dump("warning");
    this.dump("log");
  }

  get(type: Loggable = "log") {
    const { errors, logs } = this;

    const logged = type === "log" ? logs : errors;
    const logEntries = [...logged.entries()];

    return logEntries
      .map(([stamp, log]) => this.formatLog(stamp, log))
      .join("\n");
  }

  getAll(): string[] {
    const { errors, logs } = this;
    return [...errors.entries(), ...logs.entries()].map(([stamp, log]) =>
      this.formatLog(stamp, log)
    );
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
  milliseconds: 1,
  seconds: 1000,
  minutes: 60,
};
