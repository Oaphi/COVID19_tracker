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
 * @returns {?object}
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
        a = a * 100;
        if ((a).toFixed(2) < 1 && (a).toFixed(2) > -1 && (a).toFixed(2) !== 0) {
            a = parseFloat(a).toFixed(2) + "%";
        }
        else {
            a = (a).toFixed(0) + "%";
        }
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
 * @param {string} stateFullName 
 * @param {number} place
 * @param {number} newTotal
 * @param {("tests"|"infections"|"deaths")} type
 * @param {number} total
 * @returns {string}
 */
const buildStatement = (stateFullName, place, newTotal, type, total) => {

    const todayWas = `${stateFullName} was ${ordinal_suffix_of(place)} today: `;

    const totalWas = `${setDecimalPlaces(newTotal)} new ${type} per 1MM residents | ${addCommas(total)}`;

    return `${todayWas} ${totalWas} total`;
};