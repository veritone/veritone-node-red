const { NewVeritoneAPI } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const mustache = require("mustache");

function CreateNode(RED, node, config) {
    const api = NewVeritoneAPI(RED.log.debug);
    const { schemaId, dataProps, action } = config;
    const makeData = (msg) => {
        const res = {};
        if (!dataProps) { return res; }
        Object.keys(dataProps).forEach(k => {
            res[k] = mustache.render(dataProps[k], msg.payload);
        });
        return res;
    };
    node.on("input", function (msg) {
        const command = 'createStructuredData';
        const data = makeData(msg);
        console.log(data);
        const input = { schemaId, data };
        const fields = `id`;
        const { onError, onResponse } = NewOutput(node, msg);
        api.Mutate(command, input, fields).then(onResponse).catch(onError);
    });
}

function registerHttpEndpoints(RED) {
    const api = NewVeritoneAPI(RED.log.debug);
    const getSchemas = async () => {
        const query = `query y { schemas { records { id, dataRegistry { name } } } }`;
        const { data: { data: { schemas } } } = await api.Query(query);
        const records = schemas ? schemas.records : null;
        if (!records) { return []; }
        return records
            .map(r => ({ id: r.id, name: r.dataRegistry.name }))
            .sort((a, b) => a.name < b.name ? -1 : 1);
    };
    RED.httpAdmin.get("/veritone/schemas", function (req, res, next) {
        getSchemas().then(data => res.json(data)).catch(next);
    });
    const getDefinition = async (schemaId) => {
        const query = `query y { schema(id: "${schemaId}") { definition } }`;
        const { data: { data: { schema } } } = await api.Query(query);
        const { definition: { properties } } = schema;
        const records = Object.keys(properties).map(field => {
            const { type, title, description, examples } = properties[field];
            return { field, type, title };
        });
        return records.sort((a, b) => a.title < b.title ? -1 : 1);
    };
    RED.httpAdmin.get("/veritone/schemas/:id", function (req, res, next) {
        const { id: schemaId } = req.params;
        getDefinition(schemaId).then(data => res.json(data)).catch(next);
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
