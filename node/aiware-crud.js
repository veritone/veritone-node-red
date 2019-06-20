const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { get } = require('lodash');


async function getWatchlist(api, msg, { schemaId, limit = 0 }, fields) {
    const query = `query { structuredDataObjects(schemaId: "${schemaId}", limit: ${limit}) { records { id data } } }`;
    const { structuredDataObjects: res } = await api.Query(query);
    if (!res || !res.records) { return []; }
    return res.records.map(r => {
        const { id, data } = r;
        const res = { id };
        Object.keys(data).forEach(k => {
            if (fields[k]) {
                res[k] = data[k];
            }
        });
        return res;
    })
}

async function createWatchlist(api, msg, { schemaId }, props) {
    const command = 'createWatchlist';
    const data = renderObj(props, msg);
    const input = { schemaId, data };
    const fields = `id schemaId`;
    const { createWatchlist: res } = await api.Mutate(command, input, fields);
    return res;
}

async function deleteWatchlist(api, msg, { schemaId, recordId }, props) {
    const command = 'deleteWatchlist';
    const id = render(recordId, msg);
    const input = { schemaId, id };
    const fields = `id`;
    const { deleteWatchlist: res } = await api.Mutate(command, input, fields);
    return res;
};

async function updateWatchlist(api, msg, { schemaId, recordId }, props) {
    const command = 'createWatchlist';
    const id = render(recordId, msg);
    const data = renderObj(props, msg);
    const input = { schemaId, id, data };
    const fields = `id data`;
    const { createWatchlist: res } = await api.Mutate(command, input, fields);
    return res;
}

const actionWorkers = {
    watchlist: {
        create: createWatchlist,
        query: getWatchlist,
        delete: deleteWatchlist,
        update: updateWatchlist,
    }
};

function CreateNode(RED, node, config) {
    const { object, action } = config;
    const { params, props } = actionData[action];
    node.on("input", function (msg) {
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
        const { onError, onSuccess } = NewOutput(node, msg);
        const worker = get(actionWorkers, [object, action]);
        if (!worker) {
            node.error(`unknown selected object ${object} action ${action}`);
            return;
        }
        worker(api, msg, params, props).then(onSuccess).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'aiware-crud';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
