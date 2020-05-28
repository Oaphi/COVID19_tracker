/**
 * @summary creates a colorized anchor
 * @param {string} color 
 */
const colorLink = (color) =>

    /**
     * @param {string} text
     * @returns {string}
     */
    (text) => `<a style="color:${color}">${text}</a>`;

//partially apply color linker
const redLink = colorLink("#EA452F");
const blueLink = colorLink("#1261A0");
const blackLink = colorLink("black");

/**
 * @summary validates that 0.00%, 0%, etc are treated the same way
 * @param {(number | string)} num 
 * @returns {boolean}
 */
const isZero = (num) => {
    const inted = parseInt(num);
    const floated = parseFloat(num);

    return inted === 0 && (inted === floated);
}

/**
 *
 * @param {string} v
 * @returns {string}
 */
function GreenRed2(v) {

    var result;
    if (v === "+N/A%") {
        result = ['#1261A0', '+%'];
        v = blueLink("+%");
    }
    else if (isZero(v)) {
        result = ['black', '+0%'];
        v = blackLink("+0%");
    }
    else {
        if (parseFloat(v).toFixed(2) > 0) {
            result = ['#1261A0', '+' + v];
            v = blueLink(`+${v}`);
        }
        else {
            result = ['#EA452F', '' + v];
            v = redLink(v);
        }
    }
    return result;
}

/**
 * 
 * @param {string} v 
 * @returns {string}
 */
function RedGreen2(v) {
    var result;

    if (v === "+N/A%") {
        result = ['#EA452F', '+%'];
        v = redLink("+%");
    }
    else if (isZero(v)) {
        result = ['black', '+0%'];
        v = blackLink("+0%");
    }
    else {
        if (parseFloat(v).toFixed(2) > 0) {
            result = ['#EA452F', '+' + v];
            v = redLink(`+${v}`);
        }
        else {
            result = ['black', '+0%']; //TODO: inquire about this - is overridden
            result = ['#1261A0', '' + v];
            v = blueLink(v);
        }
    }

    return result;
}