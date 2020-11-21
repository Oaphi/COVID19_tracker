function addCommas(nStr: string | number): string {
  try {
    if (nStr !== "+N%2FA%") {
      nStr = nStr.toFixed(0);
    }

    var [int, float] = nStr.split(".");

    var x1 = int;

    var x2 = float ? "." + float : "";

    var rgx = /(\d+)(\d{3})/;

    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, "$1" + "," + "$2");
    }

    return x1 + x2;
  } catch (error) {
    console.warn(error);
    return nStr as string;
  }
}

/**
 * @summary adds sign to input
 * @param {string} v
 * @returns {string}
 */
function addSign(v) {
  if (v === "+N/A%") {
    v = "+%";
  } else if (v === "0%") {
    v = "+0%";
  } else if (parseFloat(v).toFixed(2) > 0) {
    v = `+${v}`;
  }
  return v;
}

/**
 * Checks whether request is successfull
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} res
 * @returns {Boolean}
 */
const isSuccess = (res) => {
  const code = res.getResponseCode();
  return code >= 200 && code < 300;
};

/**
 * @summary fetches all requests at once
 * @param {string[]} urls
 * @returns {object[]}
 */
const fetchAlljson = (urls) => {
  /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequest} */
  const params = {
    contentType: "application/json",
    muteHttpExceptions: true,
    method: "get",
  };

  try {
    const requests = urls.map((url) => Object.assign({ url }, params));

    const responses = UrlFetchApp.fetchAll(requests);

    return responses.map((resp) => {
      const successful = isSuccess(resp);

      return successful ? JSON.parse(resp.getContentText()) : {};
    });
  } catch (error) {
    console.warn(`failed to fetch requests: ${error}`);
    return [];
  }
};

/**
 * @summary fetches endpoint and parses content
 * @param {string} url
 * @param {object} [headers]
 * @param {{ json }}
 * @returns {?object[]}
 */
const fetchAndParseContent = (url, headers = {}, { json } = {}) => {
  /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
  const params = {
    contentType: "application/json",
    muteHttpExceptions: true,
  };

  Object.keys(headers).length && (params.headers = headers);
  json && (params.payload = JSON.stringify(json));

  const response = UrlFetchApp.fetch(url, params);

  const code = response.getResponseCode();

  if (isSuccess(response)) {
    const jsonData = response.getContentText();

    try {
      return JSON.parse(jsonData);
    } catch (dataError) {
      Logger.log(dataError);
      return null;
    }
  }

  console.log({ code }, response.getContentText());

  return null;
};

/**
 * @typedef {object} MenuConfig
 * @property {string} title
 * @property {("menu"|"item"|"separator")} type
 * @property {MenuConfig[]} items
 * @property {string} [action]
 *
 * @typedef {object} BuildMenuConfig
 * @property {string} [menuType]
 * @property {boolean} [append]
 *
 * @param {MenuConfig} menuConfig
 * @param {BuildMenuConfig}
 * @returns {?GoogleAppsScript.Base.Menu}
 */
const buildMenu = (
  { title, items },
  { menuType = "sheets", append = true } = {}
) => {
  const uiMap = new Map([
    ["docs", DocumentApp.getUi],
    ["forms", FormApp.getUi],
    ["sheets", SpreadsheetApp.getUi],
    ["slides", SlidesApp.getUi],
  ]);

  const uiGetter = uiMap.get(menuType);

  if (!uiGetter) {
    return null;
  }

  const ui = uiGetter();

  const menu = ui.createMenu(title);

  items.forEach((item) => {
    const { title, type = "item", action } = item;

    if (type === "item") {
      return menu.addItem(title, action);
    }

    if (type === "menu") {
      const submenuConfig = { menuType, append: false };
      return menu.addSubMenu(buildMenu(item, submenuConfig));
    }

    if (type === "separator") {
      return menu.addSeparator();
    }
  });

  append && menu.addToUi();

  return menu;
};

/**
 * @typedef {{
 *  index : number,
 *  spreadsheet : (GoogleAppsScript.Spreadsheet.Spreadsheet | undefined)
 * }} SheetByIndexConfig
 *
 * @summary gets sheet by its index
 * @param {SheetByIndexConfig}
 * @returns {GoogleAppsScript.Spreadsheet.Sheet?}
 */
const getSheetByIndex = ({
  index = 0,
  spreadsheet = SpreadsheetApp.getActiveSpreadsheet(),
}) => {
  const [targetSheet] = spreadsheet
    .getSheets()
    .filter((__, idx) => index === idx);

  return targetSheet || null;
};

/**
 * @typedef {{
 *  cells   : number,
 *  columns : number,
 *  data    : {
 *      columns : number,
 *      rows    : number
 *  },
 *  id      : string,
 *  index   : number,
 *  name    : string,
 *  rows    : number
 * }} SheetStats
 *
 * @summary get consolidated sheet stats
 * @param {{
 *  sheet?   : GoogleAppsScript.Spreadsheet.Sheet,
 *  onError? : (err : Error) => void
 * }}
 * @returns {SheetStats}
 */
const getSheetInfo = ({
  sheet = SpreadsheetApp.getActiveSheet(),
  onError = (err) => console.warn(err),
} = {}) => {
  try {
    return {
      get cells() {
        const { columns, rows } = this;
        return rows * columns;
      },
      columns: sheet.getMaxColumns(),
      data: {
        columns: sheet.getLastColumn(),
        rows: sheet.getLastRow(),
      },
      id: sheet.getSheetId(),
      index: sheet.getIndex(),
      name: sheet.getName(),
      rows: sheet.getMaxRows(),
    };
  } catch (error) {
    onError(error);
    return {};
  }
};

/**
 * @summary gets spreadsheet info
 */
const getSpreadsheetInfo = () => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  return {
    id: ss.getId(),
    url: ss.getUrl(),

    get cells() {
      const { sheets } = this;
      return sheets.reduce((a, { cells }) => a + cells, 0);
    },

    get editors() {
      return ss.getEditors();
    },
    get name() {
      return ss.getName();
    },
    get numSheets() {
      const {
        sheets: { length },
      } = this;
      return length;
    },
    get sheetIds() {
      const { sheets } = this;
      return sheets.map(({ id }) => id);
    },
    get sheetIndices() {
      const { sheets } = this;
      return sheets.map(({ index }) => index);
    },
    get sheetNames() {
      const { sheets } = this;
      return sheets.map(({ name }) => name);
    },
    get sheets() {
      return ss.getSheets().map((sheet) => getSheetInfo({ sheet }));
    },
    get viewers() {
      const viewers = ss.getViewers();
      return viewers;
    },
  };
};

declare interface GetOrInitSheetConfig {
  name: string;
  index?: number;
  hidden?: boolean;
}

/**
 * @summary gets sheet by its name or index and creates if missing
 */
const getOrInitSheet = ({
  name,
  index,
  hidden = false,
}: GetOrInitSheetConfig): GoogleAppsScript.Spreadsheet.Sheet => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = null;

  if (name) {
    sheet = spreadsheet.getSheetByName(name);
  }

  if (index !== undefined) {
    sheet = getSheetByIndex({ index, spreadsheet });
  }

  if (!sheet) {
    const newSheet = spreadsheet.insertSheet(name);
    hidden && newSheet.hideSheet();
    sheet = newSheet;
  }

  return sheet;
};

/**
 * @summary activates first row of the sheet
 */
const activateFirstRow = () => jumpTo({ allCols: true, skipFrozen: true });

/**
 * @summary activates last row of the sheet
 */
const activateLastRow = () => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const lrow = sh.getLastRow();
  return jumpTo({ row: lrow, allCols: true });
};

/**
 * @summary activates from active cell to last row
 */
const activateHereToLastRow = () => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();

  const curr = sh.getActiveCell();

  const currRow = curr.getRow();
  const lastDiff = sh.getLastRow() - currRow + 1;

  const toLast = sh.getRange(
    currRow,
    curr.getColumn(),
    lastDiff < 1 ? 1 : lastDiff,
    1
  );
  toLast.activate();
};

/**
 * @summary retrieves content from html source
 * @param {string} filename
 * @returns {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * @summary converts number to floating-point with fixed radix
 * @param {number} i
 * @returns {string}
 */
function setDecimalPlaces(i) {
  if (i < 1 && i !== 0) {
    return i.toFixed(2);
  } else {
    return i.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}

/**
 * @todo mixing strings and numbers is a bad practise
 * @summary converts
 * @param {(string|number)} a
 * @returns {string}
 */
function topercent(a) {
  if (a === "+N/A%" || a === "0%" || /\d{1,2}%$/.test(a)) {
    return a;
  }

  const percent = parseFloat(a) * 100;

  const rounded = parseInt(percent) ? Math.round(percent) : percent;
  return `${rounded.toFixed(parseInt(rounded) || !rounded ? 0 : 2)}%`;
}

/**
 * @summary same as topercent, but returns int for floats with .00
 * @param {string|number} [num]
 * @param {boolean} [treatZeroAsNaN]
 * @returns {string}
 */
const toIntOrFloatPercent = (num = 0, treatZeroAsNaN = false) => {
  const int = parseInt(num) * 100;

  if (isNaN(int) || (treatZeroAsNaN && num === 0)) {
    return `${num}%`;
  }

  const float = parseFloat((parseFloat(num) * 100).toFixed(2));
  return `${int !== float ? float : int}%`;
};

/**
 * @summary splits array in consequitive subsequences
 * @param {any[]} [source]
 * @returns {any[][]}
 */
const splitIntoConseq = (source = []) => {
  const sequences = [],
    tails = [];

  let highestElem = -Infinity;

  source.forEach((element) => {
    const precedeIndex = tails.indexOf(element + 1);
    const tailIndex = tails.indexOf(element - 1);

    if (tailIndex > -1) {
      sequences[tailIndex].push(element);
      tails[tailIndex] = element;
      return;
    }

    if (precedeIndex > -1) {
      sequences[precedeIndex].unshift(element);
      tails[precedeIndex] = element;
      return;
    }

    if (element > highestElem) {
      tails.push(element);
      sequences.push([element]);
      highestElem = element;
      return;
    }

    const spliceIndex = tails.findIndex((e) => e < element) + 1;
    tails.splice(spliceIndex, 0, element);
    sequences.splice(spliceIndex, 0, [element]);
  });

  return sequences;
};

/**
 * @summary gets daily sendout send date (legacy)
 * @param {GoogleAppsScript.Spreadsheet.Sheet|string} sheet
 * @returns {Date}
 */
function getcelldate(sheet) {
  const validatedSheet =
    typeof sheet === "string" ? getOrInitSheet({ name: sheet }) : sheet;

  const date = new Date(validatedSheet.getRange("A2").getValue());

  return date;
}

/**
 * @summary gets current week day
 * @param {Date} [date]
 * @param {string} [locale]
 * @returns {string}
 */
const getDayOfWeek = (date = new Date(), locale = "en-US") => {
  const intl = new Intl.DateTimeFormat(locale, { weekday: "long" });
  return intl.format(date);
};

/**
 * @summary gets value from object or inits it via callback
 */
const prop = <T>(
  obj: object,
  propName: string,
  callback: (arg0: object) => T
): T => {
  if (propName in obj) {
    return obj[propName];
  }

  if (callback) {
    obj[propName] = callback(obj);
    return obj[propName];
  }
};

/**
 * @summary builds <state> was <place> today: <new total> new <type> per 1MM residents | <total> total
 */
const buildStatement = (
  stateName: string,
  rank: number,
  newTotal: number,
  type: StatementType,
  total: number
): string => {
  const isFirst = rank === 1;

  const rankSuffixed = ordinal_suffix_of(newTotal ? rank : 56);

  const today = `${stateName} had the ${
    isFirst ? "" : `${rankSuffixed} `
  }most `;

  const plural = pluralizeCountable(
    parseFloat(newTotal.toString()),
    type,
    false
  );

  return `${today} ${plural} per capita today with ${setDecimalPlaces(
    newTotal
  )} per 1MM people | ${addCommas(total)} total`;
};

/**
 * @summary builds expanded positivity ratio
 *
 * @param {{
 *  state ?: string,
 *  numDays ?: number,
 *  rankDaily ?: number,
 *  ratioDaily : string|number,
 *  rankWeekly : number,
 *  ratioWeekly : string|number
 * }} PositivityRatioOptions
 *
 * @returns {string}
 */
const buildInfectionsByTestsRatio = ({
  state = "US",
  numDays = 7,
  rankDaily,
  ratioDaily,
  rankWeekly,
  ratioWeekly,
  onError = (err) =>
    console.warn(`failed to build positivity statement: ${err}`),
} = {}) => {
  try {
    const isFirst = rankDaily === 1;

    const dailyOrdinal = ordinal_suffix_of(
      parseFloat(ratioDaily) ? rankDaily : 56
    );

    const weeklyOrdinal = ordinal_suffix_of(rankWeekly);

    const dailyStatement = `${state} had the ${
      isFirst ? "" : `${dailyOrdinal} `
    }highest positivity rate today at ${ratioDaily}`;

    const weeklyStatement = `the ${
      isFirst ? "" : `${weeklyOrdinal} `
    }highest over the past ${pluralizeCountable(
      numDays,
      "day"
    )} at ${ratioWeekly}`;

    return `${dailyStatement} and ${weeklyStatement}`;
  } catch (error) {
    onError(error);
    return "";
  }
};

/**
 * @summary loads saved state
 * @returns {object}
 */
function getSavedState() {
  const store = PropertiesService.getScriptProperties();
  const prop = store.getProperty("continuator");

  if (!prop) {
    new State({}).save();
    return getSavedState();
  }

  return JSON.parse(prop);
}

/**
 * @summary appends ordinal suffix
 * @param {number} i
 * @returns {string}
 */
function ordinal_suffix_of(i) {
  var j = i % 10,
    k = i % 100;

  if (j === 1 && k !== 11) {
    return i + "st";
  }

  if (j === 2 && k !== 12) {
    return i + "nd";
  }

  if (j === 3 && k !== 13) {
    return i + "rd";
  }

  return i + "th";
}

/**
 * @summary changes noun (countable) to plural form and prepends amount
 *
 * @example
 * 1,test -> 1 test
 * 2,test -> 2 tests
 * 21,test -> 21 tests
 *
 * @param {number} amount
 * @param {string} noun
 * @param {boolean} returnAmount
 * @returns {string}
 */
const pluralizeCountable = (amount, noun, returnAmount = true) => {
  const normalized = noun.toLowerCase();

  const withAmount = returnAmount ? `${amount} ` : "";

  if (amount === 1) {
    return `${withAmount}${normalized}`;
  }

  const irregulars = {
    child: "children",
    goose: "geese",
    tooth: "teeth",
    foot: "feet",
    mous: "mice",
    person: "people",
  };

  const irregularPlural = irregulars[normalized];

  if (irregularPlural) {
    return `${withAmount}${irregularPlural}`;
  }

  if ((manWomanCase = normalized.match(/(\w*)(man|woman)$/))) {
    return `${withAmount}${manWomanCase[1]}${manWomanCase[2].replace(
      "a",
      "e"
    )}`;
  }

  const staySameExceptions = new Set([
    "sheep",
    "series",
    "species",
    "deer",
    "fish",
  ]);
  if (staySameExceptions.has(normalized)) {
    return `${withAmount}${normalized}`;
  }

  const wordBase = normalized.slice(0, -2);

  const irregularEndingWithA = new Set(["phenomenon", "datum", "criterion"]);
  if (irregularEndingWithA.has(normalized)) {
    return `${withAmount}${wordBase}a`;
  }

  const twoLastLetters = normalized.slice(-2);
  const oneLastLetter = twoLastLetters.slice(-1);

  const irregularEndingWithForFe = new Set([
    "roofs",
    "belief",
    "chef",
    "chief",
  ]);
  if (irregularEndingWithForFe.has(normalized)) {
    return `${withAmount}${normalized}s`;
  }

  if (/(?:f|fe)$/.test(noun)) {
    return `${withAmount}${normalized.replace(/(?:f|fe)$/, "ves")}`;
  }

  const twoLettersReplaceMap = {
    is: "es",
    us: "i",
  };

  const lastLettersReplace = twoLettersReplaceMap[twoLastLetters];
  if (lastLettersReplace && wordBase.length > 1) {
    return `${withAmount}${wordBase}${lastLettersReplace}`;
  }

  const twoLettersAddMap = new Set(["ch", "ss", "sh"]);
  if (twoLettersAddMap.has(twoLastLetters)) {
    return `${withAmount}${normalized}es`;
  }

  const oneLastLetterMap = new Set(["s", "x", "z"]);
  if (oneLastLetterMap.has(oneLastLetter)) {
    return `${withAmount}${normalized}es`;
  }

  const consonants = new Set([
    "b",
    "c",
    "d",
    "f",
    "g",
    "h",
    "j",
    "k",
    "l",
    "m",
    "n",
    "p",
    "q",
    "r",
    "s",
    "t",
    "v",
    "x",
    "z",
    "w",
    "y",
  ]);

  const isLetterBeforeLastConsonant = consonants.has(normalized.slice(-2, -1));

  if (oneLastLetter === "o" && isLetterBeforeLastConsonant) {
    const lastOexceptions = new Set(["photo", "buro", "piano", "halo"]);

    return `${withAmount}${normalized}${
      lastOexceptions.has(normalized) ? "s" : "es"
    }`;
  }

  if (oneLastLetter === "y" && isLetterBeforeLastConsonant) {
    return `${withAmount}${normalized.slice(0, -1)}ies`;
  }

  return `${withAmount}${normalized}s`;
};

/**
 * @summary joins a list of entities ("a,b, and c")
 */
const getJoinedEntityList = (entities: string[]) => {
  const { length } = entities;

  const addComma = length > 2;

  const [first] = entities;

  if (length === 1) {
    return first;
  }

  return `${entities.slice(0, -1).join(", ")}${addComma ? "," : ""} and ${
    entities.slice(-1)[0]
  }`;
};

/**
 * @summary pushes or sets property
 * @param {object|[]} arrOrObj
 * @param {string} key
 * @param {any} val
 * @returns {object|[]}
 */
const pushOrSet = (arrOrObj, key, val) => {
  Array.isArray(arrOrObj) ? arrOrObj.push(val) : (arrOrObj[key] = val);
  return arrOrObj;
};

/**
 * @typedef {object} ShallowFilterConfig
 * @property {object[]|object} source
 * @property {function (string,any) : boolean} [filter]
 * @property {object[]|object} [accumulator]
 *
 * @param {ShallowFilterConfig}
 */
const shallowFilter = ({ source, filter = (...args) => true, accumulator }) => {
  const arrAsBase = Array.isArray(source);
  const objAsBase = typeof source === "object" && source;

  const output = arrAsBase ? [] : objAsBase ? {} : source;

  Object.entries(source).forEach(([k, v]) => {
    filter(v, k, source)
      ? pushOrSet(output, k, v)
      : accumulator && pushOrSet(accumulator, k, v);
  });

  return output;
};

/**
 * @summary recursive parser
 * @param {string[]} order
 * @param {[string, any][]} entries
 * @param {boolean} encode
 * @param {string} seq
 * @returns {string}
 */
const deep = (order, entries, encode, seq) =>
  entries
    .map((entry) => {
      const [key, value] = entry;

      const seqOrSingleKey = `${seq ? `${seq}[${key}]` : key}`;

      if (value === null) {
        return;
      }

      if (typeof value === "object") {
        return deep(order, Object.entries(value), encode, seqOrSingleKey);
      }

      if (value !== undefined) {
        const encoded = encode ? encodeURIComponent(value) : value;
        return `${seqOrSingleKey}=${encoded}`;
      }
    })
    .filter((val) => val !== undefined)
    .join("&");

/**
 * @summary maps each object key with mapper
 * @param {object|[]} obj
 * @param {function (string,any) : any} mapper
 * @param {{
 *  opaqueArrays : (boolean|true),
 *  keyMapper : function (string) : string
 * }} [options]
 * @returns {object|[]}
 */
const deepMap = (obj, mapper, { keyMapper, opaqueArrays = true } = {}) => {
  const isArr = Array.isArray(obj);

  const output = isArr ? [] : {};

  const mapKeys = typeof keyMapper === "function";

  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value) && !opaqueArrays) {
      output[mapKeys ? keyMapper(key) : key] = mapper(key, value);
      return;
    }

    let mapped =
      typeof value === "object" && value
        ? deepMap(value, mapper, { keyMapper, opaqueArrays })
        : mapper(mapKeys ? keyMapper(key) : key, value);

    output[mapKeys && !isArr ? keyMapper(key) : key] = mapped;
  });

  return output;
};

/**
 * @typedef {object} JSONtoQueryConfig
 * @property {boolean} [encodeParams=false]
 * @property {string[]} [paramOrder=[]]
 */

/**
 * @summary converts object to query
 * @param {object} json parameters
 * @param {JSONtoQueryConfig} [config]
 * @returns {string} query string
 */
function JSONtoQuery(
  json,
  { encodeParams, paramOrder = [] } = (config = {
    encodeParams: false,
    paramOrder: [],
  })
) {
  const ordered = [];

  Object.entries(json).forEach((entry) => {
    const [key] = entry;

    const orderIndex = paramOrder.indexOf(key);

    if (orderIndex > -1) {
      ordered[orderIndex] = entry;
      return;
    }

    ordered.push(entry);
  });

  return deep(paramOrder, ordered, encodeParams);
}

/**
 * @summary makes word Sentence-case
 * @param {string} word
 * @returns {string}
 */
const sentenceCase = (word) =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

/**
 * @summary gets column index from A1 notation
 * @param {string} a1
 * @param {("column"|"row")} [type]
 * @returns {number}
 */
const getIndexFromA1 = (a1, type = "column") => {
  if (!a1) {
    throw new RangeError(`Expected A1 notation`);
  }

  const alphabet = "abcdefghijklmnopqrstuvwxyz";

  const [, cellChars, rowNumber] = a1.match(/^([A-Z]+)(?=(\d+)|$)/i) || [];

  if (!cellChars) {
    throw new RangeError(`Expected correct A1 notation, actual: ${a1}`);
  }

  if (type === "row") {
    return rowNumber - 1;
  }

  const lcaseChars = cellChars.toLowerCase().split("").reverse();
  const middle = lcaseChars.reduce((acc, cur, i) => {
    return acc + (alphabet.indexOf(cur) + 1) * (i > 0 ? 26 ** i : 1);
  }, 0);

  return middle - 1;
};

/**
 * @summary converts YYYYMMDD date in numeric format into value
 * @param {number} date
 * @returns {number}
 */
const datenumToValue = (date) =>
  new Date(
    date.toString().replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
  ).valueOf();

/**
 * @summary resets date value
 * @param {Date} date
 * @returns {number}
 */
const getResetDateValue = (date) => new Date(date).setHours(0, 0, 0, 0);

/**
 * @summary gets effective user email if possible
 * @returns {string}
 */
const getUserEmail = () => {
  try {
    return Session.getEffectiveUser().getEmail();
  } catch (error) {
    console.log(`User info is not available from this context`);
    return "anonymous";
  }
};

/**
 * @typedef {object} StepReduceConfig
 * @property {any[]} source
 * @property {function(any,any,number?,any[]?) : any} callback
 * @property {number} [step]
 * @property {any} [initial]
 *
 * @param {StepReduceConfig}
 */
const reduceWithStep = ({ source = [], callback, step = 1, initial }) => {
  return source.reduce((acc, curr, i) => {
    return i % step
      ? acc
      : callback(acc, curr, i + step - 1, source, initial || source[0]);
  });
};

/**
 * @summary formats date to ISO
 * @param {Date | string | number} date
 * @returns {string}
 */
const toISOdate = (date) =>
  (date instanceof Date ? date : new Date(date)).toISOString().slice(0, 10);

/**
 * @typedef {object} ChunkifyConfig
 * @property {number} [size]
 * @property {number[]} [limits]
 *
 * @summary splits an array into chunks
 * @param {any[]} source
 * @param {ChunkifyConfig}
 * @returns {any[][]}
 */
const chunkify = (source, { limits = [], size } = {}) => {
  const output = [];

  if (size) {
    const { length } = source;

    const maxNumChunks = Math.ceil((length || 1) / size);
    let numChunksLeft = maxNumChunks;

    while (numChunksLeft) {
      const chunksProcessed = maxNumChunks - numChunksLeft;
      const elemsProcessed = chunksProcessed * size;
      output.push(source.slice(elemsProcessed, elemsProcessed + size));
      numChunksLeft--;
    }

    return output;
  }

  const { length } = limits;

  if (!length) {
    return [Object.assign([], source)];
  }

  let lastSlicedElem = 0;

  limits.forEach((limit, i) => {
    const limitPosition = lastSlicedElem + limit;
    output[i] = source.slice(lastSlicedElem, limitPosition);
    lastSlicedElem = limitPosition;
  });

  const lastChunk = source.slice(lastSlicedElem);
  lastChunk.length && output.push(lastChunk);

  return output;
};

/**
 * @typedef {object} ShrinkConfig
 * @property {any[][]} [source]
 * @property {{
 *  top : number,
 *  right : number,
 *  bottom : number,
 *  left : number
 * }} [leave]
 * @property {number} [left]
 * @property {number} [right]
 * @property {number} [bottom]
 * @property {number} [horizontally]
 * @property {number} [top]
 * @property {number} [vertically]
 *
 * @summary shirnks a grid
 * @param {ShrinkConfig} [source]
 */
const shrinkGrid = ({
  vertically = 0,
  source,
  top = 0,
  right = 0,
  left = 0,
  leave = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  horizontally = 0,
  bottom = 0,
  all = 0,
} = {}) => {
  if (!source || !source.length) {
    return [[]];
  }

  const {
    top: leaveTop = 0,
    right: leaveRight = 0,
    bottom: leaveBottom = 0,
    left: leaveLeft = 0,
  } = leave;

  if (horizontally) {
    left = right = Math.floor(horizontally / 2);
  }

  if (vertically) {
    top = bottom = Math.floor(vertically / 2);
  }

  const { length } = source;

  const topShift = length - (leaveBottom || length);
  const bottomShift = length - (leaveTop || length);

  return source
    .slice(all || top || topShift, (all || length) - (bottom || bottomShift))
    .map((row) => {
      const { length } = row;

      const leftShift = length - (leaveRight || length);
      const rightShift = length - (leaveLeft || length);

      return row.slice(
        all || left || leftShift,
        (all || length) - (right || rightShift)
      );
    });
};

const AND = (...args) => args.every(Boolean);

/**
 * @summary validates a grid of value
 *
 * @param {{
 *  without : (any|undefined),
 *  grid : any[][],
 *  has : (any|undefined),
 *  minCols : (number|undefined),
 *  minRows : (number|undefined),
 *  notBlank : (boolean|false),
 *  notEmpty : (boolean|false),
 *  notFull : (boolean|false)
 * }}
 *
 * @returns {boolean}
 */
const validateGrid = ({
  grid = [[]],
  has,
  without,
  blank,
  notBlank = false,
  notEmpty = false,
  notFilled = false,
  minCols,
  minRows,
} = {}) => {
  const { length } = grid;

  if (!length) {
    throw new RangeError("Grid must have at least one row");
  }

  const validRows = minRows || length;
  if (length < validRows) {
    return false;
  }

  const [{ length: firstRowLength }] = grid;
  if (notEmpty && !firstRowLength) {
    return false;
  }

  const validCols = minCols || firstRowLength;
  if (firstRowLength < validCols) {
    return false;
  }

  let numEmpty = 0,
    numFilled = 0,
    matchOnVal = 0;

  const gridValidated = grid.every((row) =>
    row.every((cell) => {
      const notContains = without !== undefined ? cell !== without : true;

      if (!notContains) {
        return false;
      }

      cell === "" ? numEmpty++ : numFilled++;
      cell === has && (matchOnVal |= 1);

      return true;
    })
  );

  const blankValid = blank !== undefined ? !numFilled === blank : true;

  return (
    gridValidated &&
    blankValid &&
    (!notFilled || !!numEmpty) &&
    (!notBlank || !!numFilled) &&
    (has === undefined || !!matchOnVal)
  );
};

/**
 * @summary jumps to a specified range
 *
 * @typedef {{
 *  skipFrozen ?: boolean,
 *  row        ?: number,
 *  col        ?: number,
 *  allRows    ?: boolean,
 *  allCols    ?: boolean
 * }} JumpOptions
 *
 * @param {JumpOptions} options
 * @returns {boolean}
 */
const jumpTo = ({
  row = 1,
  col = 1,
  allRows = false,
  allCols = false,
  skipFrozen = false,
  onError = (err) => console.warn(err),
} = {}) => {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getActiveSheet();

    const rng = sh.getRange(
      allRows ? 1 : row || 1,
      allCols ? 1 : col || 1,
      allRows ? sh.getMaxRows() : 1,
      allCols ? sh.getMaxColumns() : 1
    );

    if (skipFrozen) {
      const numFrozen = sh.getFrozenRows();
      const shifted = rng.offset(numFrozen, 0);
      shifted.activate();
      return true;
    }

    rng.activate();
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
};

/**
 * @summary pings Amazon EC2 instance to check if emailer is running
 * @param {GeneralSettings}
 * @returns {boolean}
 */
const checkAmazonStatus = (
  {
    emails: {
      amazon: { lambda },
    },
  } = getGeneralSettings()
) => {
  const configurer = FetchApp.getConfig({
    domain: lambda,
    mute: true,
    paths: ["check"],
    token: ScriptApp.getIdentityToken(),
  });

  const pingConfig = configurer.json(
    { mute: "muteHttpExceptions" },
    { include: ["url", "method", "mute", "headers"] }
  );

  const [pingResponse] = UrlFetchApp.fetchAll([pingConfig]);

  return FetchApp.isSuccess({ response: pingResponse });
};

/**
 * @summary offsets a date-like value to day before
 * @param {number|string|Date} [date]
 * @returns {Date}
 */
const yesterday = (date = Date.now()) => {
  const parsed = new Date(date);
  const MIL_IN_DAY = 864e5;
  return new Date(parsed - MIL_IN_DAY);
};

/**
 * @typedef {{
 *  date?   : number|string|Date,
 *  numberOf?: number,
 *  onError?: (err : Error) => void,
 *  period?: "days"|"months"|"years"
 * }} OffsetOptions
 *
 * @param {OffsetOptions}
 * @returns {Date}
 */
const offset = ({
  date = Date.now(),
  numberOf = 1,
  period = "days",
  onError = (err) => console.warn(err),
  tzOffsetter = gmtToEdt,
} = {}) => {
  try {
    const parsed = tzOffsetter(new Date(date));

    const offsetDays = (date: Date, n: number) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate() - n);

    const offsetMonths = (date: Date, n: number) =>
      new Date(date.getFullYear(), date.getMonth() - n, date.getDate());

    const offsetYears = (date: Date, n: number) =>
      new Date(date.getFullYear() - n, date.getMonth(), date.getDate());

    const periodMap = new Map([
      ["days", offsetDays],
      ["months", offsetMonths],
      ["years", offsetYears],
    ]);

    return periodMap.get(period)(parsed, numberOf);
  } catch (error) {
    onError(error);
    return new Date(date);
  }
};

/**
 * @summary calculates difference between 2 dates (in 24-hour based days)
 * @param {Date|number|string} a
 * @param {Date|number|string} b
 */
const dateDiff = (a, b) =>
  Math.abs(Math.floor((new Date(a) - new Date(b)) / 864e5));

/**
 * @summary adjusts size of range to values grid size
 *
 * @param {{
 *  autoAdjust : {
 *      width : (boolean|false),
 *      height : (boolean|false)
 *  },
 *  grid : any[][],
 *  move : {
 *      top : number|0,
 *      right : number|0,
 *      bottom : number|0,
 *      left : number|0
 *  },
 *  range : GoogleAppsScript.Spreadsheet.Range,
 *  setValues : (boolean|false)
 * }} config
 *
 * @returns {GoogleAppsScript.Spreadsheet.Range}
 */
const adjustToGrid = ({
  autoAdjust = {
    width: false,
    height: false,
  },
  grid,
  move = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  range,
  setValues = false,
  overwrite = true,
} = config) => {
  const { length: numRows } = grid;

  const [firstRow = []] = grid;

  const { top = 0, right = 0, bottom = 0, left = 0 } = move;

  const newRng = range.offset(
    top - bottom,
    left - right,
    numRows,
    firstRow.length || 1
  );

  if (setValues && numRows) {
    if (!overwrite) {
      const oldVals = newRng.getValues();
      const formulas = newRng.getFormulas();

      const newVals = oldVals.map((r, ri) =>
        r.map((c, ci) => (c !== "" ? formulas[ri][ci] || c : grid[ri][ci]))
      );
      newRng.setValues(newVals);
    } else {
      newRng.setValues(grid);
    }
  }

  const { height = false, width = false } = autoAdjust;

  const sheet = newRng.getSheet();

  if (width) {
    const start = newRng.getColumn();
    const end = newRng.getNumColumns();
    sheet.autoResizeColumns(start, end);
  }

  if (height) {
    const start = newRng.getRow();
    const end = newRng.getNumRows();
    sheet.autoResizeRows(start, end);
  }

  return newRng;
};

/**
 * @summary deep assigns object props
 * @param {{
 *  source       ?: object,
 *  updates      ?: object[],
 *  replaceArrays : boolean,
 *  objGuard     ?: (any) => boolean,
 *  onError      ?: (err: Error) => void
 * }}
 * @returns {object}
 */
const deepAssign = ({
  replaceArrays = false,
  source = {},
  updates = [],
  objGuard = (obj) => typeof obj === "object" && obj,
  onError = console.warn,
} = {}) => {
  try {
    if (Array.isArray(source) && replaceArrays) {
      source.length = 0;
    }

    const sameType = (a, b) => typeof a === typeof b;

    return updates.reduce((ac, up) => {
      const entries = Object.entries(up);

      const objEntries = entries.filter(([_, v]) => objGuard(v));
      const restEntries = entries.filter(([_, v]) => !objGuard(v));

      Object.assign(source, Object.fromEntries(restEntries));

      objEntries.reduce(
        (a, [k, v]) =>
          (a[k] = deepAssign({
            replaceArrays,
            source: sameType(a[k], v) ? a[k] || {} : v,
            updates: [v],
          })),
        ac
      );

      return ac;
    }, source);
  } catch (error) {
    onError(error);
  }

  return source;
};

/**
 * @typedef {{
 *  upToMatching ?: (any) => boolean,
 *  upToIndex    ?: number,
 *  source       ?: any[],
 *  mapper       ?: function,
 *  onError      ?: (err : Error) => void
 * }} MapUntilOptions
 *
 * @param {MapUntilOptions}
 * @returns {any[]}
 */
const mapUntil = ({
  upToMatching,
  upToIndex,
  source = [],
  mapper = (v) => v,
  onError = (err) => console.warn(err),
} = {}) => {
  try {
    const mapped = [];

    for (let i = 0; i < source.length; i++) {
      const element = source[i];

      if (
        i >= upToIndex ||
        (typeof upToMatching === "function" && upToMatching(element))
      ) {
        break;
      }

      mapped[i] = mapper(element);
    }

    return mapped;
  } catch (error) {
    onError(error);
    return source;
  }
};

/**
 * @summary parse an object from path and value
 * @param {{
 *  path   : string,
 *  value ?: any
 * }} [options]
 * @return {object}
 */
const fromPath = (options = {}) => {
  const { path = "", value } = options;

  const output = {};

  path
    .split(/\/|\\/)
    .reduce(
      (a, c, i, paths) =>
        (a[c] = i < paths.length - 1 || !("value" in options) ? {} : value),
      output
    );

  return output;
};

/**
 * @summary finds longest array in a grid
 * @param {any[][]} grid
 * @returns {number}
 */
const longest = (grid) => Math.max(...grid.map(({ length }) => length));

/**
 * @summary fills in empty array places and modifies members
 * @param {{
 *  arr?        : any[],
 *  modifier?   : (any) => any,
 *  fill?       : any,
 *  maxColumns? : number
 * }}
 * @returns {any[]}
 */
const fillEmptyPlaces = ({
  arr = [],
  modifier = (v) => v,
  fill = "",
  maxColumns,
} = {}) => {
  for (let i = 0; i < (maxColumns || arr.length); i++) {
    arr[i] = arr[i] !== undefined ? modifier(arr[i], i) : modifier(fill, i);
  }
  return arr;
};

/**
 * @summary expands filter to specified dimensions
 * @param {{
 *  filter        : GoogleAppsScript.Spreadsheet.Filter,
 *  onError?      : (Error) => void,
 *  toLastColumn? : boolean,
 *  toLastRow?    : boolean
 * }}
 * @returns {boolean}
 */
const expandFilter = ({
  toLastRow = true,
  toLastColumn = true,
  filter,
  onError = (err) => console.warn(err),
} = {}) => {
  try {
    const sourceRng = filter.getRange();

    const sh = sourceRng.getSheet();

    const newCols = toLastColumn ? sh.getLastColumn() : sh.getMaxColumns();
    const newRows = toLastRow ? sh.getLastRow() : sh.getMaxRows();

    const newRng = sourceRng.offset(0, 0, newRows, newCols);

    const criteria = [];

    const numCols = sourceRng.getNumColumns();

    for (let cidx = 1; cidx <= numCols; cidx++) {
      const cr = filter.getColumnFilterCriteria(cidx);
      criteria.push(cr && cr.copy());
    }

    filter.remove();

    const newFilter = newRng.createFilter();

    criteria.forEach(
      (cr, i) => cr && newFilter.setColumnFilterCriteria(i + 1, cr)
    );

    return true;
  } catch (error) {
    onError(error);
    return false;
  }
};

/**
 * @typedef {{
 *  source ?: any[][],
 *  accumulator ?: any,
 *  callback ?: (acc : any, cur : any) => any,
 *  overColumn ?: number
 * }} FoldGridOptions
 *
 * @param {FoldGridOptions}
 */
const foldGrid = ({
  source = [[]],
  accumulator = 0,
  callback = (acc) => (acc += 1),
  overColumn = 0,
  matching = () => true,
  onError = (err) => console.warn(err),
} = {}) => {
  try {
    const column = source.map((row) => row[overColumn]);

    return column.reduce((acc, cur, ri) => {
      if (matching(cur, column)) {
        return callback(acc, cur, source[ri]);
      }
      return acc;
    }, accumulator);
  } catch (error) {
    onError(error);
  }
};

/**
 * @summary wraps UrlFetchApp request options into identity auth
 * @param {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} params
 */
const wrapIdentityAuth = (params) => ({
  headers: { Authorization: `Bearer ${ScriptApp.getIdentityToken()}` },
  ...params,
});

type MaybeDate = Date | number | string;

/**
 * @summary formats Date to time string (script TZ)
 */
const toScriptTimeString = (date: MaybeDate = Date.now()) =>
  Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), "HH:mm:ss");

/**
 * @summary formats Date to date string (script TZ)
 */
const toScriptDateString = (date: MaybeDate = Date.now(), utc = true) =>
  Utilities.formatDate(
    new Date(date),
    Session.getScriptTimeZone(),
    utc ? "yyyy-MM-dd" : "M/d/YY"
  );

/**
 * @summary adj GMT to EDT (legacy, spreadsheet is in GMT)
 */
const gmtToEdt = (date: Date = new Date()) => {
  const { timezone } = CONFIG;

  const [, , offset] = timezone.match(/^(\w+)((?:\+|\-)\d+)/i);

  const daylightAdj = date.getMonth() < 10 ? +offset : +offset - 1;

  const adj = new Date(date);
  adj.setHours(adj.getHours() + daylightAdj);
  return adj;
};

/**
 * @summary removes "duplicate" status from status col (quick autofix for a temp problem)
 */
const removeDuplicateStatus = () => {
  const {
    sheets: { users },
  } = CONFIG;

  const ss = getOrInitSheet({ name: users });

  const rng = ss.getRange("E2:E");

  const rows = rng.getValues();

  const clean = rows.map(([v]) => [/^duplicate$/i.test(v) ? "" : v]);

  rng.setValues(clean);
};

const sum = (arr): number =>
  arr.reduce((a: number, c: number | string) => a + Number(c), 0);

const isEmpty = (row) => row.every((elem) => elem === "" || elem === void 0);

/**
 * @summary sorter for records with Date values
 * @param {number} to
 * @returns {number}
 */
const recordOnDateSorter = (to = 1) => ([a], [b]) =>
  new Date(to ? b : a) - new Date(to ? a : b);

/**
 * @summary sums grid on a column
 */
const sumOn = (grid: any[][], col = 0) => grid.reduce((a, c) => a + c[col], 0);

/**
 * @typedef {{
 *  sheet : GoogleAppsScript.Spreadsheet.Sheet,
 * }} ColGetterOptions
 *
 * @param {ColGetterOptions}
 */
const getColumn = ({
  sheet,
  startRow = 1,
  column = 1,
}): GoogleAppsScript.Spreadsheet.Range =>
  sheet.getRange(startRow, column, sheet.getLastRow() - startRow + 1, 1);

const buildSSurl = (id: string) =>
  `https://docs.google.com/spreadsheets/d/${id}`;

const int = (num: number) => num.toFixed(0);

const last = (arr: any[]) => arr[arr.length - 1];

const loadContent = (path: string) =>
  HtmlService.createHtmlOutputFromFile(path).getContent();

/**
 * @summary parses string template
 * @param {{
 *  content : string,
 *  returnMissing ?: boolean,
 *  vars ?: Object.<string, string>
 * }}
 */
const template = ({
  content,
  vars = {},
  onError = (err) => console.warn(err),
  returnMissing = false,
}) => {
  try {
    return content.replace(
      /{{(\w+)}}/gi,
      (__, name) =>
        vars[name] || (vars[name] === 0 ? "0" : returnMissing ? __ : "")
    );
  } catch (error) {
    onError(error);
    return content;
  }
};

const columnSort = (arr: any[][], comparator: (a, b) => number, col = 0) =>
  arr.sort((a, b) => comparator(a[col], b[col]));

const getSheet = (name: string) =>
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);

declare interface ColumnMixinOpts {
  col?: number;
  force?: boolean;
  grid: any[][];
  values: any[][];
}

const partify = <T>({
  source,
  parts = 2,
}: {
  source: T[];
  parts?: number;
}): T[][] => {
  const size = Math.ceil(source.length / parts) || 1;

  const output = [];

  let chunk = 0;
  while (chunk < parts) {
    const offset = chunk * size;

    const chnk = source.slice(offset, size + offset);

    if (!chnk.length) {
      return output;
    }

    output.push(chnk);
    chunk++;
  }

  return output;
};

const mixinColumn = ({
  col = 0,
  force = false,
  grid,
  values,
}: ColumnMixinOpts) =>
  grid.map((row, ri) => {
    const mixin = values[ri][0];
    row[col] = force ? mixin : row[col] || mixin;
    return row;
  });

const nth = <T>(arr: T[], n = 0) => (n >= 0 ? arr[n] : arr.slice(n - 1)[0]);

const byteSize = (data: string) => Utilities.newBlob(data).getBytes().length;

const sleep = (sec = 1) => Utilities.sleep(sec * 1e3);

const getRngToLast = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  startCol: number
) =>
  sheet.getRange(
    startRow,
    startCol,
    sheet.getLastRow() - startRow + 1,
    sheet.getLastColumn() - startCol + 1
  );

const getValsToLast = (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  startCol: number
) =>
  sheet.getSheetValues(
    startRow,
    startCol,
    sheet.getLastRow() - startRow + 1,
    sheet.getLastColumn() - startCol + 1
  );

/**
 * @summary sums columns of two rows
 */
const sumRows = (a: number[], b: number[]) =>
  a.map((cell, ci) => (b[ci] || 0) + Number(cell));

/**
 * @summary adds a row to count()
 */
const addRowCount = (acc: number[], b: number[]) =>
  acc.map((cell, ci) => cell + (b[ci] ? 1 : 0));

/**
 * @summary gets A1 notation of the Range
 */
const fullA1 = (rng: GoogleAppsScript.Spreadsheet.Range) =>
  `${rng.getSheet().getSheetName()}!${rng.getA1Notation()}`;

/**
 * @summary sorter for Date-able entries
 */
const dateEntrySorter = ([a]: [MaybeDate], [b]: [MaybeDate]): number =>
  new Date(b).valueOf() - new Date(a).valueOf();

const foldGrids = (operation: (a: any, b: any) => any, ...grids: any[][]) =>
  grids.reduce((acc, cur) =>
    acc.map((row, ri) => row.map((cell, ci) => operation(cell, cur[ri][ci])))
  );

const getRow = (sh: GoogleAppsScript.Spreadsheet.Sheet, row = 1) =>
  sh.getRange(row, 1, 1, sh.getMaxColumns());

const getRowVals = (sh: GoogleAppsScript.Spreadsheet.Sheet, row = 1) =>
  getRow(sh, row).getValues()[0];

/**
 * @summary gets sheet grid shrunk by M rows top and N rows bottom
 */
const getGridVals = (
  sh: GoogleAppsScript.Spreadsheet.Sheet,
  startRow = 1,
  endRow = sh.getLastRow()
) => {
  return sh
    .getDataRange()
    .offset(startRow - 1, 0, endRow - startRow + 1, sh.getLastColumn())
    .getValues();
};

const boolTryDecorator = <T>(
  logger: { warn: (err: Error) => void },
  callback: (...args: any[]) => T,
  ...args: any
) => {
  try {
    return callback(...args);
  } catch (error) {
    logger.warn(error);
    return false;
  }
};

export {
  boolTryDecorator
}