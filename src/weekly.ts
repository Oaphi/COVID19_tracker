type WeeklyRow = [rank: number, state: string, permm: string, overweek: number];

const naFixup = (maybeNum: string | number) =>
  maybeNum === "+N/A%" ? 1 : maybeNum === "0%" ? 0 : (maybeNum as number);

const getWeeklyRowInfo = (sheet: GoogleAppsScript.Spreadsheet.Sheet) => {
  const stats = getStateStats(sheet);

  const iter: (string | number)[][] = Object.values(stats);

  const {
    Covid19: {
      ColumnIndices: {
        StateName,
        Deaths: { weekly, overWeeks },
      },
    },
  } = getIndices();

  //TODO: change formulas to custom function to avoid +N/A%:

  const fixed = iter.map((row) => {
    row[overWeeks] = naFixup(row[overWeeks]);
    return row;
  });

  const weekData = fixed.map((i) => [i[weekly]]);

  //TODO: move to spreadsheet
  const ranked = rankRange(weekData);

  const newLcol = fixed[0].length;

  const mixed = mixinColumn({
    grid: fixed,
    values: ranked,
    col: newLcol,
  });

  const sorted = mixed.sort((a, b) => {
    const diff = b[weekly] - a[weekly];

    if (!b[weekly] && !a[weekly]) {
      return a[overWeeks] - b[overWeeks];
    }

    return diff;
  });

  return sorted.map((row) => {
    const ow = row[overWeeks];

    const info: WeeklyRow = [last(row), row[StateName], row[weekly], ow];

    return createWeeklyRow(info);
  });
};

const getWeeklyUSInfo = (sheet: GoogleAppsScript.Spreadsheet.Sheet) => {
  const {
    Covid19: {
      ColumnIndices: {
        Deaths: { weekly, overWeeks, weekBefore },
      },
    },
  } = getIndices();

  const [stats] = getUSstats(sheet);

  const ow = stats[overWeeks];
  const before = stats[weekBefore] / 100;
  const now = stats[weekly] / 100;

  console.log({ ow, before, now });

  const us_direction_over_weeks = ow > 0 ? "increase" : "decrease";
  const us_direction_this_week = now > 0 ? "up" : "down";

  const us_acc_rate_over_weeks = toIntOrFloatPercent(ow);
  const us_acc_rate_last_week = toIntOrFloatPercent(before);
  const us_acc_rate_this_week = toIntOrFloatPercent(now);

  return {
    us_direction_over_weeks,
    us_acc_rate_this_week,
    us_acc_rate_last_week,
    us_acc_rate_over_weeks,
    us_direction_this_week,
    usOverWeeks: ow,
  };
};

const getWeeklyStateInfo = (sheet: GoogleAppsScript.Spreadsheet.Sheet) => {
  const stats = getStateStats(sheet);

  const iter: (string | number)[] = Object.values(stats);

  const {
    StateStats: {
      ColumnIndices: { DeathsIncrease },
    },
    Covid19: {
      ColumnIndices: {
        Deaths: { overWeeks, weekBefore },
      },
    },
  } = getIndices();

  // perMillion(false, stats, DeathsIncrease, 7, 13);

  const [thisWeek, acc_last_week] = iter.reduce(
    (acc, stateRow) => {
      const thisWeekdir = stateRow[overWeeks];

      naFixup(thisWeekdir) > 0 && acc[0]++;

      return acc;
    },
    [0, 33]
  );

  console.log({ thisWeek, acc_last_week });

  const acc_this_week = `${pluralizeCountable(
    thisWeek,
    "state"
  )} and ${pluralizeCountable(thisWeek, "territory", false)}`;

  return {
    acc_this_week,
    acc_last_week,
  };
};

const startWeeklySendoutFlow = (sendTo?: string[]) => {
  const logger = new LogAccumulator("weekly sendout");

  const lock = PropertyLockService.getScriptLock();
  const hasLock = lock.tryLock(5e2);
  if (!hasLock) {
    logger.add(`someone else has the lock`);
    logger.dumpAll();
    return false;
  }

  try {
    const unique = sendTo || getUniqueSubscribers();

    logger.add(`Sending to ${unique.length} subscribers`);

    const {
      emails: {
        templates: { weekly },
      },
    } = CONFIG;

    const content = loadContent(`html/templates/${weekly}`);

    const partners = [
      {
        //www is important (no redirect)
        url: "https://www.childrensdefense.org/covidping",
        title: "childrensdefense.org/covidping",
      },
      {
        url: "https://internationalmedicalcorps.org/covidping",
        title: "internationalmedicalcorps.org/covidping",
      },
      //backslash at the end is important (no redirect in .htaccess)
      {
        url: "https://thehotline.org/covidping/",
        title: "thehotline.org/covidping",
      },
    ].map(createTemplateLink);

    const partner_list = getJoinedEntityList(partners);

    const {
      sheets: { covid19 },
    } = CONFIG;

    const sheet = getSheet(covid19);

    const rowInfo = getWeeklyRowInfo(sheet);

    const weekly_rows = rowInfo.join("");

    const covid_project_link = createTemplateLink({
      title: "The COVID Tracking Project",
      url: "https://covidtracking.com/",
    });

    const usVars = getWeeklyUSInfo(sheet);
    const stateVars = getWeeklyStateInfo(sheet);

    const parsed = template({
      content,
      vars: {
        partner_list,
        weekly_rows,
        covid_project_link,
        ...usVars,
        ...stateVars,
      },
      returnMissing: true,
    });

    const settings = getGeneralSettings();

    const {
      emails: {
        amazon: { lambda, rate, senderName, identity },
      },
    } = settings;

    const sender = makeAmazonEmailSender({
      senderName,
      ec2uri: `${lambda}/send`,
      asPrimary: identity === "primary",
      logAccumulator: logger,
      rate,
      chunkSize: 100,
    });

    const { usOverWeeks } = usVars;

    //* 100 here as usOverWeeks is float < 1
    const usChange = `${int(usOverWeeks * 100)}%`;

    const subject = `Reported COVID-19 deaths per capita in the U.S. ${
      usOverWeeks ? "rose" : "fell"
    } by ${usChange} this past week`;

    const proto: Pick<EmailConfig, "subject"> = { subject };

    const emails: EmailConfig[] = unique.map((email) => {
      const message = parsed.replace("{{email}}", email);
      return { ...proto, to: email, message };
    });

    const status = sender(emails);

    const { primary } = getAmazonIdentities(settings);

    const tstamp = gmtToEdt(new Date());

    sender([
      {
        to: primary,
        message: "",
        subject: `Weekly email ${
          status ? "succeeded" : "failed"
        } ${tstamp.toLocaleDateString()}`,
      },
    ]);

    dumpRelease(logger, lock);
    return true;
  } catch (error) {
    logger.add(`failed weekly send: ${error}`, "error");
    dumpRelease(logger, lock);
    return false;
  }
};
