var QuotaResult = class {

    /**
     * @typedef {object} QuotaResultConfig
     * @property {number} [used] 
     * @property {number} remains
     * @property {number} max 
     * 
     * @param {QuotaResultConfig}
     */
    constructor({ used = 0, remains, max }) {

        const validRemains = remains >= 0 ? remains : (max - used);
        const validUsed = used >= 0 ? used : (max - validRemains);

        this.used = validUsed;
        this.max = max;

        this.setSafety("full");
    }

    /**
     * @summary gets available percent
     * @returns {number}
     */
    get availablePercent() {
        const { max, remaining } = this;
        return max > 0 ? Math.round((remaining / max) * 1e2) : 0;
    }

    /**
     * @summary gets available safe percent
     * @returns {number}
     */
    get safePercent() {
        const { max, safeRemaining } = this;
        return max > 0 ? Math.round((safeRemaining / max) * 1e2) : 0;
    }

    /**
     * @summary gets safe remaining quota (min 0)
     * @returns {number}
     */
    get safeRemaining() {
        const { remaining } = this;
        return remaining < 0 ? 0 : remaining;
    }

    /**
     * @summary gets usability status
     * @returns {boolean}
     */
    get status() {
        const { remaining } = this;
        return remaining > 0;
    }

    /**
     * @summary sets safety override level
     * @param {("full"|"none")} status 
     * @returns {QuotaResult}
     */
    setSafety(status = "full") {

        const getterName = "remaining";

        /** @type {Map.<string, PropertyDescriptor>} */
        const lvls = new Map([
            ["none", {
                get() {
                    const { max } = this;
                    return max;
                }
            }],
            ["full", {
                get() {
                    const { used, max } = this;
                    return max - used;
                }
            }]
        ]);

        const descriptor = Object.assign(lvls.get(status), { configurable: true });

        Object.defineProperty(this, getterName, descriptor);

        return this;
    }
};

/**
 * @summary gets sending quotas from Amazon
 * @param {GeneralSettings} settings
 * @returns {SendingQuotas}
 */
const getAmazonQuotas = (settings) => {

    const { emails: { amazon: { lambda, limit, overrideSafe, quota } } } = settings;

    if (!lambda) {
        console.log(`no lambda to get quotas`);
        return {};
    }

    try {

        /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
        const params = {
            muteHttpExceptions: true,
            headers: {
                Authorization: `Bearer ${ScriptApp.getIdentityToken()}`
            }
        };

        const response = UrlFetchApp.fetch(lambda + "/quotas", params);

        const success = isSuccess(response);

        const quotas = success ? JSON.parse(response.getContentText()) : {};

        return Object.assign(quotas, { limit: overrideSafe ? quota : limit, overrideSafe });

    } catch (error) {
        console.warn(`failed to get quotas ${error}`);
        return {};
    }
};

/**
 * @summary gets sending quotas for G Suite
 * @param {GeneralSettings} settings
 * @returns {SendingQuotas}
 */
const getGSuiteQuotas = (settings) => {

    try {

        const { emails: { gsuite: { limit } } } = settings;

        const remains = MailApp.getRemainingDailyQuota();

        return { sent: limit - remains, limit };

    } catch (error) {
        console.warn(`failed to get quotas ${error}`);
        return {};
    }

};

/**
 * @summary gets sending quotas for all services
 * @param {GeneralSettings} settings
 * @returns {Object<string,SendingQuotas>}
 */
const getAllServiceQuotas = (settings) => {
    return {
        amazon: getAmazonQuotas(settings),
        gsuite: getGSuiteQuotas(settings)
    };
};

//TODO: temporary, needs generalization
const checkAllServiceQuotas = (settings) => {
    return {
        amazon: checkAmazonRemainingQuota(settings),
        gsuite: checkRemainingQuota(settings),

        get allLeft() {

            const {
                amazon: { safeRemaining: amazon },
                gsuite: { safeRemaining: gsuite }
            } = this;

            return amazon + gsuite;
        },

        get status() {

            const {
                amazon: { status: amazon },
                gsuite: { status: gsuite }
            } = this;

            return [amazon, gsuite].some(Boolean);
        }
    };
};

/**
 * @summary checks remaining G Suite quota
 * @param {GeneralSettings} settings
 * @returns {QuotaResult}
 */
const checkRemainingQuota = (settings) => {

    const { sent = 0, limit } = getGSuiteQuotas(settings);

    return new QuotaResult({ max: limit, used: sent });
};

/**
 * @summary checks remaining Amazon quota
 * @param {GeneralSettings} settings
 * @returns {QuotaResult}
 */
const checkAmazonRemainingQuota = (settings) => {

    const { sent, limit, overrideSafe } = getAmazonQuotas(settings);

    const qr = new QuotaResult({ max: limit, used: sent });

    qr.setSafety(overrideSafe ? "none" : "full");

    return qr;
};