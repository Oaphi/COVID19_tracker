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
        `${state}'s 24-hour #COVID19 data as of 5:30pm ET ${formattedDate}, via covidping.com:`,
        `New tests: ${newTests} (${addSign(topercent(userStateData[26]))} vs. 7day avg)`,
        `New infections: ${newInfections} (${addSign(topercent(userStateData[6]))} vs. 7day avg)`,
        `New deaths: ${newDeaths} (${addSign(topercent(userStateData[16]))} vs. 7day avg)`
    ];

    return tweet + encodeURIComponent(lines.join("\n\n"));
}