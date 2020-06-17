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
        v = "%2B%25";
    }
    else if (v === "0%") {
        v = "%2B0%25";
    }
    else if (parseFloat(v).toFixed(2) > 0) {
        v = "%2B" + v;
    }
    return v;
}

/**
 * @summary fetches endpoint and parses content
 * @param {string} url 
 * @returns {?object[]}
 */
const fetchAndParseContent = (url) => {
    const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true
    });

    const code = response.getResponseCode();

    if (code >= 200 && code < 300) {

        const jsonData = response.getContentText();

        try {
            return JSON.parse(jsonData);
        }
        catch (dataError) {
            Logger.log(dataError);
            return null;
        }

    }

    return null;
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

        let float = parseFloat(a);

        float = float * 100;

        a = (float < 1 && float > -1 && float) ?
            `${float.toFixed(2)}%` :
            `${float.toFixed(0)}%`;
    }

    return a;
}

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
const getResetDateValue = (date) => new Date(date).setHours(0,0,0,0);

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