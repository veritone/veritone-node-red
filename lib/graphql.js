const axios = require("axios");
const FormData = require("form-data");

const noop = () => { };

const dumpLength = process.env.GRAPHQL_DUMP_LENGTH || 256;

const DumpJSON = (res) => {
    const str = JSON.stringify(res);
    if (res === undefined) {
        return 'undefined';
    }
    return `[total ${str.length} bytes] ${str.substr(0, dumpLength)}`;
}

const getConfig = (obj) => {
    const { VERITONE_API_BASE_URL, API_TOKEN, GRAPHQL_TIMEOUT } = obj;
    let URL = VERITONE_API_BASE_URL + "/v3/graphql";
    if (!URL.startsWith("http")) {
        URL = "https://" + URL;
    }
    const TIMEOUT = +GRAPHQL_TIMEOUT || 30000;
    return { URL, API_TOKEN, TIMEOUT };
};

const VeritoneGraphqlEnv = getConfig(process.env);

function NewVeritoneAPI(logger, useragent, msg = {}) {
    const { URL, API_TOKEN, TIMEOUT: timeout } = VeritoneGraphqlEnv;
    const {
        orgToken = API_TOKEN, // default to orgToken
        url = URL // default to url
    } = msg;
    const Authorization = `Bearer ${orgToken}`;
    const log = logger || noop;
    /**
     * 
     * @param {string} query 
     * @param {Object} variables 
     * @returns {Promise<any>}
     */
    const Query = (query, variables) => {
        const headers = {
            Authorization,
            'User-Agent': useragent,
            "Content-Type": "application/json"
        };
        log(
            `calling url: ${url} --- ${query} --- ${
            variables ? 'variables ' + JSON.stringify(variables) : ''}`
        );
        // TODO: set request timeout
        return axios({
            method: "POST", url, data: { query, variables }, headers,
            timeout,
        }).then(response => {
            const { status, statusCode, data: { data, errors }, body } = response;
            const res = { status, statusCode, data, body, errors };
            if (status > 200 || Array.isArray(errors)) {
                log(`error url: ${url} --- ${query} --- response: ${DumpJSON(res)}`);
                throw { response };
            }
            log(`success url: ${url} --- ${query} --- response: ${DumpJSON(res)}`);
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
            if (Array.isArray(obj)) {
                const arr = obj.map(Stringify).filter(v => v);
                return `[${arr.join(', ')}]`;
            }
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

function GetUserAgent(config) {
    const instanceId = process.env.NODE_INSTANCE_ID || '';
    const flowId = config.z || '';
    const nodeId = config.id || '';
    const nodeType = (config.type || '').replace('-', '_');
    return `${instanceId}-${flowId}-${nodeId}-${nodeType}`;
}

async function UploadFileToTDO(tdoId, buffer, contentType) {
    const { URL: url, API_TOKEN: token, TIMEOUT: timeout } = VeritoneGraphqlEnv;
    const Authorization = `Bearer ${token}`;
    var formData = new FormData();
    var query = `mutation {
        createAsset(input: {
           containerId: "${tdoId}"
           contentType: "${contentType}"
           assetType: "media"
        }) {
           id
           uri
           signedUri
        }
      }`;
    formData.append('query', query);
    formData.append('file', buffer, {filename: "uploadFile"});
    const headers = {
        Authorization,
        ...formData.getHeaders()
    }
    const res = await axios({
        method: "POST", url, data: formData, headers, timeout
    });
    return res.data.data.createAsset.signedUri;
}

module.exports = { NewVeritoneAPI, Stringify, GetUserAgent, VeritoneGraphqlEnv, UploadFileToTDO };
