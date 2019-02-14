const { NewVeritoneAPI } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');
const { replay } = require('../lib/pipe');
const mustache = require("mustache");

function CreateNode(RED, node, config) {
    const api = NewVeritoneAPI(RED.log.debug);
    const { schemaId, dataTemplate, action } = config;
    node.on("input", function (msg) {
        const command = 'createStructuredData';
        const dataString = mustache.render(dataTemplate, msg);;
        const data = JSON.parse(dataString);
        const input = { schemaId, data };
        const fields = `id`;
        const { onError, onResponse } = NewOutput(node, msg);
        api.Mutate(command, input, fields).then(onResponse).catch(onError);
    });
}

function registerHttpEndpoints(RED) {
    const api = NewVeritoneAPI(RED.log.debug);
    const getSchema = async () => {
        const query = `query y { schemas { records { id, dataRegistry { name } } } }`;
        const res = await api.Query(query);
        const { records } = res.data.data.schemas;
        if (!records) { return []; }
        return records
            .map(r => ({ id: r.id, name: r.dataRegistry.name }))
            .sort((a, b) => a.name < b.name ? -1 : 1);
    };
    const cachedGetSchema = replay(getSchema);
    RED.httpAdmin.get("/veritone/schemas", function (req, res, next) {
        cachedGetSchema().then(data => res.json(data)).catch(next);
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
