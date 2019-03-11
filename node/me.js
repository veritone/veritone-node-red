
const { NewVeritoneAPI, GetUserAgent } = require('../lib/graphql');
const { NewOutput } = require('../lib/output');

function CreateNode(RED, node, config) {
    const api = NewVeritoneAPI(RED.log.debug, GetUserAgent(config));
    RED.log.debug("--- Veritone API init ---");
    node.on("input", function (msg) {
        RED.log.debug("--- on(input) ---");
        const query = `{ me {id name roles { name } } }`;
        const { onError, onResponse } = NewOutput(node, msg);
        api.Query(query).then(onResponse).catch(onError);
    });

    node.on("close", function () {
        RED.log.debug("--- closing node VritoneAPI ---");
    });
}

module.exports = function (RED) {
    const NodeName = 'me';
    RED.nodes.registerType(NodeName, function (config) {
        RED.nodes.createNode(this, config);
        CreateNode(RED, this, config);
    });
};
