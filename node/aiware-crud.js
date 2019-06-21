const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');


function makeArgHolder(types, params) {
    const args = [];
    const holders = [];
    Object.keys(params).forEach(p => {
        const v = params[p];
        const t = types[p];
        if (v === undefined || (t !== 'String' && v === '')) {
            return;
        }
        args.push(`$${p}: ${t}`);
        holders.push(`${p}: $${p}`);
    });
    const holderStr = holders.length ? `(${holders.join(', ')})` : '';
    const argStr = args.length ? `(${args.join(', ')})` : '';
    return { argStr, holderStr };
}

async function readWatchlist(api, params, fields) {
    const types = {
        id: 'ID',
        maxStopDateTime: 'DateTime',
        minStopDateTime: 'DateTime',
        minStartDateTime: 'DateTime',
        maxStartDateTime: 'DateTime',
        name: 'String',
        offset: 'Int = 0',
        limit: 'Int = 30',
        orderBy: 'WatchlistOrderBy = createdDateTime',
        orderDirection: 'OrderDirection = desc',
        isDisabled: 'Boolean',
    };
    const { argStr, holderStr } = makeArgHolder(types, params);
    const query = `query ${argStr} { 
        watchlists ${holderStr} { 
            records { id } 
        } 
    }`;
    const variables = params;
    const { watchlists: res } = await api.Query(query, variables);
    return res;
}

async function createWatchlist(api, params) {
    const query = `mutation ($input: CreateWatchlist!) { 
        createWatchlist(input: $input) {
            id
        }
    }`;
    const input = params;
    const { createWatchlist: res } = await api.Query(query, { input });
    return res;
}

async function deleteWatchlist(api, { id }) {
    const query = `mutation ($id: ID!) { 
        deleteWatchlist(id: $id) {
            id
        }
    }`;
    const { deleteWatchlist: res } = await api.Query(query, { id });
    return res;
};

async function updateWatchlist(api, { schemaId, recordId }) {
    const query = `mutation ($input: UpdateWatchlist!) { 
        updateWatchlist(input: $input) {
            id
        }
    }`;
    const input = params;
    const { updateWatchlist: res } = await api.Query(query, { input });
    return res;
}

const workers = {
    'watchlist.create': createWatchlist,
    'watchlist.update': updateWatchlist,
    'watchlist.delete': deleteWatchlist,
    'watchlist.read': readWatchlist,
};

function CreateNode(RED, node, config) {
    const { object, action, actionData } = config;
    const key = `${object}.${action}`;
    const { params, props } = actionData[key] || {};
    node.on("input", function (msg) {
        const worker = workers[key];
        if (!worker) {
            node.error(`unknown selected object ${object} action ${action}`);
            return;
        }
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
        const { onError, onSuccess } = NewOutput(node, msg);
        worker(api, params, props).then(onSuccess).catch(onError);
    });
}

module.exports = function (RED) {
    const NodeName = 'aiware-crud';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
