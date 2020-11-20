/**
 * @typedef {{
 *  use : boolean | true,
 *  quota : number,
 *  senderName : string,
 *  rate : number,
 *  overrideSafe : (boolean|false),
 *  limit: number,
 *  lambda : string,
 *  identity : ("primary"|"secondary")
 * }} AmazonSettings
 *
 * @typedef {{
 *  use : boolean | true,
 *  limit : number
 * }} GsuiteSettings
 *
 * @typedef {{
 *  amazon : AmazonSettings,
 *  gsuite : GsuiteSettings
 * }} EmailProvidersConfig
 *
 * @typedef {{
 *  dataFor : string,
 *  recipient : string,
 *  sealed : (boolean|false),
 *  states : string[]
 * }} TestApprovalSettings
 *
 * @typedef {{
 *  analytics : AnalyticsSettings,
 *  approval : TestApprovalSettings,
 *  emails : EmailProvidersConfig
 * }} GeneralSettings
 *
 * @summary gets general settings
 * @param {{
 *  onError ?: (err: Error) => void
 * }}
 * @returns {GeneralSettings}
 */
const getGeneralSettings = ({ onError = console.warn } = {}) => {
  const {
    properties: { general },
    emails: { gsuiteLimit, amazonLimit },
  } = CONFIG;

  /** @type {AmazonSettings} */
  const amazonDefaults = {
    use: true,
    senderName: "",
    quota: 0,
    overrideSafe: false,
    limit: amazonLimit,
    lambda: "",
    identity: "secondary",
    rate: 10,
  };

  const now = Date.now();

  /** @type {AnalyticsSettings} */
  const analyticsDedaults = {
    usersPerChunk: 1,
    gaId: "",
    viewId: "",
    startFrom: toISOdate(yesterday(now)),
    endAt: toISOdate(now),
    sortOn: 0,
  };

  /** @type {GsuiteSettings} */
  const gsuiteDefaults = {
    use: true,
    limit: gsuiteLimit,
  };

  /** @type {TestApprovalSettings} */
  const approvalDefaults = {
    dataFor: "1970-01-01",
    recipient: Session.getEffectiveUser().getEmail(),
    sealed: false,
    states: ["NY", "CA", "OH", "MD", "FL"], //TODO: remove when out of prototype
  };

  try {
    const store = PropertiesService.getScriptProperties();

    const settings: GeneralSettings = JSON.parse(store.getProperty(general) || "{}");

    const {
      analytics,
      approval,
      emails: { amazon, gsuite },
    } = settings;

    return {
      analytics: Object.assign(analyticsDedaults, analytics),
      approval: Object.assign(approvalDefaults, approval),
      emails: {
        amazon: {  ...amazonDefaults, ...amazon },
        gsuite: Object.assign(gsuiteDefaults, gsuite),
      },
    };
  } catch (error) {
    onError(error);
    return {
      approval: approvalDefaults,
      emails: {
        amazon: amazonDefaults,
        gsuite: gsuiteDefaults,
      },
    };
  }
};

/**
 * @summary gets notice settings
 * @returns {NoticeSettings}
 */
const getOddsNoticeSettings = () => {
  const defaultSettings = {
    inline: "",
    separate: "",
    subjectPrefix: "",
    applySeparateTo: [],
  };

  try {
    const {
      properties: { notice },
    } = CONFIG;

    const store = PropertiesService.getScriptProperties();

    const settings = JSON.parse(store.getProperty(notice) || "{}");

    return Object.assign(defaultSettings, settings);
  } catch (error) {
    console.warn(`failed to get notice settings: ${error}`);
    return defaultSettings;
  }
};

/**
 * @summary extracts analytics settings
 * @returns {AnalyticsSettings}
 */
const getTrackingSettings = ({ analytics } = getGeneralSettings()) => analytics;

/**
 * @summary saves settings to storage
 * @param {string} property
 * @param {object} settings
 * @returns {boolean}
 */
const persistSettings = (property, settings) => {
  try {
    const store = PropertiesService.getScriptProperties();

    const toSave = JSON.stringify(settings);

    store.setProperty(property, toSave);

    return true;
  } catch (error) {
    console.warn(`failed to persist settings (${property}): ${error}`);
    return false;
  }
};

/**
 * @summary non-destructive update to settings
 * @param {{
 *  property? : string,
 *  settings? : object,
 *  path : string,
 *  update : object,
 *  onError? : function (Error) : void
 * }}
 */
const updateSettings = ({
  property = CONFIG.properties.general,
  settings,
  path,
  update,
  onError = console.warn,
}) => {
  try {
    const source = settings || getGeneralSettings({ onError });

    const updated = fromPath({ path, value: update });

    deepAssign({ source, updates: [updated], replaceArrays: true });

    return persistSettings(property, source);
  } catch (error) {
    onError(error);
    return false;
  }
};
