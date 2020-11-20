/**
 * @summary builds a Twitter widget
 * @param {(string | number)[]} userStateData
 * @param {string} formattedDate
 * @returns {string}
 */
function LoadTwitter(userStateData, formattedDate) {

    const state = userStateData[2];

    const newTests = addCommas(userStateData[23]);

    const newInfections = addCommas(userStateData[3]);

    const newDeaths = addCommas(userStateData[13]);

    var tweet = `https://twitter.com/intent/tweet?text=`;

    const lines = [
        `${state}'s 24-hour #COVID19 data as of 5:30pm ET${formattedDate}, via covidping.com:`,
        `New tests: ${newTests} (${addSign(topercent(userStateData[26]))} vs. 7day avg)`,
        `New infections: ${newInfections} (${addSign(topercent(userStateData[6]))} vs. 7day avg)`,
        `New deaths: ${newDeaths} (${addSign(topercent(userStateData[16]))} vs. 7day avg)`
    ];

    return tweet + encodeURIComponent(lines.join("\n\n"));
}

/**
 * @summary joins an array of tags into space-separate string of hashed tags
 * 
 * @example
 *  ["tag1", "tag2"] -> "#tag1 #tag2"
 * 
 * @param {string[]} [tags] 
 * @returns {string}
 */
const tagsToHashedString = (tags = []) => tags.map(t => `#${t}`).join(" ");

declare interface TweetCheckOptions {
  date?: Date | number;
  hoursToWait ?: number; 
  logger?: typeof LogAccumulator;
  onError?: (err: Error) => void;
}

/**
 * @summary checks daily tweet
 */
const checkDailyTweet = ({
  logger = new LogAccumulator("TWITTER CHECK"),
  date = Date.now(),
  hoursToWait = 5,
  onError = (err) => console.warn(err),
}: TweetCheckOptions = {}): boolean => {
  try {
    const query = JSONtoQuery(
      {
        q: `from:COVID19Tracking "daily update" since:${toISOdate(date)}`,
        src: "typed_query",
      },
      {
        encodeParams: false,
      }
    );

    const uri = `https://mobile.twitter.com/search?${encodeURI(query)}`;

    console.log(uri);

    const res = UrlFetchApp.fetch(uri, { muteHttpExceptions: true });

    if (!isSuccess(res)) {
      logger.add("failed to fetch twitter");
      logger.dumpAll();
      return false;
    }

    const content = res.getContentText();

    const matcher = /our\s+(?:<\/?.+>)?daily\s+update(?:<\/?.+>)?\s?is\s+published/gim;

    const checker = />(\d+)(h|m)</mi;

    const hasMatched = matcher.test(content);

    if(!hasMatched) {
      return false;
    }

    const [ , hours, units ] = checker.exec(content) || [ , 23, "h" ];

    return (units as string).toLowerCase() === "m" || +hours <= hoursToWait;

  } catch (error) {
    onError(error);
    logger.add(`error during Twitter fetch: ${error}`, "error");
    logger.dumpAll();
    return false;
  }
};

const testDailyTweet = () => console.log(checkDailyTweet());