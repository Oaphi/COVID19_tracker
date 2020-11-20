/**
 * @summary utility callback for skipping empty rows
 * @param {any[]} row
 * @returns {boolean}
 */
const isInvalidRecord = (row) =>
  row.some((cell) => cell === "#N/A") || row.every((cell) => cell === "");

/**
 * @summary gets send out candidates
 * @param {getCandidatesConfig}
 * @returns {ParsedCandidates}
 */
function getCandidates({
  includeStateNames = false,
  excludeInvalid = true,
  records,
  startIndex = 0,
}) {
  let invalid = 0;

  const stateNames = includeStateNames ? getStateCodeToNameMap() : {};

  const candidates = records
    .map((record: UserRecord, index: number) => {
      if (isInvalidRecord(record) && excludeInvalid) {
        invalid++;
        return;
      }

      const [id, subscribed, email, state, status] = record;

      const [name] = email.split("@");

      const [first_name, last_name = ""] = name.split(".");

      return {
        index: startIndex + index,
        id,
        first_name,
        last_name,
        email,
        state,
        status,
        subscribed,
        full_state: stateNames[state] || "",
        get name() {
          return `${this.first_name} ${this.last_name}`;
        },
        get unsent() {
          const { status } = this;
          return !!!status;
        },
      };
    })
    .filter(Boolean);

  return {
    candidates,
    invalid,
    get total() {
      const {
        candidates: { length },
        invalid,
      } = this;
      return length + invalid;
    },
  };
}

/**
 * @summary gets list of user record rows
 * @param {UserGetterConfig}
 * @returns {ParsedCandidates}
 */
const getUserRecords = ({
  start = 1,
  max,
  excludeInvalid = true,
  includeStateNames = true,
} = {}) => {
  const {
    sheets: { users },
  } = CONFIG;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(users);
  const dataRng = userSheet.getDataRange();

  const maxOrAll = max || dataRng.getLastRow();

  const userData = shrinkGrid({
    source: dataRng.getValues(),
    leave: { left: 5, top: maxOrAll + start },
    top: start,
  });

  return getCandidates({
    includeStateNames,
    excludeInvalid,
    records: userData,
  });
};

/**
 * @summary gets all users
 * @param {ParsedCandidates} [input]
 */
const getUsers = (
  input: ParsedCandidates = getUserRecords()
): {
  all: Candidate[];
  unique: Candidate[];
  invalid: number;
  duplicate: Candidate[];
} => {
  const { candidates, invalid } = input;

  const accumulator: Candidate[] = [];

  const alreadyFound = {};

  const unique = shallowFilter({
    accumulator,
    source: candidates,
    filter: ({ state, email }) => {
      const existingStates = alreadyFound[email] || [];

      const isUnique = !existingStates.includes(state);
      isUnique && existingStates.push(state);

      alreadyFound[email] = existingStates;

      return isUnique;
    },
  });

  const duplicate = accumulator.filter(({ state }) => state);

  return {
    all: candidates,
    duplicate,
    unique,
    invalid,
  };
};

/**
 * @summary utility for getting duplicate users
 * @param {ParsedCandidates} [input]
 * @returns {Candidate[]}
 */
const getDuplicateUsers = (input = getUserRecords()) => {
  const { duplicate } = getUsers(input);
  return duplicate;
};

const getSubscribersByDate = () => {
  const { all } = getUsers();

  const dict = {};

  all.forEach(({ subscribed }) => {
    if (!subscribed) {
      return;
    }

    const date = toISOdate(subscribed);

    dict[date] = (dict[date] || 0) + 1;
  });

  return dict;
};

/**
 * @summary gets total users by date
 * @returns {{ [x : string] : number }}
 */
const getTotalUsersByDate = () => {
  const { all } = getUsers();

  const totals = all.reduce((acc, cur) => {
    const { subscribed } = cur;

    if (!subscribed) {
      return acc;
    }

    const date = toISOdate(subscribed);
    const dateTotal = acc[date] || 0;

    acc[date] = dateTotal + 1;
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(totals)
      .reduce(
        (acc, cur, ri) => {
          acc.push([toISOdate(cur[0]), (acc[ri][1] || 0) + cur[1]]);
          return acc;
        },
        [[]]
      )
      .slice(1)
  );
};

/**
 * @summary utility for getting unique subscribers
 * @param {ParsedCandidates} input
 */
const getUniqueSubscribers = (input = getUserRecords()): string[] => {
  const { unique } = getUsers(input);

  const subs: Set<string> = new Set();

  unique.reduce((acc, { email }) => {
    subs.add(email.toLowerCase());
    return acc;
  }, subs);

  return [...subs.values()];
};

/**
 * @summary
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} startRow
 * @returns {Candidate}
 */
function getCandidateFromRow(sheet, startRow) {
  const records = sheet.getRange(startRow, 1, 1, 7).getValues();

  return getCandidates({
    sheet,
    records,
    startIndex: startRow,
  }).candidates[0];
}

/**
 * @summary sets duplicate user labels
 * @param {{
 *  start : (number|1),
 *  max : (number|undefined)
 * }}
 */
const setDuplicateUserLabels = ({ start = 1, max } = {}) => {
  const {
    sheets: { users },
    users: {
      statuses: { duplicate },
    },
  } = CONFIG;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(users);

  const userRecords = getUserRecords({ start, max, excludeInvalid: false });
  const { all } = getUsers(userRecords);

  const wentThrough = {};

  const values = all.map(({ email, state, status }) => {
    const existingStates = wentThrough[email] || [];
    const isUnique = !existingStates.includes(state);
    isUnique && existingStates.push(state);
    wentThrough[email] = existingStates;

    const newStatus = isUnique ? status : duplicate;

    return [newStatus];
  });

  const rngToUpdate = userSheet.getRange(
    start + 1,
    5,
    values.length,
    values[0].length
  );

  rngToUpdate.setValues(values);
};

/**
 * @summary adds more candidates to send if there are invalid users
 *
 * @param {{
 *  logger  : LogAccumulator,
 *  invalid : (number|0),
 *  list    : object[],
 *  retry   : (number|0),
 *  sheet   : GoogleAppsScript.Spreadsheet.Sheet,
 *  start   : (number|1),
 *  max     : number
 * }}
 *
 * @returns {number}
 */
const addCandidatesWhileInvalid = (
  { logger, invalid = 0, list = [], retry = 0, sheet, start = 1, max } = {
    sheet: SpreadsheetApp.getActiveSheet(),
  }
) => {
  while (invalid && retry) {
    try {
      const nextStartRow = start + (max - invalid);

      if (nextStartRow > sheet.getLastRow()) {
        logger.add(`reached last record, still invalid ${invalid}`);
        invalid = 0;
        break;
      }

      const {
        candidates: moreCandidates,
        invalid: moreInvalid,
        total,
      } = getUserRecords({
        start: nextStartRow,
        max,
      });

      invalid = moreInvalid;
      start += invalid;

      if (total === invalid) {
        retry--;
      }

      const onlyNew = moreCandidates.filter(
        (cnd) => !list.some((c) => c.index === cnd.index)
      );

      list.push(...onlyNew);
    } catch (error) {
      logger.add(`failed to fill invalid: ${error}`, "error");
      invalid = 0;
    }
  }

  return invalid;
};

/**
 * @summary gets unsent users only
 * @param {ParsedCandidates} [records]
 * @returns {Candidate[]}
 */
const getUnsent = (records = getUserRecords()) => {
  const { all } = getUsers(records);
  return all.filter(({ unsent }) => unsent);
};

/**
 * @summary counts by-state totals
 * @param {string[][]} codes state codes per user
 */
const getStateUserTotals = (codes: string[][]): [string, number][] => {
  try {
    const hash = {};

    codes.forEach(([code]) => code && (hash[code] = (hash[code] || 0) + 1));

    return Object.entries(hash);
  } catch (error) {
    console.warn(error);

    return [["", 0]];
  }
};
