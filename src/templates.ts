/**
 * Transforms json to key : value; string
 * @param {Object} [json]
 * @returns {String}
 */
const jsonToFormatString = (json = {}) => {
  return Object.entries(json)
    .map((entry) => {
      const [key, value] = entry;
      return `${key}: ${value}`;
    })
    .join("; ");
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

  const attributes = Object.entries(config)
    .filter(([k, v]) => Boolean(v) && !["text", "style"].includes(k))
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");

  return `<td ${attributes} style="${preparedStyle}">${text}</td>`;
};

declare interface EmailTrOpts {
  cells: string[];
  style?: Record<string, string>;
}

/**
 * @summary builds an HTML table row
 */
const tr = ({ cells, style }: EmailTrOpts): string => {
  const styled = jsonToFormatString(style);

  const open = styled ? `<tr style="${styled}">` : `<tr>`;

  return `${open}${cells.join("")}</tr>`;
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

const createTemplateLink = ({ url, title }: { url: string; title?: string }) =>
  `<a href="${url}" target="_blank">${title || url}</a>`;

const dirTxt = (stat: number) =>
  stat > 0 ? "Accelerating" : stat < 0 ? "Decelerating" : "Flat";

const to2dec = (num: number) => num.toFixed(2);

const insNbsp = (str: string) => str.split(/\s+/).join("&nbsp;");

const createWeeklyRow = (cellInfo: WeeklyRow) => {
  const accStatus = last(cellInfo);

  const commonCellStyle = {
    "border-width": "1px",
    "border-style": "solid",
    "border-color": "rgb(0,0,0)",
    "vertical-align": "bottom",
  };

  const txtFormatters: Map<number, (txt: string | number) => string> = new Map([
    [1, insNbsp],
    [2, to2dec],
    [3, () => dirTxt(accStatus)],
  ]);

  const defFormatter = (t: string) => t;

  const cells = cellInfo.map((text, idx) =>
    td({
      style: {
        ...commonCellStyle,
        "text-align": idx === 1 ? "left" : "center",
      },
      text: (txtFormatters.get(idx) || defFormatter)(text),
    })
  );

  const bckg =
    accStatus > 0
      ? "rgb(244, 204, 204)"
      : accStatus < 0
      ? "rgb(201, 218, 248)"
      : "rgb(255, 255, 255)";

  return tr({
    cells,
    style: {
      "font-size": "10px",
      "height": "20px",
      "background-color": bckg,
      "color": "rgb(0,0,0)",
    },
  });
};

/**
 * @summary builds a template notice row
 */
const createTemplateRow = (text: string) => {
  try {
    const innerCells = [
      {
        width: 590,
        align: "left",
        class: "padding_side",
        style: {
          "font-family": "Verdana, Geneva, sans-serif",
          "font-size": "14px",
          "color": "#000000",
          "padding-top": "20px",
          "line-height": "20px",
        },
        valign: "top",
        text,
      },
    ].map(td);

    const innerRows = [
      {
        cells: innerCells,
      },
    ].map(tr);

    const innerTable = table({
      width: 590,
      border: 0,
      cellspacing: 0,
      cellpadding: 0,
      rows: innerRows,
    });

    const outerCell = td({ text: innerTable });
    const outerRow = tr({ cells: [outerCell] });

    return outerRow;
  } catch (error) {
    console.log(error);
    return "";
  }
};
