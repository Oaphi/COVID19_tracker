/**
 * LoadTwitter(totalUS, userStateData, state)
 * 
 * @summary builds a Twitter widget
 * @param {(string | number)[]} userStateData
 * @param {string} formattedDate
 * @returns {string}
 */
function LoadTwitter(userStateData, formattedDate) {
    
    var tweet = "https://twitter.com/intent/tweet?text=";
    tweet += userStateData[2] + "%27s 24-hour COVID-19 %23%27s as of 5%3A30pm EST" + formattedDate + ", via covidping.com%3A%0A%0A";
    tweet += "New tests%3A " + addCommas(userStateData[23]) + " %28" + addSign(topercent(userStateData[26])) + " vs. 7day avg%29%0A%0A";
    tweet += "New infections%3A " + addCommas(userStateData[3]) + " %28" + addSign(topercent(userStateData[6])) + " vs. 7day avg%29%0A%0A";
    tweet += "New deaths%3A " + addCommas(userStateData[13]) + " %28" + addSign(topercent(userStateData[16])) + " vs. 7day avg%29";

    return tweet;
}