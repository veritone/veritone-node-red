const axios = require("axios");

const noop = () => { };

const dumpLength = process.env.GRAPHQL_DUMP_LENGTH || 256;

const DumpResponse = (res) => {
    const str = JSON.stringify(res);
    if (res === undefined) {
        return 'undefined';
    }
    return `[total ${str.length} bytes] ${str.substr(0, dumpLength)}`;
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
        log(`calling url: ${url} --- ${query}`);
        // TODO: set request timeout
        return axios({
            method: "POST", url, data: { query }, headers
        }).then(response => {
            const { status, statusCode, data: { data, errors }, body } = response;
            const res = { status, statusCode, data, body };
            if (status > 200 || errors) {
                log(`error url: ${url} --- ${query} --- response: ${DumpResponse(res)}`);
                throw { response };
            }
            log(`success url: ${url} --- ${query} --- response: ${DumpResponse(res)}`);
            return data;
        }, e => {
            log(`error url: ${url} --- ${query} --- error: ${e}`);
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
            return `{${kv.join(', ')}}`;
        case 'bigint':
        case 'number':
        case 'boolean':
        default:
            return obj;
    }
}

module.exports = { NewVeritoneAPI, Stringify };
