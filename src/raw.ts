type rawDataRecord = Record<string, (number | string)[]>;

/**
 * @summary gets stats by state or country
 */
const getRawData = (isCountry = false): number[][] => {
  const { rawCountryStatsShName, rawStateStatsShName } = CONFIG;
  const statSheetName = isCountry ? rawCountryStatsShName : rawStateStatsShName;
  return getSheet(statSheetName).getDataRange().getValues();
};

const indexRawUsData = (shName: string): rawDataRecord => {
  const sh = getSheet(shName);

  const [row] = getGridVals(sh, 2);

  return {
    us: row as rawDataRecord[keyof rawDataRecord],
  };
};

const indexRawStateData = (shName: string, chunk = 0): rawDataRecord => {
  const sh = getSheet(shName);

  const numStates = 56;

  const vls = getGridVals(sh, 2);

  const offset = chunk * numStates;

  const stateData = vls.slice(offset, offset + numStates);

  const entries = stateData.map((row) => [row[1], row]);

  return Object.fromEntries(entries);
};

export { getRawData, indexRawStateData, indexRawUsData, rawDataRecord };
