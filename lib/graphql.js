const axios = require("axios");

const noop = () => { };

const DumpResponse = (res) => {
    const str = JSON.stringify(res);
    return `[total ${str.length} bytes] ${str.substr(0, 128)}`;
}

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
        log(`calling url: ${url} --- query: ${query}`);
        return axios({
            method: "POST", url, data: { query }, headers
        }).then(response => {
            const { status, statusCode, data, body } = response;
            if (status > 200 || data.errors) {
                throw response;
            }
            const res = { status, statusCode, data, body };
            log(`success url: ${url} --- query: ${query} --- response: ${DumpResponse(res)}`);
            return res;
        }).catch(e => {
            log(`error url: ${url} --- query: ${query} --- error: ${e}`);
            throw e;
        });
    }

    /**
     * @param {string} command 
     * @param {Object} input 
     * @param {string[]} fields 
     */
    const Mutate = (command, input, fields) => {
        return Query(`mutation {${command}(input: ${Stringify(input)}) {${fields}}}`);
    };

    return { Query, Mutate };
}


function Stringify(obj) {
    switch (typeof obj) {
        case 'string':
            return `"${obj}"`;
        case 'function':
        case 'symbol':
        case 'undefined':
            return undefined;
        case 'object':
            const kv = [];
            Object.keys(obj).forEach((k) => {
                const v = Stringify(obj[k]);
                if (v) { kv.push(`${k}: ${v}`); }
            });
            return `{${kv.join(',')}}`;
        case 'bigint':
        case 'number':
        case 'boolean':
        default:
            return obj;
    }
}

module.exports = { NewVeritoneAPI, Stringify };
