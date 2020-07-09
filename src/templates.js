/**
 * Transforms json to key : value; string
 * @param {Object} [json]
 * @returns {String}
 */
const jsonToFormatString = (json = {}) => {
    return Object.entries(json).map(entry => {
        const [key, value] = entry;
        return `${key}: ${value}`;
    }).join('; ');
};

/**
 * @typedef {object} tdElementConfig
 * @property {("left")} align
 * @property {string} class
 * @property {Object.<string, string|number>} style
 * @property {string} text
 * @property {("top")} valign
 * @property {number} width
 * 
 * @summary builds an HTML table cell
 * @param {tdElementConfig} config
 * @returns {string}
 */
const td = (config) => {

    const { style, text = "" } = config;

    const preparedStyle = jsonToFormatString(style);

    const attributes = Object
        .entries(config)
        .filter(([k, v]) => Boolean(v) && !["text", "style"].includes(k))
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");

    return `<td ${attributes} style="${preparedStyle}">${text}</td>`;
};

/**
 * @typedef {object} trElementConfig
 * @property {string[]} cells
 * 
 * @summary builds an HTML table row
 * @param  {trElementConfig} config
 * @returns {string}
 */
const tr = ({ cells }) => {
    return `<tr>
    ${cells.join("")}
    </tr>`;
};

/**
 * @typedef {object} tableElementConfig
 * @property {number} border
 * @property {number} cellpadding
 * @property {number} cellspacing
 * @property {string[]} rows
 * @property {number} width
 * 
 * @param {tableElementConfig} config 
 */
const table = ({ border, cellpadding, cellspacing, rows, width }) => {
    return `<table 
    width="${width}" 
    border="${border}" 
    cellspacing="${cellspacing}" 
    cellpadding="${cellpadding}">
    ${rows.join("")}
    </table>`;
};

/**
 * 
 * @param {string} text 
 * @returns {string}
 */
const createTemplateNoticeRow = (text) => {

    try {
        const innerCells = [{
            width: 590,
            align: "left",
            class: "padding_side",
            style: {
                "font-family": "Verdana, Geneva, sans-serif",
                "font-size": "14px",
                "color": "#000000",
                "padding-top": "20px",
                "line-height": "20px"
            },
            valign: "top",
            text
        }].map(td);

        const innerRows = [{
            cells: innerCells
        }].map(tr);

        const innerTable = table({
            width: 590,
            border: 0,
            cellspacing: 0,
            cellpadding: 0,
            rows: innerRows
        });

        const outerCell = td({ text: innerTable });
        const outerRow = tr({ cells: [outerCell] });

        return outerRow;
    }
    catch (error) {
        console.log(error);
        return "";
    }
};