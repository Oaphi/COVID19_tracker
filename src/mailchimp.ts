/**
 * @summary gets Mailchimp API settings
 */
const getMailchimpSettings = () => MailchimpApp.getSettings();

/**
 * @summary gets Mailchimp list by name
 * @param {string} name 
 * @param {object} [settings]
 * @returns {object?}
 */
const getMailchimpList = (name, settings = getMailchimpSettings()) => {    
    const [ list ] = MailchimpApp.getLists({ name, settings });
    return list || null;
};

/**
 * @summary gets config for selected member (utility for reducing code duplication)
 * @param {object} [settings]
 */
const getMemberConfigFromSelected = (settings = getMailchimpSettings()) => {

    const sh = SpreadsheetApp.getActiveRange();
    const email = sh.getValue();

    const { listName } = settings;

    const { id } = getMailchimpList(listName, settings);

    const config = { email, listId: id, settings };

    return config;
};

/**
 * @summary adds a Member to list
 * @param {object} [settings] 
 * @returns {boolean}
 */
const addMemberFromSelected = (settings = getMailchimpSettings()) => {
    const config = getMemberConfigFromSelected(settings);
    return MailchimpApp.addMember(config);
};

/**
 * @summary checks if a Member is in the list
 * @param {object} [settings]
 * @returns {boolean}
 */
const checkMemberFromSelected = (settings = getMailchimpSettings()) => {
    const config = getMemberConfigFromSelected(settings);
    return MailchimpApp.hasMember(config);
};

/**
 * @summary removes a Member from list
 * @param {boolean} [permanent]
 * @param {object} [settings]
 * @returns {boolean}
 */
const deleteMemberFromSelected = (permanent = false, settings = getMailchimpSettings()) => {
    const config = getMemberConfigFromSelected(settings);
    Object.assign(config, { permanent });
    return MailchimpApp.deleteMember(config);
};

/**
 * @summary updates Mailchimp API settings
 */
const updateMailchimpSettings = (newSettings) => {

    const oldSettings = MailchimpApp.getSettings();

    const updated = Object.assign(oldSettings, newSettings);

    MailchimpApp.setSettings(updated);
};