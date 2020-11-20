/**
 * @typedef {object} TemplateConfig
 * @property {string} analyticsEmailOpen
 * @property {string} countryDEA0
 * @property {string} countryINF0
 * @property {string} countryTES0
 * @property {string} countryDEA1cmp
 * @property {string} countryINF1cmp
 * @property {string} countryINF2cmp
 * @property {string} countryTES1cmp
 * @property {string} countryTES2cmp
 * @property {string} countryDEA1clr
 * @property {string} countryDEA2clr
 * @property {string} countryINF1clr
 * @property {string} countryINF2clr
 * @property {string} countryTES1clr
 * @property {string} countryTES2clr
 * @property {string} countryDEA1val
 * @property {string} countryDEA2val
 * @property {string} countryINF1val
 * @property {string} countryINF2val
 * @property {string} countryRatioInfectedToTests infected to tests ratio last 7 days (by country)
 * @property {string} countryTES1val
 * @property {string} countryTES2val
 * @property {string} countryTOTdea total deaths by country
 * @property {string} countryTOTinf total infections by country
 * @property {string} countryTOTtes total tests by country
 * @property {string} DEAstatement death rate statement (<State> was <position> today)
 * @property {string} INFstatement infections rate statement (<State> was <position> today)
 * @property {string} TESstatement tests rate statement (<State> was <position> today)
 * @property {string} fulldate weekday longname (e.g. Monday)
 * @property {string} FullStatee full state name
 * @property {string} stateDEA0
 * @property {string} stateDEA2
 * @property {string} stateDEA1clr
 * @property {string} stateDEA2clr
 * @property {string} stateDEA1cmp
 * @property {string} stateDEA2cmp
 * @property {string} stateDEA1val
 * @property {string} stateDEA2val
 * @property {string} stateINF0
 * @property {string} stateINF2
 * @property {string} stateINF1clr
 * @property {string} stateINF2clr
 * @property {string} stateINF1cmp
 * @property {string} stateINF2cmp
 * @property {string} stateINF1val
 * @property {string} stateINF2val
 * @property {string} stateInfectedToTestedRank infected to tests current rank (by state)
 * @property {string} stateRatioInfectedToTests infected to tests ratio last 7 days (by state)
 * @property {string} stateTES0
 * @property {string} stateTES2
 * @property {string} stateTES1clr
 * @property {string} stateTES2clr
 * @property {string} stateTES1cmp
 * @property {string} stateTES2cmp
 * @property {string} stateTES1val
 * @property {string} stateTES2val
 * @property {string} Statee state code (e.g. OK)
 * @property {string} twitterLink link to twitter post
 */

/**
 * @typedef {({
 *  message : string,
 *  name : string,
 *  subject : string,
 *  to : string,
 *  attachments?: GoogleAppsScript.Base.BlobSource[]
 * })} EmailSendoutConfig
 */

/**
 * @typedef {({
 *  covidDataByState : Object.<string, (number | string)[]>,
 *  currentDate     ?: Date,
 *  emails          ?: EmailConfig[],
 *  indices         ?: SheetIndices,
 *  templateName     : string,
 *  timezone        ?: string,
 *  totalUS          : (string | number)[]
 * })} ApprovalSettings
 */

/**
 * @typedef {{
 *  overrideSafe : (boolean|undefined),
 *  rate : number,
 *  sent : number,
 *  quota : number,
 *  limit : number
 * }} SendingQuotas
 */

/**
 * @typedef {({
 *  includeStateNames : boolean|false,
 *  excludeInvalid : (boolean|true),
 *  generateIds : boolean,
 *  startIndex : (number | 0),
 *  startRow : (number | undefined),
 *  records : (any[][])
 * })} getCandidatesConfig
 */

/**
 * @typedef {{
 *  start : (number|1),
 *  max : number,
 *  generateIds : boolean,
 *  excludeInvalid : (boolean|true),
 *  includeStateNames : boolean|false,
 * }} UserGetterConfig
 */

declare interface ParsedCandidates {
candidates : Candidate[],
invalid : number,
total : number
}

declare interface Candidate {
  first_name: string;
  full_state: string;
  id: string | number;
  index: number;
  last_name: string;
  name: string;
  email: string;
  unsent: boolean;
  state: string | undefined;
  status: string | undefined;
  subscribed: Date;
}

/**
 * @typedef {{
 *  inline : string,
 *  separate : string,
 *  subjectPrefix : string,
 *  applySeparateTo : string[]
 * }} NoticeSettings
 */

/**
 * @typedef {{
 * gaId : string,
 * endAt : string,
 * startFrom : string,
 * viewId : string,
 * sortOn : number,
 * usersPerChunk : number
 * }} AnalyticsSettings;
 */

/**
 * @typedef {{
 *  onError? : (Error) => void,
 *  settings : AnalyticsSettings,
 *  users    : Candidate[]
 * }} AnalyticsReportingOptions
 */

/**
 * @typedef {({
 *  to : string,
 *  subject : string,
 *  message : string
 * })} emailConfig
 */

type SendStatus = "Mail Sent" | "Duplicate" | "";

type UserRecord = [
  id: string,
  date: Date,
  email: string,
  state: string,
  status: SendStatus
];
