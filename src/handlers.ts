declare interface EmailConfig {
  to: string;
  subject: string;
  message: string;
  attachments?: any[];
}

/**
 * @summary fills template and sends out emails
 */
function handleApproval(
  candidate: Candidate,
  logger = new LogAccumulator("email parser"),
  approvalConfig: ApprovalConfig,
  sandboxed: boolean,
  noDataStates: string[]
) {
  const {
    accumulated,
    emails,
    covidDataByState,
    currentDate,
    indices,
    notices,
    subjectPrefix,
    template: tmpl,
    totalUS,
    weekday,
    columnLookup,
  } = approvalConfig;

  const { state: stateCode } = candidate;

  const stateData = covidDataByState[stateCode];

  if (!stateData) {
    const { email, name } = candidate;
    const ui = SpreadsheetApp.getUi();
    ui.alert(`No state found:\n\nUser: ${name}, ${email}\nState: ${stateCode}`);
    return false;
  }

  const {
    Covid19: { ColumnIndices: CCI },
  } = indices;

  tmpl.countryTES0 = prop(accumulated, "countryTES0", () =>
    addCommas(totalUS[23])
  );
  tmpl.countryINF0 = prop(accumulated, "countryINF0", () =>
    addCommas(totalUS[3])
  );
  tmpl.countryINF1cmp = prop(accumulated, "countryINF1cmp", () =>
    addCommas(totalUS[5])
  );
  tmpl.countryINF2cmp = prop(accumulated, "countryINF2cmp", () =>
    addCommas(totalUS[7])
  );
  tmpl.countryDEA0 = prop(accumulated, "countryDEA0", () =>
    addCommas(totalUS[13])
  );
  tmpl.countryDEA1cmp = prop(accumulated, "countryDEA1cmp", () =>
    addCommas(totalUS[15])
  );
  tmpl.countryDEA2cmp = prop(accumulated, "countryDEA2cmp", () =>
    addCommas(totalUS[17])
  );
  tmpl.countryTES1cmp = prop(accumulated, "countryTES1cmp", () =>
    addCommas(totalUS[25])
  );
  tmpl.countryTES2cmp = prop(accumulated, "countryTES2cmp", () =>
    addCommas(totalUS[27])
  );

  const countryTestsPercent1 = prop(accumulated, "countryTestsPercent1", () =>
    topercent(totalUS[24])
  );
  tmpl.countryTES1val = GreenRed2(countryTestsPercent1)[1];
  tmpl.countryTES1clr = "color:" + GreenRed2(countryTestsPercent1)[0];

  const countryTestsPercent2 = prop(accumulated, "countryTestsPercent2", () =>
    topercent(totalUS[26])
  );
  tmpl.countryTES2val = GreenRed2(countryTestsPercent2)[1];
  tmpl.countryTES2clr = "color:" + GreenRed2(countryTestsPercent2)[0];

  const countryInfectionsPercent1 = prop(
    accumulated,
    "countryInfectionsPercent1",
    () => topercent(totalUS[4])
  );
  tmpl.countryINF1val = RedGreen2(countryInfectionsPercent1)[1];
  tmpl.countryINF1clr = "color:" + RedGreen2(countryInfectionsPercent1)[0];

  const countryInfectionsPercent2 = prop(
    accumulated,
    "countryInfectionsPercent2",
    () => topercent(totalUS[6])
  );
  tmpl.countryINF2val = GreenRed2(countryInfectionsPercent2)[1];
  tmpl.countryINF2clr = "color:" + RedGreen2(countryInfectionsPercent2)[0];

  const countryDeathspercent1 = prop(accumulated, "countryDeathspercent1", () =>
    topercent(totalUS[14])
  );
  tmpl.countryDEA1val = RedGreen2(countryDeathspercent1)[1];
  tmpl.countryDEA1clr = "color:" + RedGreen2(countryDeathspercent1)[0];

  const countryDeathsPercent2 = prop(accumulated, "countryDeathsPercent2", () =>
    RedGreen2(topercent(totalUS[16]))
  );
  tmpl.countryDEA2val = countryDeathsPercent2[1];
  tmpl.countryDEA2clr = "color:" + countryDeathsPercent2[0];

  const countryRatioInfectedToTests = prop(
    accumulated,
    "countryRatioInfectedToTests",
    () => topercent(totalUS[43])
  );
  tmpl.countryRatioInfectedToTests = countryRatioInfectedToTests;

  var fullStateName = stateData[2];

  const formattedDate = prop(
    accumulated,
    "formattedDate",
    () => ` ${toScriptDateString(currentDate, false)}`
  );

  tmpl.fulldate = weekday;

  const cachedStateData = accumulated[stateCode];

  const isND = noDataStates.includes(stateCode);

  if (!cachedStateData) {
    const noDataDefault = 0;

    const { inline, separate, applySeparateTo } = notices;

    tmpl.inlineNotice = inline;

    tmpl.separateNotice =
      separate &&
      (!applySeparateTo.length || applySeparateTo.includes(stateCode))
        ? createTemplateRow(separate)
        : "";

    tmpl.twitterLink = LoadTwitter(stateData, formattedDate);

    tmpl.FullStatee = fullStateName;
    tmpl.Statee = stateCode;

    const stateTestPercent1 = topercent(stateData[24]);
    const stateTestPercent2 = topercent(stateData[26]);
    const stateInfectionsPercent1 = topercent(stateData[4]);
    const stateInfectionsPercent2 = topercent(stateData[6]);
    const stateDeathspercent1 = topercent(stateData[14]);
    const stateDeathspercent2 = topercent(stateData[16]);

    const [newTestColor, newTestVal] = GreenRed2(
      isND ? noDataDefault : stateTestPercent1
    );
    const [weeklyTestColor, weeklyTestVal] = GreenRed2(
      isND ? noDataDefault : stateTestPercent2
    );

    const [newInfectsColor, newInfectsVal] = RedGreen2(
      isND ? noDataDefault : stateInfectionsPercent1
    );
    const [weeklyInfectsColor, weeklyInfectsVal] = RedGreen2(
      isND ? noDataDefault : stateInfectionsPercent2
    );

    const [newDeathColor, newDeathVal] = RedGreen2(
      isND ? noDataDefault : stateDeathspercent1
    );
    const [weeklyDeathColor, weeklyDeathVal] = RedGreen2(
      isND ? noDataDefault : stateDeathspercent2
    );

    tmpl.stateDEA1val = newDeathVal;
    tmpl.stateDEA2val = weeklyDeathVal;
    tmpl.stateTES1val = newTestVal;
    tmpl.stateTES2val = weeklyTestVal;
    tmpl.stateINF1val = newInfectsVal;
    tmpl.stateINF2val = weeklyInfectsVal;

    tmpl.stateDEA1clr = `color:${newDeathColor}`;
    tmpl.stateDEA2clr = `color:${weeklyDeathColor}`;
    tmpl.stateTES1clr = `color:${newTestColor}`;
    tmpl.stateTES2clr = `color:${weeklyTestColor}`;
    tmpl.stateINF1clr = `color:${newInfectsColor}`;
    tmpl.stateINF2clr = `color:${weeklyInfectsColor}`;

    tmpl.TESstatement = buildStatement(
      stateCode,
      stateData[37],
      stateData[36],
      "test",
      stateData[32]
    );

    tmpl.INFstatement = buildStatement(
      stateCode,
      stateData[39],
      stateData[38],
      "positive test",
      stateData[28]
    );

    tmpl.DEAstatement = buildStatement(
      stateCode,
      stateData[41],
      stateData[40],
      "death",
      stateData[30]
    );

    tmpl.stateINF0 = addCommas(stateData[3]);

    tmpl.stateINF1cmp = addCommas(stateData[5]);

    tmpl.stateINF2 = addCommas(stateData[5]);
    tmpl.stateINF2cmp = addCommas(stateData[7]);

    tmpl.stateDEA0 = addCommas(stateData[13]);
    tmpl.stateDEA1cmp = addCommas(stateData[15]);

    tmpl.stateDEA2 = addCommas(stateData[15]);
    tmpl.stateDEA2cmp = addCommas(stateData[17]);

    tmpl.stateTES0 = addCommas(stateData[23]);

    tmpl.stateTES1cmp = addCommas(stateData[25]);

    tmpl.stateTES2 = addCommas(stateData[25]);
    tmpl.stateTES2cmp = addCommas(stateData[27]);

    tmpl.INF2statement = buildInfectionsByTestsRatio({
      state: stateCode,
      rankDaily: stateData[CCI.InfectionsToTests.dailyRank],
      ratioDaily: toIntOrFloatPercent(stateData[CCI.InfectionsToTests.daily]),
      rankWeekly: stateData[CCI.InfectionsToTests.weeklyRank],
      ratioWeekly: toIntOrFloatPercent(stateData[CCI.InfectionsToTests.weekly]),
    });

    const content = tmpl.evaluate().getContent();

    const {
      us: { Hospitalizedcurrently: hospUSidx },
      state: { Hospitalizedcurrently: hospStateIdx },
    } = columnLookup;

    const { raw } = approvalConfig;

    //build US totals row
    const us_totals_row = promptTotalsRow({
      tests: totalUS[32],
      infections: totalUS[28],
      deaths: totalUS[30],
      hospitalized: raw["us"][hospUSidx],
      hospitalizedState: raw[stateCode][hospStateIdx],
      stateCode: stateCode,
    });

    accumulated[stateCode] = template({
      content,
      vars: {
        email: candidate.email,
        nodata: isND ? getStateNoDataPrompt(fullStateName) : "",
        us_totals_row,
      },
    });

    logger.log(
      `${stateCode} email size (appx): ${
        byteSize(accumulated[stateCode]) / 1024
      } Kb`
    );
  }

  const analyticsTag = sandboxed
    ? ""
    : trackEmailOpen(candidate, {
        el: `${stateCode}/${toISOdate(currentDate)}`,
        ev: 1,
        dp: `/email/${stateCode}/${toISOdate(currentDate)}`,
      });

  const content = cachedStateData || accumulated[stateCode];

  const message = template({
    content,
    vars: {
      analytics: analyticsTag,
    },
  });

  const subject = promptCurrentSubject({
    prefix: subjectPrefix,
    state: stateCode,
    stateNamesMap: { [stateCode]: fullStateName },
    user: candidate,
  });

  emails.push({
    to: candidate.email,
    subject,
    message,
  });

  return true;
}

/**
 * @summary handles sendout errors
 * @param {Error} error
 * @param {Candidate} candidate
 * @returns {boolean}
 */
const handleError = (error, candidate) => {
  const ui = SpreadsheetApp.getUi();

  const { message } = error;

  const { email, state } = candidate;

  const shouldContinue = ui.alert(
    "Sendout error",
    `Failed to send the data for ${state} to ${email}\n\nReason: ${message}`,
    ui.ButtonSet.OK_CANCEL
  );

  return shouldContinue === ui.Button.CANCEL;
};
