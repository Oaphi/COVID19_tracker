/**
 * @summary adds commas 
 * @param {string} nStr 
 * @returns {string}
 */
function addCommas(nStr) {

    if (nStr !== "+N%2FA%") {
        nStr = (nStr).toFixed(0);
    }

    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';

    var rgx = /(\d+)(\d{3})/;

    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }

    return x1 + x2;
}

/**
 * @summary adds sign to input
 * @param {string} v 
 * @returns {string}
 */
function addSign(v) {
    if (v === "+N/A%") {
        v = "+%";
    }
    else if (v === "0%") {
        v = "+0%";
    }
    else if (parseFloat(v).toFixed(2) > 0) {
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
 * @summary fetches endpoint and parses content
 * @param {string} url 
 * @param {object} [headers]
 * @param {{ json }}
 * @returns {?object[]}
 */
const fetchAndParseContent = (url, headers = {}, { json } = {}) => {

    /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
    const params = {
        contentType : "application/json",
        muteHttpExceptions: true
    };

    Object.keys(headers).length && (params.headers = headers);
    json && (params.payload = JSON.stringify(json));

    const response = UrlFetchApp.fetch(url, params);

    const code = response.getResponseCode();

    if (isSuccess(response)) {

        const jsonData = response.getContentText();

        try {
            return JSON.parse(jsonData);
        }
        catch (dataError) {
            Logger.log(dataError);
            return null;
        }
    }

    console.log({code}, response.getContentText());

    return null;
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
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
}) => {
    const [targetSheet] = spreadsheet.getSheets()
        .filter((__, idx) => index === idx);

    return targetSheet || null;
};

/**
 * @typedef {{
 *  name : string,
 *  index : number,
 *  hidden : boolean
 * }} GetOrInitSheetConfig
 * 
 * @summary gets sheet by its name or index and creates if missing
 * @param {GetOrInitSheetConfig}
 * @returns {GoogleAppsScript.Spreadsheet.Sheet?}
 */
const getOrInitSheet = ({ name, index, hidden = false }) => {
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
    }
    else {
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

    if (a !== "+N/A%" && a !== "0%") {

        const percent = parseFloat(a) * 100;

        const rounded = parseInt(percent) ? Math.round(percent) : percent;
        return `${rounded.toFixed(parseInt(rounded) || !rounded ? 0 : 2)}%`;
    }

    return a;
}

/**
 * @summary same as topercent, but returns int for floats with .00
 * @param {string|number} [num] 
 * @param {boolean} [treatZeroAsNaN]
 * @returns {string}
 */
const toIntOrFloatPercent = (num = 0, treatZeroAsNaN = false) => {

    const int = parseInt(num);

    if (isNaN(int) || (treatZeroAsNaN && num === 0)) {
        return `${num}%`;
    }

    const float = parseFloat(parseFloat(num).toFixed(2));

    return `${int !== float ? float : int}%`;
};

/**
 * @summary splits array in consequitive subsequences
 * @param {any[]} [source] 
 * @returns {any[][]}
 */
const splitIntoConseq = (source = []) => {

    const sequences = [], tails = [];

    let highestElem = -Infinity;

    source.forEach(element => {

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
 * @summary gets current week day
 * @param {Date} date
 * @param {string} [locale] 
 * @returns {string}
 */
const getDayOfWeek = (date, locale = "en-US") => {
    const intl = new Intl.DateTimeFormat(locale, {
        weekday: "long"
    });

    return intl.format(date);
};

/**
 * @summary gets value from object or inits it via callback
 * @param {object} obj
 * @param {string} propName
 * @param {function(object) : any} [callback]
 * @returns {any}
 */
const getOrInitProp = (obj, propName, callback) => {

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
 * @param {string} stateName 
 * @param {number} [place]
 * @param {number} newTotal
 * @param {("tests"|"infections"|"deaths")} type
 * @param {number} total
 * @returns {string}
 */
const buildStatement = (stateName, place = 1, newTotal, type, total) => {

    const todayWas = `${stateName} was ${ordinal_suffix_of(place)} today: `;

    const totalWas = `${setDecimalPlaces(newTotal)} new ${type} per 1MM residents | ${addCommas(total)}`;

    return `${todayWas} ${totalWas} total`;
};

/**
 * @summary builds "<state> was <place> today" statement for infetction to test rate
 * @param {string} stateName 
 * @param {number} rank
 * @param {string} ratio
 * @returns {string}
 */
const buildRatioStatement = (stateName, rank, ratio, numDays = 7) => {

    const rankSuffixed = ordinal_suffix_of(rank);

    const todayWas = `${stateName} was ${rankSuffixed} today: `;

    return `${todayWas}${ratio} positive rate over the past ${pluralizeCountable(numDays, "day")} of testing`;
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
 * @returns {string}
 */
const pluralizeCountable = (amount, noun) => {

    const normalized = noun.toLowerCase();

    if (amount === 1) {
        return `1 ${normalized}`;
    }

    const irregulars = {
        "child": "children",
        "goose": "geese",
        "tooth": "teeth",
        "foot": "feet",
        "mous": "mice",
        "person": "people"
    };

    const irregularPlural = irregulars[normalized];

    if (irregularPlural) {
        return `${amount} ${irregularPlural}`;
    }

    if (manWomanCase = normalized.match(/(\w*)(man|woman)$/)) {
        return `${amount} ${manWomanCase[1]}${manWomanCase[2].replace("a", "e")}`;
    }

    const staySameExceptions = new Set(["sheep", "series", "species", "deer", "fish"]);
    if (staySameExceptions.has(normalized)) {
        return `${amount} ${normalized}`;
    }

    const wordBase = normalized.slice(0, -2);

    const irregularEndingWithA = new Set(["phenomenon", "datum", "criterion"]);
    if (irregularEndingWithA.has(normalized)) {
        return `${amount} ${wordBase}a`;
    }

    const twoLastLetters = normalized.slice(-2);
    const oneLastLetter = twoLastLetters.slice(-1);

    const irregularEndingWithForFe = new Set(["roofs", "belief", "chef", "chief"]);
    if (irregularEndingWithForFe.has(normalized)) {
        return `${amount} ${normalized}s`;
    }

    if (/(?:f|fe)$/.test(noun)) {
        return `${amount} ${normalized.replace(/(?:f|fe)$/, "ves")}`;
    }

    const twoLettersReplaceMap = {
        "is": "es",
        "us": "i"
    };

    const lastLettersReplace = twoLettersReplaceMap[twoLastLetters];
    if (lastLettersReplace && wordBase.length > 1) {
        return `${amount} ${wordBase}${lastLettersReplace}`;
    }

    const twoLettersAddMap = new Set(["ch", "ss", "sh"]);
    if (twoLettersAddMap.has(twoLastLetters)) {
        return `${amount} ${normalized}es`;
    }

    const oneLastLetterMap = new Set(["s", "x", "z"]);
    if (oneLastLetterMap.has(oneLastLetter)) {
        return `${amount} ${normalized}es`;
    }

    const consonants = new Set([
        "b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n",
        "p", "q", "r", "s", "t", "v", "x", "z", "w", "y"
    ]);

    const isLetterBeforeLastConsonant = consonants.has(normalized.slice(-2, -1));

    if (oneLastLetter === "o" && isLetterBeforeLastConsonant) {
        const lastOexceptions = new Set(["photo", "buro", "piano", "halo"]);

        return `${amount} ${normalized}${lastOexceptions.has(normalized) ? "s" : "es"}`;
    }

    if (oneLastLetter === "y" && isLetterBeforeLastConsonant) {
        return `${amount} ${normalized.slice(0, -1)}ies`;
    }

    return `${amount} ${normalized}s`;
};

/**
 * @summary recursive parser
 * @param {string[]} order
 * @param {[string, any][]} entries 
 * @param {boolean} encode
 * @param {string} seq
 * @returns {string}
 */
const deep = (order, entries, encode, seq) => entries
    .map(entry => {
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
    .filter(val => val !== undefined)
    .join("&");

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
    {
        encodeParams,
        paramOrder = []
    } = config = {
        encodeParams: false,
        paramOrder: []
    }
) {

    const ordered = [];

    Object
        .entries(json)
        .forEach((entry) => {
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
const sentenceCase = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

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
const datenumToValue = (date) => new Date(
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
    }
    catch (error) {
        console.log(`User info is not available from this context`);
        return "anonymous";
    }
};

/**
 * @summary formats date to ISO
 * @param {Date} date 
 * @returns {string}
 */
const toISOdate = (date) => (date instanceof Date ? date : new Date(date)).toISOString().slice(0, 10);

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
    source,
    horizontally = 0,
    vertically = 0,
    top = 0,
    right = 0,
    bottom = 0,
    left = 0
} = {}) => {

    if (!source || !source.length) {
        return [[]];
    }

    if (horizontally) {
        left = right = Math.floor(horizontally / 2);
    }

    if (vertically) {
        top = bottom = Math.floor(vertically / 2);
    }

    let temp = [];

    temp = source.slice(top);
    temp = bottom ? temp.slice(0, -bottom) : temp;

    return temp
        .map(row => right ? row.slice(0, -right) : row)
        .map(row => row.slice(left));
};