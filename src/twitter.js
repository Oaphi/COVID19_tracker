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

    var tweet = "https://twitter.com/intent/tweet?text=";
    tweet += state + "%27s 24-hour COVID-19 %23%27s as of 5%3A30pm EST" + formattedDate + ", via covidping.com%3A%0A%0A";
    tweet += "New tests%3A " + newTests + " %28" + addSign(topercent(userStateData[26])) + " vs. 7day avg%29%0A%0A";
    tweet += "New infections%3A " + newInfections + " %28" + addSign(topercent(userStateData[6])) + " vs. 7day avg%29%0A%0A";
    tweet += "New deaths%3A " + newDeaths + " %28" + addSign(topercent(userStateData[16])) + " vs. 7day avg%29";

    return tweet;
}