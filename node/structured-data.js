const { NewVeritoneAPI } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const mustache = require("mustache");

const render = (tmpl, obj) => mustache.render(tmpl, obj);
const renderObj = (props, msg) => {
    const res = {};
    if (!props) { return res; }
    Object.keys(props).forEach(k => {
        res[k] = render(props[k], msg);
    });
    return res;
};

async function getStructuredData(api, msg, { schemaId, limit = 0 }, fields) {
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

async function createStructuredData(api, msg, { schemaId }, props) {
    const command = 'createStructuredData';
    const data = renderObj(props, msg);
    const input = { schemaId, data };
    const fields = `id`;
    const { createStructuredData: res } = await api.Mutate(command, input, fields);
    return res;
}

async function deleteStructuredData(api, msg, { schemaId, recordId }, props) {
    const id = render(recordId, msg);
    const command = 'deleteStructuredData';
    const input = { schemaId, id };
    const fields = `id`;
    const { deleteStructuredData: res } = await api.Mutate(command, input, fields);
    return res;
};

async function getSchemas(api) {
    const query = `query y { schemas { records { id, dataRegistry { name } } } }`;
    const { schemas } = await api.Query(query);
    const records = schemas ? schemas.records : null;
    if (!records) { return []; }
    return records
        .map(r => ({ id: r.id, name: r.dataRegistry.name }))
        .sort((a, b) => a.name < b.name ? -1 : 1);
};

async function getDefinition(api, schemaId) {
    const query = `query y { schema(id: "${schemaId}") { definition } }`;
    const { schema } = await api.Query(query);
    const { definition: { properties } } = schema;
    const records = Object.keys(properties).map(field => {
        const { type, title, description, examples } = properties[field];
        return { field, type, title };
    });
    return records.sort((a, b) => a.title < b.title ? -1 : 1);
};


const actionWorkers = {
    create: createStructuredData,
    query: getStructuredData,
    delete: deleteStructuredData,
};

function CreateNode(RED, node, config) {
    const api = NewVeritoneAPI(RED.log.debug);
    const { action, actionData } = config;
    const { params, props } = actionData[action];
    node.on("input", function (msg) {
        const { onError, onSuccess } = NewOutput(node, msg);
        const worker = actionWorkers[action];
        if (!worker) {
            node.error(`unknown selected action ${action}`);
            return;
        }
        worker(api, msg, params, props).then(onSuccess).catch(onError);
    });
}

function registerHttpEndpoints(RED) {
    const api = NewVeritoneAPI(RED.log.debug);
    RED.httpAdmin.get("/veritone/schemas", function (req, res, next) {
        getSchemas(api).then(data => res.json(data)).catch(next);
    });
    RED.httpAdmin.get("/veritone/schemas/:id", function (req, res, next) {
        const { id: schemaId } = req.params;
        getDefinition(api, schemaId).then(data => res.json(data)).catch(next);
    });
}

module.exports = function (RED) {
    registerHttpEndpoints(RED);
    const NodeName = 'structured-data';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
