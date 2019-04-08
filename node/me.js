
const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');

async function me(api) {
    const query = `{ me {id name roles { name } } }`;
    const { me: res } = await api.Query(query);
    return res;
}

function CreateNode(RED, node, config) {
    node.on("input", function (msg) {
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
        const { onError, onSuccess } = NewOutput(node, msg);
        me(api).then(onSuccess).catch(onError);
    });
}

function registerHttpEndpoints(RED) {
    let { VERITONE_API_BASE_URL, VERITONE_DEVELOPER_APP_URL } = process.env;
    if (!VERITONE_API_BASE_URL.startsWith("http")) {
        VERITONE_API_BASE_URL = "https://" + VERITONE_API_BASE_URL;
    }
    if (!VERITONE_DEVELOPER_APP_URL) {
        VERITONE_DEVELOPER_APP_URL = VERITONE_API_BASE_URL.replace('api.', 'developer.');
    }
    if (!VERITONE_DEVELOPER_APP_URL.startsWith("http")) {
        VERITONE_DEVELOPER_APP_URL = "https://" + VERITONE_DEVELOPER_APP_URL;
    }
    const env = { VERITONE_API_BASE_URL, VERITONE_DEVELOPER_APP_URL };
    RED.httpAdmin.get('/ready', (req, res) => res.status(200).end('ok'));
    RED.httpAdmin.get("/veritone/env", (req, res) => res.end(JSON.stringify(env)));
}

module.exports = function (RED) {
    const NodeName = 'me';
    if (RED.settings.httpNodeRoot !== false) {
        registerHttpEndpoints(RED);
    }
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
