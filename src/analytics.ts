///<reference types="../fetch" />

/**
 * @typedef {object} analyticsConfig
 * @property {string} [baseURI] analytics URI
 * @property {string} [cid] client ID (autogenerated by default)
 * @property {string} [tid] tracking ID
 * @property {("email")} ec event category
 * @property {string} [el] event label
 * @property {string} ev event value
 *
 * @typedef {object} documentAnalyticsConfig
 * @property {string} [dp] document path, like /email/newsletter
 * @property {string} [dt] document title, like "Newsletter"
 *
 * @typedef {object} clickAnalyticsConfig
 * @property {string} //source,  utm_source
 * @property {string} //medium,  utm_medium
 * @property {string} //product, utm_campaign
 *
 * @typedef {analyticsConfig & documentAnalyticsConfig} fullAnalyticsConfig
 * @typedef {analyticsConfig & clickAnalyticsConfig} fullClickAnalyticsConfig
 */

/**
 *
 * @param {fullAnalyticsConfig} config
 * @param {("open"|"click")} eventType
 * @returns {string}
 */
const makeAnalyticsQuery = (config, eventType) => {
  const cacheBuster = Math.floor(Math.random() * 1e10);

  const { gaId: tid } = getTrackingSettings();

  const { cid, dp, dt, el, ev } = config;

  const validParams = {
    v: 1,
    tid,
    t: "event",
    ec: "email",
    ea: eventType,
    z: cacheBuster,
    cid,
    dp,
    dt,
    el,
    ev,
  };

  //"el" has to go first as &el is incorrectly encoded in Gmail
  return JSONtoQuery(validParams, {
    encodeParams: true,
    paramOrder: [
      "el",
      "tid",
      "cid",
      "v",
      "t",
      "ec",
      "ea",
      "ev",
      "dp",
      "dt",
      "z",
    ],
  });
};

class DateRange {
  /**
   * @param {number|string|Date} start
   * @param {number|string|Date} end
   */
  constructor(start, end) {
    const defaultDate = Date.now();
    this.start = new Date(start || defaultDate);
    this.end = new Date(end || defaultDate);
  }

  toJSON() {
    const { start, end } = this;

    return {
      startDate: toISOdate(start),
      endDate: toISOdate(end),
    };
  }
}

/**
 * @summary resets analytics datasheet
 * @param {{
 *  store? : GoogleAppsScript.Properties.ScriptProperties,
 *  onError? : (Error) => void
 * }}
 * @returns {boolean}
 */
const resetAnalyticsData = ({
  store = PropertiesService.getScriptProperties(),
  onError = console.warn,
} = {}) => {
  const {
    properties: { pull },
    analytics: { dataColumns },
    sheets: { tracking: name },
  } = CONFIG;

  try {
    store.deleteProperty(pull);

    const sheet = getOrInitSheet({ name });

    const rng = sheet.getRange(
      1,
      dataColumns + 1,
      sheet.getMaxRows(),
      sheet.getMaxColumns()
    );

    rng.clearContent();

    return true;
  } catch (error) {
    onError(error);
    return false;
  }
};

/**
 * @summary parses event label from GA
 * @param {string} label
 * @param {number} [eventValue]
 * @returns {{ date : string, code : sring }}
 */
const parseEventLabel = (label, eventValue) => {
  try {
    console.log({ eventValue });

    //use event value for period when it was used to find date of sending
    const fallback =
      eventValue && eventValue > 1 ? toISOdate(new Date(eventValue)) : "";

    const [code, date = fallback] = label.split("/");

    return { code, date };
  } catch (error) {
    console.warn(`invalid event label: ${error}`);
    return { code: "", date: "" };
  }
};

/**
 * @typedef {{
 *  interval : number,
 *  start : number
 * }} AnalyticsPullState
 *
 * @summary gets persisted pull state
 * @returns {AnalyticsPullState}
 */
const getPullState = () => {
  const {
    properties: { pull },
    analytics: { waitBetweenChunks },
  } = CONFIG;

  const pullDefaults = { start: 0, interval: waitBetweenChunks };

  const store = PropertiesService.getScriptProperties();

  const pullState = JSON.parse(store.getProperty(pull) || "{}");

  return Object.assign(pullDefaults, pullState);
};

const setPullState = ({
  old = getPullState(),
  updates = {},
  onError = console.warn,
} = {}) => {
  try {
    const {
      properties: { pull },
    } = CONFIG;

    const updated = Object.assign(old, updates);

    const store = PropertiesService.getScriptProperties();

    store.setProperty(pull, JSON.stringify(updated));

    return updated;
  } catch (error) {
    onError(error);
    return old;
  }
};

const compose = (...f: Function[]): Function =>
  f.reduce((x, y) => (...args) => y(x(...args)));

const flatten = (arr: any[]) => arr.flat();

const mapToSessions = (r: GoogleAppsScript.URL_Fetch.HTTPResponse) => {
  const { sessions = [] } = JSON.parse(r.getContentText());
  return sessions;
};

const mapToActivities = (sessions: { activities: object[] }[]) =>
  sessions.map(({ activities }) => activities);

const mapToEvent = (activities: { activityTime: string; event: object }[]) =>
  activities.map(({ activityTime, event }) => ({ ...event, activityTime }));

const makeUserAnalyticsInfo = (
  users: Candidate[],
  views: { [date: string]: number },
  idx: number
) => {
  const user = users[idx];

  const limit = toISOdate(user.subscribed);

  const recent = shallowFilter({
    source: views,
    filter: (_, d) => d >= limit,
  });

  return { ...recent, ...user };
};

/**
 * @summary gets user data from Reporting API
 * @param {AnalyticsReportingOptions}
 * @returns {{
 *   data : [{ [string] : number, id : string }],
 *   codes : number[]
 * }}
 */
const getAnalyticsData = ({
  users = getUsers().unique,
  settings = getTrackingSettings(),
  onError = console.warn,
} = {}) => {
  const {
    analytics: { uri, reportType, maxConnections },
  } = CONFIG;

  const { viewId, startFrom, endAt } = settings;

  const rng = new DateRange(startFrom, endAt);

  const { activity } = uri;

  const configurer = FetchApp.getConfig({
    domain: activity,
    method: FetchApp.AllowedMethods.POST,
  })
    .setOAuthToken()
    .mute();

  const pageSize = 2e3; //reporting page size;

  const basePayload = {
    viewId,
    dateRange: rng,
    activityTypes: [reportType],
    pageSize,
    user: {
      userId: null,
    },
  };

  const reqParams = { mute: "muteHttpExceptions" };

  const reqConfig = {
    include: ["url", "mute", "method", "headers", "payload"],
  };

  const requests = users.map(({ id }) => {
    const { user } = Object.create(basePayload);
    user.userId = id;

    configurer.payload = basePayload;

    return configurer.json(reqParams, reqConfig);
  });

  const result = { data: [], codes: [] };

  try {
    const toOpens = (events) =>
      events.reduce((views, { activityTime, eventLabel, eventValue }) => {
        const amount = +eventValue; //fixes decision to pass date as event value

        const [, date = toISOdate(activityTime)] = (amount > 1
          ? `${eventLabel}/${toISOdate(amount)}`
          : eventLabel
        ).split("/");

        if (date < startFrom) {
          return views;
        }

        views[date] = (views[date] || 0) + 1;

        return views;
      }, {});

    const pipeline = compose(
      mapToSessions,
      flatten,
      mapToActivities,
      flatten,
      mapToEvent,
      toOpens
    );

    const chunks = chunkify(requests, { size: maxConnections });

    const flattened: GoogleAppsScript.URL_Fetch.HTTPResponse[] = chunks.flatMap(
      (requests) => {
        const responses = UrlFetchApp.fetchAll(requests);
        Utilities.sleep(1e3 + Math.floor(Math.random() * 3));
        return responses;
      }
    );

    return {
      codes: flattened.map((r) => r.getResponseCode()),
      data: flattened.map((e, i) =>
        makeUserAnalyticsInfo(users, pipeline(e), i)
      ),
    };
  } catch (error) {
    onError(error);
    return result;
  }
};

var AnalyticsUser = (() => {
  const c = function ({ id, sub, email, code, state }) {
    this.id = id;
    this.subscribed = toISOdate(sub);
    this.email = email;
    this.code = code;
    this.state = state;
  };

  c.fromEntry = ([id, sub, email, code, state]) =>
    new c({ id, sub, email, code, state });

  c.toEntry = () => {
    const { id, subscribed, email, code, state } = this;
    return [id, subscribed, email, code, state];
  };

  return c;
})();

/**
 * @summary gets analytics data for actively selected users
 */
const getAnalyticsFromActive = () => {
  const rng = SpreadsheetApp.getActiveRange();

  const grid = rng.getValues();

  const users = grid.map(AnalyticsUser.fromEntry);

  const { data, codes } = getAnalyticsData({ users });

  const entries = data.map((dt) => Object.entries(dt).sort(dateEntrySorter));

  return { entries, codes };
};

/**
 * @summary pulls current user list for analytics
 * @param {{
 *  sheet   : GoogleAppsScript.Spreadsheet.Sheet,
 *  onError : (err: Error) => void
 * }}
 */
const pullAnalyticsUsers = ({ sheet, onError = console.warn } = {}) => {
  const {
    sheets: { tracking },
  } = CONFIG;

  try {
    const { unique } = getUsers();

    const trackingSheet = sheet || getOrInitSheet({ name: tracking });
    const srow = 6; //first 4 are headers, row 5 is a filter

    const values = unique
      .filter(({ id }) => id)
      .map(({ id, email, state, subscribed, full_state }) => [
        id,
        subscribed,
        email,
        state,
        full_state,
      ]);

    const rng = trackingSheet.getRange(srow, 1, values.length, 5);

    rng.clearContent();

    rng.setValues(values);
  } catch (error) {
    onError(error);
    return false;
  }
};

/**
 * @summary sorts analytics data by criteria
 */
const sortAnalyticsData = ({
  direction = 1,
  sortOn = 0,
  onError = (err) => console.warn(err),
}: {
  direction?: 0 | 1;
  sortOn?: number;
  onError?: (err: Error) => void;
} = {}): boolean => {
  const {
    sheets: { tracking },
  } = CONFIG;

  try {
    const sh = getSheet(tracking);
    expandFilter({ filter: sh.getFilter(), onError });

    const rng = getRngToLast(sh, 6, 1);

    const comparator = direction
      ? (a, b) => Number(b) - Number(a)
      : (a, b) => Number(a) - Number(b);

    const sorted = columnSort(rng.getValues(), comparator, sortOn);

    rng.setValues(sorted);

  } catch (error) {
    onError(error);
    return false;
  }
};

/**
 * @summary updates email tracking data
 * @param {{
 *  onError? : (Error) => void,
 *  settings : AnalyticsSettings
 * }}
 * @returns {number[]}
 */
const updateAnalyticsData = ({
  users = getUsers().unique,
  settings = getTrackingSettings(),
  onError = console.warn,
} = {}) => {
  const {
    analytics: { dataColumns },
    sheets: { tracking },
  } = CONFIG;

  const { data, codes } = getAnalyticsData({ users, settings });

  const sheet = getSheet(tracking);

  const [, ...dataRows] = getValsToLast(sheet, 1, 1);

  try {
    const dateData = {};

    dataRows.forEach(([uid], ri) => {
      const {
        id,
        unsent,
        last_name,
        subscribed,
        first_name,
        full_state,
        status,
        index,
        email,
        state,
        name,
        ...rest
      } = data.find(({ id }) => uid && id === uid) || {}; //TODO: possible to optimize

      if (id) {
        const adjustedRow = ri - 4; //4 first rows are control rows

        const dates = Object.entries(rest);

        dates.forEach(([dt, views]) => {
          const dateCol = dateData[dt] || (dateData[dt] = []);
          const uData = dateCol[adjustedRow] || 0;
          dateCol[adjustedRow] = uData + views;
        });
      }
    });

    const entries = Object.entries(dateData);

    const maxColumns = longest(entries.map(([__, v]) => v));

    const dateEntries = entries.sort(dateEntrySorter).map(([date, v]) => {
      const filled = fillEmptyPlaces({
        arr: v,
        modifier: (v) => [v],
        maxColumns,
      });

      return [[date], [""], [""], [""], [""], ...filled];
    });

    const newVals: (number | string)[][] = dateEntries.reduce((acc, nxt) =>
      acc.map((row, ri) => [...row, nxt[ri] ? nxt[ri][0] : ""])
    );

    const rng = sheet.getRange(
      1,
      dataColumns + 1,
      newVals.length,
      newVals[0].length
    );

    const grid = foldGrids((a, b) => b || a, rng.getValues(), newVals);

    const {
      spreadsheets: { self },
    } = CONFIG;

    const status = setValuesAPI(rng, grid, self);

    if (!status) {
      return [];
    }
  } catch (error) {
    onError(error);
  }

  return codes;
};

/**
 * @summary updates daily engagement percent
 */
const getDailyEngagement = (
  rng: GoogleAppsScript.Spreadsheet.Range,
  uniqueOpens: number[]
): number[] => {
  try {
    const usersByDateDict = getTotalUsersByDate();

    const [dates] = rng.getValues();

    return dates.map((datestamp, idx) => {
      const dateUsers = usersByDateDict[datestamp];
      const dateOpens = uniqueOpens[idx];

      if (!dateUsers) {
        return 0;
      }

      return dateOpens / dateUsers;
    });
  } catch (error) {
    console.warn(error);
    return [];
  }
};

type AnalyticsTotals = [number[], number[]];

/**
 * @summary updates total Analytics values
 */
const updateTotalGA = () => {
  const {
    sheets: { tracking },
    analytics: { dataColumns },
  } = CONFIG;

  const sh = getSheet(tracking);

  const vals = getValsToLast(sh, 6, dataColumns + 1);

  const totals = vals.reduce((acc: AnalyticsTotals, cur, i) => {
    if (i === 0) {
      return [cur.map((val) => (val ? 1 : 0)), cur];
    }

    const [counts, sums] = acc;

    return [addRowCount(counts, cur), sumRows(sums, cur)];
  }, []);

  const [counts] = totals;

  const nxtCol = dataColumns + 1;

  const rng = sh.getRange(2, nxtCol, 3, sh.getLastColumn() - dataColumns);
  const hdrRng = rng.offset(-1, 0, 1); //date headers

  totals.unshift(getDailyEngagement(hdrRng, counts));

  rng.setValues(totals);

  //sum data by user row
  const sumRng = sh.getRange(6, dataColumns, sh.getLastRow() - 5, 1);
  const sums = vals.map((row) => [sum(row)]);
  sumRng.setValues(sums);
};

/**
 * @param {Candidate} candidate
 * @param {fullAnalyticsConfig} [config]
 * @returns {string}
 */
const trackEmailOpen = (candidate, config = {}) => {
  try {
    const {
      analytics: {
        uri: { collect },
      },
    } = CONFIG;

    const { baseURI = collect } = config;

    config.cid = candidate.id;
    config.dt = "COVID-19 Tracking Email";

    const query = makeAnalyticsQuery(config, "open");

    const fullURI = `${baseURI}?${query}`;

    return `<img src="${fullURI}" />`;
  } catch (error) {
    console.warn(error);
    return "";
  }
};