declare interface EmailConfig {
  to: string;
  subject: string;
  message: string;
  attachments?: any[];
}

/**
 * @summary fills template and sends out emails
 * @returns {boolean}
 */
function handleApproval(
  candidate: Candidate,
  {
    accumulated,
    emails,
    covidDataByState,
    currentDate,
    indices,
    notices,
    subjectPrefix,
    template,
    totalUS,
    weekday,
  }: ApprovalConfig,
  sandboxed: boolean,
  noDataStates: string[]
) {
  const { state } = candidate;

  const stateData = covidDataByState[state];

  if (!stateData) {
    const { email, name } = candidate;
    const ui = SpreadsheetApp.getUi();
    ui.alert(`No state found:\n\nUser: ${name}, ${email}\nState: ${state}`);
    return false;
  }

  const {
    Covid19: { ColumnIndices: CCI },
  } = indices;

  template.countryTES0 = prop(accumulated, "countryTES0", () =>
    addCommas(totalUS[23])
  );
  template.countryINF0 = prop(accumulated, "countryINF0", () =>
    addCommas(totalUS[3])
  );
  template.countryINF1cmp = prop(accumulated, "countryINF1cmp", () =>
    addCommas(totalUS[5])
  );
  template.countryINF2cmp = prop(accumulated, "countryINF2cmp", () =>
    addCommas(totalUS[7])
  );
  template.countryDEA0 = prop(accumulated, "countryDEA0", () =>
    addCommas(totalUS[13])
  );
  template.countryDEA1cmp = prop(accumulated, "countryDEA1cmp", () =>
    addCommas(totalUS[15])
  );
  template.countryDEA2cmp = prop(accumulated, "countryDEA2cmp", () =>
    addCommas(totalUS[17])
  );
  template.countryTES1cmp = prop(accumulated, "countryTES1cmp", () =>
    addCommas(totalUS[25])
  );
  template.countryTES2cmp = prop(accumulated, "countryTES2cmp", () =>
    addCommas(totalUS[27])
  );
  template.countryTOTinf = prop(accumulated, "countryTOTinf", () =>
    addCommas(totalUS[28])
  );
  template.countryTOTdea = prop(accumulated, "countryTOTdea", () =>
    addCommas(totalUS[30])
  );
  template.countryTOTtes = prop(accumulated, "countryTOTtes", () =>
    addCommas(totalUS[32])
  );

  const countryTestsPercent1 = prop(accumulated, "countryTestsPercent1", () =>
    topercent(totalUS[24])
  );
  template.countryTES1val = GreenRed2(countryTestsPercent1)[1];
  template.countryTES1clr = "color:" + GreenRed2(countryTestsPercent1)[0];

  const countryTestsPercent2 = prop(accumulated, "countryTestsPercent2", () =>
    topercent(totalUS[26])
  );
  template.countryTES2val = GreenRed2(countryTestsPercent2)[1];
  template.countryTES2clr = "color:" + GreenRed2(countryTestsPercent2)[0];

  const countryInfectionsPercent1 = prop(
    accumulated,
    "countryInfectionsPercent1",
    () => topercent(totalUS[4])
  );
  template.countryINF1val = RedGreen2(countryInfectionsPercent1)[1];
  template.countryINF1clr = "color:" + RedGreen2(countryInfectionsPercent1)[0];

  const countryInfectionsPercent2 = prop(
    accumulated,
    "countryInfectionsPercent2",
    () => topercent(totalUS[6])
  );
  template.countryINF2val = GreenRed2(countryInfectionsPercent2)[1];
  template.countryINF2clr = "color:" + RedGreen2(countryInfectionsPercent2)[0];

  const countryDeathspercent1 = prop(accumulated, "countryDeathspercent1", () =>
    topercent(totalUS[14])
  );
  template.countryDEA1val = RedGreen2(countryDeathspercent1)[1];
  template.countryDEA1clr = "color:" + RedGreen2(countryDeathspercent1)[0];

  const countryDeathsPercent2 = prop(accumulated, "countryDeathsPercent2", () =>
    RedGreen2(topercent(totalUS[16]))
  );
  template.countryDEA2val = countryDeathsPercent2[1];
  template.countryDEA2clr = "color:" + countryDeathsPercent2[0];

  const countryRatioInfectedToTests = prop(
    accumulated,
    "countryRatioInfectedToTests",
    () => topercent(totalUS[43])
  );
  template.countryRatioInfectedToTests = countryRatioInfectedToTests;

  var fullStateName = stateData[2];

  const formattedDate = prop(
    accumulated,
    "formattedDate",
    () => ` ${toScriptDateString(currentDate, false)}`
  );

  template.fulldate = weekday;
  template.FullStatee = fullStateName;
  template.Statee = state;

  const cachedStateData = accumulated[state];

  const isND = noDataStates.includes(state);

  if (!cachedStateData) {
    const noDataDefault = 0;

    const { inline, separate, applySeparateTo } = notices;

    template.inlineNotice = inline;

    template.separateNotice =
      separate && (!applySeparateTo.length || applySeparateTo.includes(state))
        ? createTemplateRow(separate)
        : "";

    template.twitterLink = LoadTwitter(stateData, formattedDate);

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

    template.stateDEA1val = newDeathVal;
    template.stateDEA2val = weeklyDeathVal;
    template.stateTES1val = newTestVal;
    template.stateTES2val = weeklyTestVal;
    template.stateINF1val = newInfectsVal;
    template.stateINF2val = weeklyInfectsVal;

    template.stateDEA1clr = `color:${newDeathColor}`;
    template.stateDEA2clr = `color:${weeklyDeathColor}`;
    template.stateTES1clr = `color:${newTestColor}`;
    template.stateTES2clr = `color:${weeklyTestColor}`;
    template.stateINF1clr = `color:${newInfectsColor}`;
    template.stateINF2clr = `color:${weeklyInfectsColor}`;

    template.TESstatement = buildStatement(
      state,
      stateData[37],
      stateData[36],
      "test",
      stateData[32]
    );

    template.INFstatement = buildStatement(
      state,
      stateData[39],
      stateData[38],
      "positive test",
      stateData[28]
    );

    template.DEAstatement = buildStatement(
      state,
      stateData[41],
      stateData[40],
      "death",
      stateData[30]
    );

    template.stateINF0 = addCommas(stateData[3]);

    template.stateINF1cmp = addCommas(stateData[5]);

    template.stateINF2 = addCommas(stateData[5]);
    template.stateINF2cmp = addCommas(stateData[7]);

    template.stateDEA0 = addCommas(stateData[13]);
    template.stateDEA1cmp = addCommas(stateData[15]);

    template.stateDEA2 = addCommas(stateData[15]);
    template.stateDEA2cmp = addCommas(stateData[17]);

    template.stateTES0 = addCommas(stateData[23]);

    template.stateTES1cmp = addCommas(stateData[25]);

    template.stateTES2 = addCommas(stateData[25]);
    template.stateTES2cmp = addCommas(stateData[27]);

    template.INF2statement = buildInfectionsByTestsRatio({
      state,
      rankDaily: stateData[CCI.InfectionsToTests.dailyRank],
      ratioDaily: toIntOrFloatPercent(stateData[CCI.InfectionsToTests.daily]),
      rankWeekly: stateData[CCI.InfectionsToTests.weeklyRank],
      ratioWeekly: toIntOrFloatPercent(stateData[CCI.InfectionsToTests.weekly]),
    });

    accumulated[state] = template.evaluate().getContent();
  }

  const analyticsTag = sandboxed
    ? ""
    : trackEmailOpen(candidate, {
        el: `${state}/${toISOdate(currentDate)}`,
        ev: 1,
        dp: `/email/${state}/${toISOdate(currentDate)}`,
      });

  const placeholder = `<div>track</div>`;
  const message = (cachedStateData || accumulated[state])
    .replace(placeholder, analyticsTag)
    .replace("{{email}}", candidate.email)
    .replace("{{nodata}}", isND ? getStateNoDataPrompt(fullStateName) : "");

  const subject = promptCurrentSubject({
    prefix: subjectPrefix,
    state,
    stateNamesMap: { [state]: fullStateName },
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
