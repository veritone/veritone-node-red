const axios = require("axios");

const noop = () => { };

function NewVeritoneAPI(logger) {
    const { VERITONE_API_BASE_URL, API_TOKEN } = process.env;
    let url = VERITONE_API_BASE_URL + "/v3/graphql";
    if (!url.startsWith("http")) {
        url = "https://" + url;
    }
    const Authorization = `Bearer ${API_TOKEN}`;
    const log = logger || noop;
    /**
     * 
     * @param {string} query 
     * @returns {Promise<any>}
     */
    const Query = (query) => {
        const headers = {
            Authorization,
            "Content-Type": "application/json"
        };
        log(`calling url: ${url} with query: ${query}`);
        return axios({
            method: "POST", url, data: { query }, headers
        }).then(response => {
            const { status, statusCode, data, body } = response;
            const res = { status, statusCode, data, body };
            console.log(res);
            log(`success url: ${url} with query: ${query} response: ${JSON.stringify(res)}`);
            return res;
        }).catch(e => {
            log(`error url: ${url} with query: ${query} error: ${e}`);
            throw e;
        });
    }
    return { Query };
}

module.exports = { NewVeritoneAPI };
