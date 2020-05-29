/**
 * @typedef {({
 *  baseURI : (string | undefined)
 * })} analyticsConfig
 * 
 * 
 * @param {analyticsConfig} config 
 * @returns {string}
 */
const createAnalyticsTag = (config) => {

    try {

        const {
            baseURI
        } = config;

        const tag = `<img src="${baseURI}" />`;

        //should return img tag with analytics data

    }
    catch(error) {
        console.log(error);
        return "";
    }
};