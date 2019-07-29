const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { Schemas } = require('./aiware-objects-schemas');


const mustache = require("mustache");
const render = (tmpl, obj) => mustache.render(tmpl, obj);
const renderObj = (props = {}, msg) => {
    const res = {};
    Object.keys(props).forEach(k => {
        res[k] = render(props[k], msg);
    });
    return res;
};

const getRecords = ({ records = [] } = {}) => records;

function makeArgHolder(types, params) {
    const args = [];
    const holders = [];
    Object.keys(params).forEach(p => {
        const v = params[p];
        const t = types[p];
        if (t === undefined || v === undefined) {
            return;
        }
        if (t === 'String' || t === 'array') {
            if (v === '') {
                return;
            }
        }
        args.push(`$${p}: ${t}`);
        holders.push(`${p}: $${p}`);
    });
    const holderStr = holders.length ? `(${holders.join(', ')})` : '';
    const argStr = args.length ? `(${args.join(', ')})` : '';
    return { argStr, holderStr };
}

function makePropList(props = []) {
    if (props.length < 1) {
        return 'id';
    }
    return props.join(' ');
}

function filterParams(schema, params) {
    const res = {};
    (schema.params || []).forEach(p => {
        const v = params[p.field];
        if (v === '' || typeof v === 'undefined') {
            if (p.required) {
                const title = p.title || p.field;
                throw new Error(`missing required field ${title}`);
            }
            return;
        }
        res[p.field] = v;
    });
    return res;
}

function filterProps(schema, props) {
    const res = [];
    (schema.props || []).forEach(p => {
        const v = props[p.field];
        if (p.required || v === true) {
            res.push(p.field);
        }
    });
    return res;
}

async function readWatchlist(api, params, props) {
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
            records { ${makePropList(props)} } 
        } 
    }`;
    const variables = params;
    const { watchlists: res } = await api.Query(query, variables);
    return getRecords(res);
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

async function updateWatchlist(api, params) {
    const query = `mutation ($input: UpdateWatchlist!) { 
        updateWatchlist(input: $input) {
            id
        }
    }`;
    const input = params;
    const { updateWatchlist: res } = await api.Query(query, { input });
    return res;
}

async function readCollection(api, params, props) {
    const types = {
        id: 'ID',
        name: 'String',
        mentionId: 'ID',
        offset: 'Int = 0',
        limit: 'Int = 30'
    };
    const { argStr, holderStr } = makeArgHolder(types, params);
    const query = `query ${argStr} { 
        collections ${holderStr} { 
            records { ${makePropList(props)} } 
        } 
    }`;
    const variables = params;
    const { collections: res } = await api.Query(query, variables);
    return getRecords(res);
}

async function createCollection(api, params) {
    const query = `mutation ($input: CreateCollection!) { 
        createCollection(input: $input) {
            id
        }
    }`;
    const input = params;
    const { createCollection: res } = await api.Query(query, { input });
    return res;
}

async function deleteCollection(api, { id }) {
    const query = `mutation ($id: ID!) { 
        deleteCollection(id: $id) {
            id
        }
    }`;
    const { deleteCollection: res } = await api.Query(query, { id });
    return res;
};

async function updateCollection(api, params) {
    const query = `mutation ($input: UpdateCollection!) { 
        updateCollection(input: $input) {
            id
        }
    }`;
    const input = params;
    const { updateCollection: res } = await api.Query(query, { input });
    return res;
}

async function readFolder(api, params, props) {
    const types = {
        id: 'ID!',
    };
    const { argStr, holderStr } = makeArgHolder(types, params);
    const query = `query ${argStr} { 
        folder ${holderStr} { 
            ${makePropList(props)}
        } 
    }`;
    const variables = params;
    const { folder: res } = await api.Query(query, variables);
    const result = { 
        folder: res 
    };
    return result;
}

async function updateFolder(api, params) {
    const query = `mutation ($input: UpdateFolder!) { 
        updateFolder(input: $input) {
            id
            name
        }
    }`;
    const input = params;
    const { updateFolder: res } = await api.Query(query, { input });
    const result = { 
        folder: res 
    };
    return result;
}

const workers = {
    'watchlist.create': createWatchlist,
    'watchlist.update': updateWatchlist,
    'watchlist.delete': deleteWatchlist,
    'watchlist.read': readWatchlist,

    'collection.create': createCollection,
    'collection.update': updateCollection,
    'collection.delete': deleteCollection,
    'collection.read': readCollection,

    'folder.read' : readFolder,
    'folder.update' : updateFolder
};

function CreateNode(RED, node, config) {
    const { object, action, actionData } = config;
    const key = `${object}.${action}`;
    const { params = {}, props } = actionData[key] || {};
    node.on("input", function (msg) {
        const worker = workers[key];
        if (!worker) {
            node.error(`unknown selected object ${object} action ${action}`);
            return;
        }
        const schema = Schemas[key];
        if (!schema) {
            node.error(`unknown schema for selected object ${object} action ${action}`);
            return;
        }
        const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config), msg);
        const { onError, onSuccess } = NewOutput(node, msg);
        const gqlParams = filterParams(schema, renderObj(params, msg.payload));
        const gqlProps = filterProps(schema, props);
        worker(api, gqlParams, gqlProps).then(onSuccess).catch(onError);
    });
}

function registerHttpEndpoints(RED) {
    RED.httpAdmin.get("/veritone/objects/schemas/:id", function (req, res) {
        const { id } = req.params;
        res.json(Schemas[id]);
    });
}

module.exports = function (RED) {
    const NodeName = 'aiware-objects';
    if (RED.settings.httpNodeRoot !== false) {
        registerHttpEndpoints(RED);
    }
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
