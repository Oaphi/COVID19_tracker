/**
 * @summary application configuration
 */
const CONFIG = {
  timezone: "GMT-4",
  spreadsheets: {
    users: "1MqCoisD8w0PkmHkIcDyAOVEndbQ5ndR7Auc-0g1Yw7U",
    self: SpreadsheetApp.getActiveSpreadsheet().getId()
  },
  sheets: {
    country: "Country",
    covid19: "Covid19",
    states: "States",
    tracking: "Analytics",
    users: "Users",
  },
  get userShName() {
    const {
      sheets: { users },
    } = this;
    return users;
  },
  get statsShName() {
    const {
      sheets: { covid19 },
    } = this;
    return covid19;
  },
  get rawStateStatsShName() {
    const {
      sheets: { states },
    } = this;
    return states;
  },
  get rawCountryStatsShName() {
    const {
      sheets: { country },
    } = this;
    return country;
  },
  dialogSize: {
    width: 4e2,
    height: 635,
    analyticsPull: {
      width: 6e2,
      height: 4e2,
    },
    lockFailure: {
      height: 150,
    },
    oddsNotice: {
      width: 5e2,
      height: 7e2,
    },
    generalSettings: {
      title: "General Settings",
      width: 5e2,
      height: 9e2,
    },
  },
  properties: {
    tracking: "email_tracking",
    analytics: "GA_settings",
    general: "general_settings",
    notice: "odds_notice",
    pull: "awaiting_analytics",
  },
  users: {
    statuses: {
      duplicate: "Duplicate",
    },
  },
  emails: {
    amazonChunkSize: 200,
    defaultSender: "covidping.com",
    amazonLimit: 2e3,
    gsuiteLimit: 15e2,
    retryRecords: 8,
    sandbox: {
      wait: 5e3,
    },
    status: "Mail Sent",
    templates: {
      main: "daily",
      weekly: "weekly"
    },
  },
  analytics: {
    maxConnections: 8,
    dataColumns: 6,
    dashboard: {
      rowsPerTable: 8,
      segmentHeight: 75,
      segmentWidth: 150,
    },
    waitBetweenChunks: 3e3,
    uri: {
      activity:
        "https://analyticsreporting.googleapis.com/v4/userActivity:search",
      collect: "https://www.google-analytics.com/collect",
      debug: "https://www.google-analytics.com/debug/collect",
    },
    reportType: "EVENT",
  },
  links: {
    country: "https://api.covidtracking.com/v1/us/daily.json",
    states: "https://api.covidtracking.com/v1/states/daily.json",
  },
  webapp: {
    uri: ScriptApp.getService().getUrl(),
  },
};

/**
 * @typedef {object} IndicesRef
 * @property {object} ColumnIndices
 * @property {ojbect} RowIndices
 */

/** 
 * 0-based column indices
 */
const SheetIndices = {
    StateStats: {
        ColumnIndices: {
            StatDate: 0,
            StateCode: 1,
            Positive: 2,
            Negative: 3,
            Pending: 4,
            HospitalizedCurrent: 5,
            HospitalizedTotal: 6,
            OnVentilatorCurrent: 9,
            OnVentilatorTotal: 10,
            Recovered: 11,
            Hash: 12,
            Deaths: 14,
            Hospitalized: 15,
            Total: 16,
            TotalTestResults: 17,
            PositiveToNegative: 18,
            Fips: 19,
            DeathsIncrease: 20,
            HospitalizedIncrease: 21,
            NegativeIncrease: 22,
            PositiveIncrease: 23,
            TotalTestsIncrease: 24
        }
    },
    Covid19: {
        ColumnIndices: {
            StateCode: 1,
            StateName: 2,
            Infections: 3,
            Infection1DayChange: 4,
            InfectionYesterday: 5,
            Infection7DayChange: 6,
            InfectionsTotalTo7DayAvg: 7,
            Hospital1DayChange: 9,
            HospitalYesterday: 10,
            HospitalsTotalTo7DayAvg: 11,
            Death1DayChange: 13,
            DeathYesterday: 14,
            Death7DayChange: 15,
            Population: 42,
            Deaths: {
              daily: 12,
              weekly: 33,
              overWeeks: 34,
              weekBefore: 35
            },
            InfectionsToTests : {
                weekly : 43,
                weeklyRank : 44,
                daily: 48,
                dailyRank: 49
            },
            Hospitalized: {
                Increase: 21
            }
        }
    }
};

/**
 * @summary gets either new or cached column indices
 * @returns {SheetIndices}
 */
function getIndices() {
    const { indices } = this;

    if (!indices) {
        this.indices = SheetIndices;
        return SheetIndices;
    }

    return SheetIndices;
}